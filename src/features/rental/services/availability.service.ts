import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AvailabilityCheckRequest, AvailabilityCheckResult } from "../types";

/**
 * Kiralama Müsaitlik Servisi
 * Louez ve Sharetribe'ın date-range overlap blocking yaklaşımından esinlenmiştir.
 *
 * Mantık: Bir ürün için istenen tarih aralığı ile mevcut RentalAvailability
 * kayıtları arasında çakışma (overlap) kontrolü yapılır.
 * Çakışma formülü: existing.startDate < requested.endDate AND existing.endDate > requested.startDate
 */
export class AvailabilityService {
  /**
   * Belirtilen tarih aralığında ürünün müsait olup olmadığını kontrol et
   */
  static async check(
    request: AvailabilityCheckRequest,
    tx?: Prisma.TransactionClient
  ): Promise<AvailabilityCheckResult> {
    const { productId, startDate: startStr, endDate: endStr } = request;
    const requestedStart = new Date(startStr);
    const requestedEnd = new Date(endStr);
    const db = tx ?? prisma;

    // Tarih validasyonu
    if (requestedStart >= requestedEnd) {
      throw new Error("Başlangıç tarihi bitiş tarihinden önce olmalıdır");
    }

    if (requestedStart < new Date()) {
      throw new Error("Başlangıç tarihi bugünden önce olamaz");
    }

    // Çakışan (overlap) müsaitlik kayıtlarını bul
    const conflicts = await db.rentalAvailability.findMany({
      where: {
        productId,
        startDate: { lt: requestedEnd },
        endDate: { gt: requestedStart },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    return {
      available: conflicts.length === 0,
      productId,
      requestedStart,
      requestedEnd,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  /**
   * Tarih aralığını kilitle (reservation sırasında çağrılır)
   */
  static async block(
    productId: string,
    startDate: Date,
    endDate: Date,
    rentalId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    return db.rentalAvailability.create({
      data: {
        productId,
        startDate,
        endDate,
        rentalId,
      },
    });
  }

  /**
   * Kiralama iptal edildiğinde kilidi kaldır
   */
  static async unblock(rentalId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.rentalAvailability.deleteMany({
      where: { rentalId },
    });
  }

  /**
   * Bir ürün için belirli ay içindeki bloklanmış tarihleri getir
   * (Takvim bileşeni için)
   */
  static async getBlockedDatesForMonth(productId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const blocks = await prisma.rentalAvailability.findMany({
      where: {
        productId,
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
      select: {
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "asc" },
    });

    return blocks;
  }
}
