import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface DealerFinancialInfo {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  discountRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export class B2BService {
  /**
   * Bayi finansal kaydını getir
   */
  static async getDealerFinancial(userId: string) {
    const record = await prisma.dealerFinancial.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!record) return null;

    const creditLimit = Number(record.creditLimit);
    const currentBalance = Number(record.currentBalance);
    const discountRate = Number(record.discountRate);

    return {
      id: record.id,
      userId: record.userId,
      userEmail: record.user.email,
      userName: record.user.name,
      creditLimit,
      currentBalance,
      availableCredit: Math.max(0, creditLimit - currentBalance),
      discountRate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Bayi finansal kaydını oluştur veya güncelle
   */
  static async upsertDealerFinancial(
    userId: string,
    data: {
      creditLimit?: number;
      currentBalance?: number;
      discountRate?: number;
    }
  ) {
    const record = await prisma.dealerFinancial.upsert({
      where: { userId },
      create: {
        userId,
        creditLimit: data.creditLimit !== undefined ? data.creditLimit : 0,
        currentBalance: data.currentBalance !== undefined ? data.currentBalance : 0,
        discountRate: data.discountRate !== undefined ? data.discountRate : 0,
      },
      update: {
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.currentBalance !== undefined && { currentBalance: data.currentBalance }),
        ...(data.discountRate !== undefined && { discountRate: data.discountRate }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: record.id,
      userId: record.userId,
      creditLimit: Number(record.creditLimit),
      currentBalance: Number(record.currentBalance),
      discountRate: Number(record.discountRate),
    };
  }

  /**
   * Tüm bayilerin finansal durumlarını listele
   */
  static async listDealers(): Promise<DealerFinancialInfo[]> {
    const records = await prisma.dealerFinancial.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return records.map((r) => {
      const creditLimit = Number(r.creditLimit);
      const currentBalance = Number(r.currentBalance);
      return {
        id: r.id,
        userId: r.userId,
        userEmail: r.user.email,
        userName: r.user.name,
        creditLimit,
        currentBalance,
        availableCredit: Math.max(0, creditLimit - currentBalance),
        discountRate: Number(r.discountRate),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }

  /**
   * Bayiye özel iskonto hesaplama
   */
  static async calculateB2BDiscount(userId: string, basePrice: number) {
    const dealer = await prisma.dealerFinancial.findUnique({
      where: { userId },
    });

    if (!dealer || Number(dealer.discountRate) <= 0) {
      return {
        hasDiscount: false,
        discountRate: 0,
        discountAmount: 0,
        discountedPrice: basePrice,
      };
    }

    const discountRate = Number(dealer.discountRate);
    const discountAmount = Math.round(((basePrice * discountRate) / 100) * 100) / 100;
    const discountedPrice = Math.max(0, basePrice - discountAmount);

    return {
      hasDiscount: true,
      discountRate,
      discountAmount,
      discountedPrice,
    };
  }

  /**
   * Kredi limiti ve bakiye kontrolü
   * currentBalance + orderTotal <= creditLimit
   */
  static async checkCreditLimit(userId: string, orderTotal: number) {
    const dealer = await prisma.dealerFinancial.findUnique({
      where: { userId },
    });

    if (!dealer) {
      return {
        isB2B: false,
        allowed: true,
        remainingCredit: Infinity,
      };
    }

    const creditLimit = Number(dealer.creditLimit);
    const currentBalance = Number(dealer.currentBalance);
    const remainingCredit = creditLimit - currentBalance;
    const newBalance = currentBalance + orderTotal;

    if (newBalance > creditLimit) {
      return {
        isB2B: true,
        allowed: false,
        creditLimit,
        currentBalance,
        remainingCredit,
        orderTotal,
        error: `Kredi Limiti Yetersiz: Sipariş tutarı (${orderTotal.toFixed(2)} TL), kullanılabilir kredi limitinizi (${remainingCredit.toFixed(2)} TL) aşmaktadır.`,
      };
    }

    return {
      isB2B: true,
      allowed: true,
      creditLimit,
      currentBalance,
      remainingCredit,
      orderTotal,
    };
  }

  /**
   * B2B Kredisinden harcama yap (Bakiyeyi artır)
   */
  static async chargeCredit(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;

    const dealer = await db.dealerFinancial.findUnique({
      where: { userId },
    });

    if (!dealer) {
      throw new Error("B2B bayi finansal kaydı bulunamadı.");
    }

    const creditLimit = Number(dealer.creditLimit);
    const currentBalance = Number(dealer.currentBalance);
    const newBalance = currentBalance + amount;

    if (newBalance > creditLimit) {
      throw new Error(
        `Kredi Limiti Yetersiz: Sipariş tutarı (${amount.toFixed(2)} TL), mevcut kredi limitinizi (${(creditLimit - currentBalance).toFixed(2)} TL kalan) aşmaktadır.`
      );
    }

    const updated = await db.dealerFinancial.update({
      where: { userId },
      data: {
        currentBalance: { increment: amount },
      },
    });

    return {
      creditLimit: Number(updated.creditLimit),
      currentBalance: Number(updated.currentBalance),
      availableCredit: Number(updated.creditLimit) - Number(updated.currentBalance),
    };
  }

  /**
   * B2B Kredisine iade yap (Bakiyeyi düşür)
   */
  static async refundCredit(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    return await db.dealerFinancial.update({
      where: { userId },
      data: {
        currentBalance: { decrement: amount },
      },
    });
  }
}
