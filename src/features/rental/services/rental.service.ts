import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AvailabilityService } from "./availability.service";
import { RentalPricingService } from "./pricing.service";
import type { RentalDetail } from "../types";

/**
 * Kiralama Servisi
 * Kiralama oluşturma, durum güncelleme ve yönetim işlemleri.
 */
export class RentalService {
  /**
   * Yeni kiralama oluştur
   * Checkout sırasında veya doğrudan rezervasyon için çağrılır.
   * tx parametresi ile mevcut bir Prisma transaction'ı içine dahil olabilir.
   */
  static async create(
    params: {
      userId: string;
      productId: string;
      startDate: Date;
      endDate: Date;
    },
    tx?: Prisma.TransactionClient
  ) {
    const { userId, productId, startDate, endDate } = params;
    const db = tx ?? prisma;

    // 1. Müsaitlik kontrolü
    const availability = await AvailabilityService.check(
      {
        productId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      tx
    );

    if (!availability.available) {
      throw new Error("Ürün seçilen tarih aralığında müsait değil");
    }

    // 2. Fiyatlandırma bilgisini al
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { rentalPricing: true },
    });

    if (!product?.rentalPricing) {
      throw new Error("Ürün kiralama fiyatlandırması bulunamadı");
    }

    const pricing = product.rentalPricing;
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Min/max gün kontrolü
    if (days < pricing.minDays) {
      throw new Error(`Minimum kiralama süresi ${pricing.minDays} gündür`);
    }
    if (days > pricing.maxDays) {
      throw new Error(`Maksimum kiralama süresi ${pricing.maxDays} gündür`);
    }

    // 3. Fiyat hesapla
    const priceCalc = RentalPricingService.calculate(
      days,
      Number(pricing.dailyPrice),
      pricing.weeklyPrice ? Number(pricing.weeklyPrice) : undefined,
      pricing.monthlyPrice ? Number(pricing.monthlyPrice) : undefined,
      Number(pricing.depositAmount)
    );

    // 4. Kiralama ve müsaitlik kilidi oluştur (varsa dış tx içinde, yoksa kendi tx'i ile)
    const executeCreation = async (client: Prisma.TransactionClient | typeof prisma) => {
      const newRental = await client.rental.create({
        data: {
          userId,
          productId,
          startDate,
          endDate,
          dailyRate: pricing.dailyPrice,
          totalPrice: priceCalc.subtotal,
          depositAmount: pricing.depositAmount,
          status: "RESERVED",
        },
      });

      // Tarih aralığını kilitle (blocking record)
      await client.rentalAvailability.create({
        data: {
          productId,
          startDate,
          endDate,
          rentalId: newRental.id,
        },
      });

      return newRental;
    };

    if (tx) {
      return executeCreation(tx);
    } else {
      return prisma.$transaction(async (innerTx) => executeCreation(innerTx));
    }
  }

  /**
   * Kiralama durumunu güncelle
   */
  static async updateStatus(rentalId: string, status: "ACTIVE" | "RETURNED" | "OVERDUE" | "CANCELLED") {
    const rental = await prisma.rental.update({
      where: { id: rentalId },
      data: { status },
    });

    // İptal edilirse kilidi kaldır
    if (status === "CANCELLED") {
      await AvailabilityService.unblock(rentalId);
    }

    return rental;
  }

  /**
   * Kullanıcının kiralama geçmişini getir
   */
  static async getUserRentals(userId: string): Promise<RentalDetail[]> {
    const rentals = await prisma.rental.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    return rentals.map((r) => ({
      id: r.id,
      productName: r.product.name,
      startDate: r.startDate,
      endDate: r.endDate,
      dailyRate: Number(r.dailyRate),
      totalPrice: Number(r.totalPrice),
      depositAmount: Number(r.depositAmount),
      status: r.status,
    }));
  }
}
