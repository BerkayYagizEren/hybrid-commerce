"use server";

import prisma from "@/lib/prisma";
import { DiscountType } from "@prisma/client";

export interface CreateCouponInput {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minBasketAmount?: number;
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountType?: "PERCENTAGE" | "FIXED";
  discountValue?: number;
  discountAmount: number;
  finalAmount: number;
  message?: string;
  error?: string;
}

/**
 * Kupon doğrula ve indirim tutarını hesapla
 */
export async function validateCouponAction(
  rawCode: string,
  basketAmount: number
): Promise<CouponValidationResult> {
  try {
    if (!rawCode || !rawCode.trim()) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: basketAmount,
        error: "Lütfen bir kupon kodu giriniz.",
      };
    }

    const code = rawCode.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: basketAmount,
        error: `"${code}" kodlu kupon bulunamadı.`,
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: basketAmount,
        error: "Bu kupon şu anda aktif değil.",
      };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: basketAmount,
        error: "Bu kuponun kullanım süresi dolmuştur.",
      };
    }

    const minBasket = Number(coupon.minBasketAmount || 0);
    if (basketAmount < minBasket) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: basketAmount,
        error: `Bu kuponu kullanabilmek için sepet tutarınız en az ₺${minBasket.toLocaleString("tr-TR")} olmalıdır.`,
      };
    }

    let discount = 0;
    const value = Number(coupon.discountValue);

    if (coupon.discountType === "PERCENTAGE") {
      discount = (basketAmount * value) / 100;
    } else {
      discount = value;
    }

    // İndirim sepet tutarını geçemez
    discount = Math.min(discount, basketAmount);
    discount = Math.round(discount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((basketAmount - discount) * 100) / 100);

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: value,
      discountAmount: discount,
      finalAmount,
      message: `🎉 "${coupon.code}" kuponu başarıyla uygulandı! (₺${discount.toLocaleString("tr-TR")} İndirim)`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kupon doğrulanamadı.";
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: basketAmount,
      error: msg,
    };
  }
}

/**
 * Kupon oluştur
 */
export async function createCouponAction(data: CreateCouponInput) {
  try {
    const code = data.code.trim().toUpperCase();
    if (!code) return { success: false, error: "Kupon kodu zorunludur." };

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return { success: false, error: `"${code}" kupon kodu zaten mevcut.` };
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType: data.discountType as DiscountType,
        discountValue: data.discountValue,
        minBasketAmount: data.minBasketAmount || 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return { success: true, coupon };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kupon oluşturulamadı.";
    return { success: false, error: msg };
  }
}

/**
 * Kuponları listele
 */
export async function listCouponsAction() {
  try {
    return await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

/**
 * Kupon sil
 */
export async function deleteCouponAction(id: string) {
  try {
    await prisma.coupon.delete({ where: { id } });
    return { success: true };
  } catch {
    return { success: false, error: "Silinemedi." };
  }
}
