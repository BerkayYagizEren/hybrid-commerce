import prisma from "@/lib/prisma";
import { RentalService } from "@/features/rental/services/rental.service";
import { CartService } from "@/features/cart/services/cart.service";
import { WarehouseService } from "@/features/warehouse/services/warehouse.service";
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
    const { userId, cartId, paymentCard, paymentMethod } = request;

    try {
      // 1. Sepet özetini al
      const summary = await CartService.getSummary(cartId);

      if (summary.items.length === 0) {
        return { success: false, error: "Sepetinizde ürün bulunmamaktadır." };
      }

      // ── B2B Bayi Finansal & İskonto Kontrolü ──
      const dealer = await prisma.dealerFinancial.findUnique({
        where: { userId },
      });

      const b2bDiscountRate = dealer ? Number(dealer.discountRate || 0) : 0;
      const b2bDiscountAmount = b2bDiscountRate > 0
        ? Math.round(((summary.saleSubtotal * b2bDiscountRate) / 100) * 100) / 100
        : 0;

      // ── Kupon İndirimi Kontrolü ──
      let couponDiscountAmount = 0;
      if (request.couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: request.couponCode.toUpperCase().trim() },
        });
        if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() <= coupon.expiresAt)) {
          const minBasket = Number(coupon.minBasketAmount || 0);
          if (summary.grandTotal >= minBasket) {
            const val = Number(coupon.discountValue);
            couponDiscountAmount = coupon.discountType === "PERCENTAGE"
              ? Math.round(((summary.saleSubtotal * val) / 100) * 100) / 100
              : Math.min(summary.saleSubtotal, val);
          }
        }
      }

      const totalDiscounts = b2bDiscountAmount + couponDiscountAmount;
      const effectiveProductTotal = Math.max(0, summary.saleSubtotal - totalDiscounts) + summary.rentalSubtotal;
      const effectiveGrandTotal = Math.max(0, summary.grandTotal - totalDiscounts);

      if (dealer) {
        const creditLimit = Number(dealer.creditLimit || 0);
        const currentBalance = Number(dealer.currentBalance || 0);
        if (currentBalance + effectiveGrandTotal > creditLimit) {
          throw new Error(
            `Kredi Limiti Yetersiz: Sipariş tutarı (${effectiveGrandTotal.toFixed(2)} TL), mevcut kredi limitinizi (${(creditLimit - currentBalance).toFixed(2)} TL kullanılabilir) aşmaktadır.`
          );
        }
      }

      const productTotal = effectiveProductTotal;
      const depositTotal = summary.totalDeposit;
      const rentalIds: string[] = [];

      // 3. Veritabanında Sipariş ve Kalemlerini Oluştur (PENDING)
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            userId,
            totalAmount: effectiveGrandTotal,
            status: "PENDING",
          },
        });

        // Eğer B2B bayisi ise cari hesaba borçlandır (Bakiyeyi artır)
        if (dealer) {
          await tx.dealerFinancial.update({
            where: { userId },
            data: { currentBalance: { increment: effectiveGrandTotal } },
          });
        }

        for (const item of summary.items) {
          if (item.type === "SALE") {
            const itemDiscount = b2bDiscountRate > 0 ? (item.unitPrice * b2bDiscountRate) / 100 : 0;
            const effectiveUnitPrice = Math.max(0, item.unitPrice - itemDiscount);
            const effectiveTotalPrice = effectiveUnitPrice * item.quantity;

            // ── Satış Kalemi Snapshot ──
            await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                type: "SALE",
                quantity: item.quantity,
                unitPrice: effectiveUnitPrice,
                totalPrice: effectiveTotalPrice,
                productName: item.productName,
                productImage: item.productImage,
                priceAtPurchase: effectiveUnitPrice,
              },
            });

            // Satış stoğunu rezerve et
            await tx.inventory.update({
              where: { productId: item.productId },
              data: {
                reservedStock: { increment: item.quantity },
              },
            });

            // Çoklu Depo Stok Kontrolü ve Düşümü
            const defaultWh = await WarehouseService.getOrCreateDefaultWarehouse(tx);
            const stockRecord = await tx.stock.findUnique({
              where: {
                productId_warehouseId: { productId: item.productId, warehouseId: defaultWh.id },
              },
            });

            if (stockRecord) {
              if (stockRecord.quantity < item.quantity) {
                throw new Error(
                  `Stok Yetersiz: "${item.productName}" için depoda yeterli stok bulunmuyor (Mevcut: ${stockRecord.quantity}, İstenen: ${item.quantity}).`
                );
              }
              await tx.stock.update({
                where: { id: stockRecord.id },
                data: { quantity: { decrement: item.quantity } },
              });
            }
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

      // 4. Ödeme İşlemi
      // B2B Kredisi (Cari Hesap) ile ödeme veya Kredi Kartı
      if (paymentMethod === "B2B_CREDIT" || (dealer && !paymentCard)) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        });

        const payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: effectiveGrandTotal,
            currency: "TRY",
            status: "SUCCEEDED",
            cardLast4: "B2B",
            cardBrand: "B2B_CREDIT",
          },
        });

        await CartService.clear(cartId);

        return {
          success: true,
          orderId: order.id,
          totalAmount: effectiveGrandTotal,
          productTotal,
          depositTotal,
          paymentId: payment.id,
          cardBrand: "B2B_CREDIT",
        };
      }

      // Satış için Direct Charge, Kiralama Depozitosu için Hold / Pre-auth
      const paymentResult = await PaymentGatewayService.processPayment({
        orderId: order.id,
        userId,
        grandTotal: effectiveGrandTotal,
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

          if (dealer) {
            await prisma.dealerFinancial.update({
              where: { userId },
              data: { currentBalance: { decrement: effectiveGrandTotal } },
            });
          }

          // Başarısız ödeme kaydı oluştur
          const rawNum = paymentCard?.cardNumber?.replace(/\s/g, "") || "";
          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: effectiveGrandTotal,
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
