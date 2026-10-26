import prisma from "@/lib/prisma";
import type { AddToCartRequest, CartItemDisplay, CartSummary } from "../types";
import { RentalPricingService } from "@/features/rental/services/pricing.service";
import { daysBetween } from "@/shared/utils/format";

/**
 * Sepet Servisi
 * Hibrit sepet: Hem satış hem kiralama kalemlerini destekler.
 * Medusa'nın sepet mimarisinden esinlenmiştir.
 */
export class CartService {
  /**
   * Sepet getir veya oluştur
   */
  static async getOrCreateCart(userId?: string, sessionId?: string) {
    const where = userId ? { userId } : sessionId ? { sessionId } : null;
    if (!where) throw new Error("userId veya sessionId gereklidir");

    let cart = await prisma.cart.findFirst({
      where,
      include: {
        items: {
          include: { product: { include: { rentalPricing: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: userId ? { userId } : { sessionId },
        include: {
          items: {
            include: { product: { include: { rentalPricing: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    return cart;
  }

  /**
   * Sepete ürün ekle
   */
  static async addItem(cartId: string, request: AddToCartRequest) {
    const { productId, type, quantity = 1, rentalStart, rentalEnd } = request;

    // Kiralama kalemi için tarih aralığı zorunlu
    if (type === "RENTAL") {
      if (!rentalStart || !rentalEnd) {
        throw new Error("Kiralama için başlangıç ve bitiş tarihi gereklidir");
      }
    }

    // Aynı ürün+tip zaten sepette mi? (Satış için birleştir, kiralama için yeni kayıt)
    if (type === "SALE") {
      const existing = await prisma.cartItem.findFirst({
        where: { cartId, productId, type: "SALE" },
      });

      if (existing) {
        return prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        });
      }
    }

    return prisma.cartItem.create({
      data: {
        cartId,
        productId,
        type,
        quantity,
        rentalStart: rentalStart ? new Date(rentalStart) : null,
        rentalEnd: rentalEnd ? new Date(rentalEnd) : null,
      },
    });
  }

  /**
   * Sepet kalemini kaldır
   */
  static async removeItem(itemId: string) {
    return prisma.cartItem.delete({ where: { id: itemId } });
  }

  /**
   * Sepet kaleminin miktarını güncelle
   */
  static async updateItemQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeItem(itemId);
    }
    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  /**
   * Sepet özetini hesapla
   * Satış ve kiralama kalemlerini ayrı ayrı hesaplar.
   */
  static async getSummary(cartId: string): Promise<CartSummary> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: { include: { rentalPricing: true } } },
        },
      },
    });

    if (!cart) throw new Error("Sepet bulunamadı");

    let saleSubtotal = 0;
    let rentalSubtotal = 0;
    let totalDeposit = 0;

    const items: CartItemDisplay[] = cart.items.map((item) => {
      if (item.type === "SALE") {
        const unitPrice = Number(item.product.salePrice ?? 0);
        const totalPrice = unitPrice * item.quantity;
        saleSubtotal += totalPrice;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images[0] ?? "",
          type: item.type,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        };
      } else {
        // RENTAL
        const pricing = item.product.rentalPricing;
        const start = item.rentalStart!;
        const end = item.rentalEnd!;
        const days = daysBetween(start, end);
        const dailyRate = Number(pricing?.dailyPrice ?? 0);
        const deposit = Number(pricing?.depositAmount ?? 0);

        // Basit hesaplama (detaylı hesaplama PricingService'de)
        const rentalPrice = RentalPricingService.calculateSimple(
          days,
          dailyRate,
          pricing?.weeklyPrice ? Number(pricing.weeklyPrice) : undefined,
          pricing?.monthlyPrice ? Number(pricing.monthlyPrice) : undefined
        );

        rentalSubtotal += rentalPrice;
        totalDeposit += deposit;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.images[0] ?? "",
          type: item.type,
          quantity: 1,
          unitPrice: dailyRate,
          totalPrice: rentalPrice,
          rentalStart: start,
          rentalEnd: end,
          rentalDays: days,
          depositAmount: deposit,
        };
      }
    });

    return {
      items,
      saleSubtotal,
      rentalSubtotal,
      totalDeposit,
      grandTotal: saleSubtotal + rentalSubtotal + totalDeposit,
      itemCount: items.length,
    };
  }

  /**
   * Sepeti temizle
   */
  static async clear(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  }
}
