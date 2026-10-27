import prisma from "@/lib/prisma";
import type { Prisma, ReservationStatus } from "@prisma/client";
import type { AvailabilityCheckRequest, AvailabilityCheckResult } from "../types";

/**
 * Kiralama Müsaitlik ve Rezervasyon Çakışma Servisi (Rental Conflict Engine)
 * Louez ve Sharetribe'ın date-range overlap blocking yaklaşımından esinlenmiştir.
 *
 * Çakışma formülü:
 * existing.startDate < requested.endDate AND existing.endDate > requested.startDate
 * ve status in ["CONFIRMED", "PENDING"]
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (requestedStart < todayStart) {
      throw new Error("Başlangıç tarihi bugünden önce olamaz");
    }

    // 1. RentalReservation çakışmaları (CONFIRMED ve PENDING durumundaki aktif rezervasyonlar)
    const reservationConflicts = await db.rentalReservation.findMany({
      where: {
        productId,
        status: { in: ["CONFIRMED", "PENDING"] },
        startDate: { lt: requestedEnd },
        endDate: { gt: requestedStart },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    // 2. RentalAvailability çakışmaları
    const availabilityConflicts = await db.rentalAvailability.findMany({
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

    const allConflicts = [
      ...reservationConflicts.map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
      })),
      ...availabilityConflicts.map((a) => ({
        startDate: a.startDate,
        endDate: a.endDate,
      })),
    ];

    return {
      available: allConflicts.length === 0,
      productId,
      requestedStart,
      requestedEnd,
      conflicts: allConflicts.length > 0 ? allConflicts : undefined,
    };
  }

  /**
   * Rezervasyon oluştur (RentalReservation)
   */
  static async createReservation(
    params: {
      productId: string;
      startDate: Date;
      endDate: Date;
      userId?: string;
      rentalId?: string;
      status?: ReservationStatus;
    },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    const {
      productId,
      startDate,
      endDate,
      userId,
      rentalId,
      status = "CONFIRMED",
    } = params;

    // Çakışma kontrolü
    const checkResult = await this.check(
      {
        productId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      tx
    );

    if (!checkResult.available) {
      throw new Error(
        "Kiralama Çakışması: Seçilen tarih aralığında ürün daha önce rezerve edilmiştir."
      );
    }

    const reservation = await db.rentalReservation.create({
      data: {
        productId,
        startDate,
        endDate,
        userId,
        rentalId,
        status,
      },
    });

    // rentalAvailability tablosunu da senkronize tut
    await db.rentalAvailability.create({
      data: {
        productId,
        startDate,
        endDate,
        rentalId,
      },
    });

    return reservation;
  }

  /**
   * Rezervasyonu Onayla (CONFIRMED)
   */
  static async confirmReservation(
    reservationId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    return db.rentalReservation.update({
      where: { id: reservationId },
      data: { status: "CONFIRMED" },
    });
  }

  /**
   * Rezervasyonu İptal Et (CANCELLED)
   */
  static async cancelReservation(
    reservationId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    const res = await db.rentalReservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED" },
    });

    if (res.rentalId) {
      await db.rentalAvailability.deleteMany({
        where: { rentalId: res.rentalId },
      });
    } else {
      await db.rentalAvailability.deleteMany({
        where: {
          productId: res.productId,
          startDate: res.startDate,
          endDate: res.endDate,
        },
      });
    }

    return res;
  }

  /**
   * Tarih aralığını kilitle (RentalAvailability)
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
    await db.rentalReservation.updateMany({
      where: { rentalId },
      data: { status: "CANCELLED" },
    });
    return db.rentalAvailability.deleteMany({
      where: { rentalId },
    });
  }

  /**
   * Bir ürün için belirli ay içindeki bloklanmış tarihleri getir (Takvim bileşeni için)
   */
  static async getBlockedDatesForMonth(
    productId: string,
    year: number,
    month: number
  ) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [availBlocks, resBlocks] = await Promise.all([
      prisma.rentalAvailability.findMany({
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
      }),
      prisma.rentalReservation.findMany({
        where: {
          productId,
          status: { in: ["CONFIRMED", "PENDING"] },
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        select: {
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "asc" },
      }),
    ]);

    return [...availBlocks, ...resBlocks];
  }
}
