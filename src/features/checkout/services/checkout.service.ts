import prisma from "@/lib/prisma";
import { RentalService } from "@/features/rental/services/rental.service";
import { CartService } from "@/features/cart/services/cart.service";
import {
  PaymentGatewayService,
  validateCreditCard,
} from "@/features/payment/services/payment-gateway.service";
import type { CheckoutRequest, CheckoutResult } from "../types";

/**
 * Checkout Servisi
 * Hibrit sipariş oluşturma: Satış + Kiralama kalemlerini
 * tek bir sipariş altında birleştirir ve Stripe / Iyzico Sandbox
 * ödeme ve escrow depozito blokaj işlemlerini yürütür.
 */
export class CheckoutService {
  /**
   * Checkout işlemini gerçekleştir
   */
  static async process(request: CheckoutRequest): Promise<CheckoutResult> {
    const { userId, cartId, paymentCard } = request;

    try {
      // 1. Sepet özetini al
      const summary = await CartService.getSummary(cartId);

      if (summary.items.length === 0) {
        return { success: false, error: "Sepetinizde ürün bulunmamaktadır." };
      }

      const productTotal = summary.saleSubtotal + summary.rentalSubtotal;
      const depositTotal = summary.totalDeposit;
      const rentalIds: string[] = [];

      // 3. Veritabanında Sipariş ve Kalemlerini Oluştur (PENDING)
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            userId,
            totalAmount: summary.grandTotal,
            status: "PENDING",
          },
        });

        for (const item of summary.items) {
          if (item.type === "SALE") {
            // ── Satış Kalemi Snapshot ──
            await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                type: "SALE",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                productName: item.productName,
                productImage: item.productImage,
                priceAtPurchase: item.unitPrice,
              },
            });

            // Satış stoğunu rezerve et
            await tx.inventory.update({
              where: { productId: item.productId },
              data: {
                reservedStock: { increment: item.quantity },
              },
            });
          } else {
            // ── Kiralama Kalemi Snapshot & Availability Lock ──
            const rental = await RentalService.create(
              {
                userId,
                productId: item.productId,
                startDate: item.rentalStart!,
                endDate: item.rentalEnd!,
              },
              tx
            );

            rentalIds.push(rental.id);

            await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                type: "RENTAL",
                quantity: 1,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice + (item.depositAmount ?? 0),
                rentalId: rental.id,
                productName: item.productName,
                productImage: item.productImage,
                priceAtPurchase: item.unitPrice,
              },
            });
          }
        }

        return newOrder;
      });

      // 4. Ödeme Sağlayıcıyı Tetikle (Stripe / Iyzico Sandbox)
      // Satış için Direct Charge, Kiralama Depozitosu için Hold / Pre-auth
      const paymentResult = await PaymentGatewayService.processPayment({
        orderId: order.id,
        userId,
        grandTotal: summary.grandTotal,
        productTotal,
        depositTotal,
        rentalIds,
        card: paymentCard ?? {
          cardHolder: "Demo Müşteri",
          cardNumber: "4242424242424242",
          expireMonth: "12",
          expireYear: "2028",
          cvc: "123",
        },
        provider: "STRIPE",
      });

      if (!paymentResult.success) {
        // Ödeme başarısız: Siparişi FAILED durumuna getir ve rezerve edilen stokları serbest bırak
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "FAILED" },
          });

          // Başarısız ödeme kaydı oluştur
          const rawNum = paymentCard?.cardNumber?.replace(/\s/g, "") || "";
          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: summary.grandTotal,
              currency: "TRY",
              status: "FAILED",
              errorMessage: paymentResult.error,
              cardLast4: rawNum.length >= 4 ? rawNum.slice(-4) : "0000",
              cardBrand: rawNum.startsWith("4") ? "Visa" : rawNum.startsWith("5") ? "Mastercard" : "Bilinmeyen",
            },
          });

          for (const item of summary.items) {
            if (item.type === "SALE") {
              await prisma.inventory.update({
                where: { productId: item.productId },
                data: { reservedStock: { decrement: item.quantity } },
              });
            }
          }
          for (const rId of rentalIds) {
            await prisma.rentalAvailability.deleteMany({ where: { rentalId: rId } });
            await prisma.rental.update({
              where: { id: rId },
              data: { status: "CANCELLED" },
            });
          }
        } catch (cleanupErr) {
          console.error("Cleanup error on failed payment:", cleanupErr);
        }

        return {
          success: false,
          orderId: order.id,
          error:
            paymentResult.error ||
            "Ödeme işlemi bankanız tarafından onaylanamadı. Lütfen bilgilerinizi kontrol ediniz.",
        };
      }

      // 5. Başarılı Ödeme Sonrası Sepeti Temizle
      await CartService.clear(cartId);

      return {
        success: true,
        orderId: order.id,
        totalAmount: Number(order.totalAmount),
        productTotal,
        depositTotal,
        paymentId: paymentResult.paymentId,
        transactionId: paymentResult.transactionId,
        depositHoldId: paymentResult.depositHoldId,
        cardLast4: paymentResult.cardLast4,
        cardBrand: paymentResult.cardBrand,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata oluştu";
      return { success: false, error: message };
    }
  }
}
