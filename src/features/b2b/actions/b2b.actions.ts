"use server";

import { B2BService } from "../services/b2b.service";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDealerFinancialAction(userId: string) {
  try {
    const data = await B2BService.getDealerFinancial(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bayi finansal bilgisi alınamadı",
    };
  }
}

export async function upsertDealerFinancialAction(
  userId: string,
  data: { creditLimit?: number; currentBalance?: number; discountRate?: number }
) {
  try {
    const result = await B2BService.upsertDealerFinancial(userId, data);
    revalidatePath("/admin/dealers");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bayi finansal kaydı güncellenemedi",
    };
  }
}

export async function listDealersAction() {
  try {
    const dealers = await B2BService.listDealers();
    return { success: true, data: dealers };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bayi listesi alınamadı",
    };
  }
}

export async function updateDealerBalanceAction(
  userId: string,
  amount: number,
  operation: "ADD" | "SUBTRACT" | "SET"
) {
  try {
    const existing = await prisma.dealerFinancial.findUnique({ where: { userId } });
    if (!existing) {
      throw new Error("Bayi kaydı bulunamadı");
    }

    let newBalance = Number(existing.currentBalance);
    if (operation === "ADD") newBalance += amount;
    else if (operation === "SUBTRACT") newBalance = Math.max(0, newBalance - amount);
    else if (operation === "SET") newBalance = amount;

    const updated = await prisma.dealerFinancial.update({
      where: { userId },
      data: { currentBalance: newBalance },
    });

    revalidatePath("/admin/dealers");
    return {
      success: true,
      data: {
        userId: updated.userId,
        currentBalance: Number(updated.currentBalance),
        creditLimit: Number(updated.creditLimit),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bakiye güncellenemedi",
    };
  }
}

export async function checkCreditLimitAction(userId: string, orderTotal: number) {
  try {
    const check = await B2BService.checkCreditLimit(userId, orderTotal);
    return { success: true, check };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Limit kontrolü yapılamadı",
    };
  }
}

export async function getEligibleUsersForDealerAction() {
  try {
    const existing = await prisma.dealerFinancial.findMany({
      select: { userId: true },
    });
    const existingIds = existing.map((d) => d.userId);

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: existingIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { email: "asc" },
    });

    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Kullanıcı listesi alınamadı",
    };
  }
}
