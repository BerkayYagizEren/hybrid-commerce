import type { RentalPriceCalculation, PriceBreakdownItem } from "../types";

/**
 * Kiralama Fiyatlandırma Servisi
 * Louez'in esnek fiyatlandırma modelinden esinlenmiştir.
 *
 * Strateji:
 * - 1-6 gün → günlük fiyat
 * - 7-27 gün → haftalık fiyat + kalan günler günlük
 * - 28+ gün → aylık fiyat + kalan hafta/günler
 */
export class RentalPricingService {
  /**
   * Detaylı fiyat hesaplama (breakdown ile)
   */
  static calculate(
    totalDays: number,
    dailyPrice: number,
    weeklyPrice?: number,
    monthlyPrice?: number,
    depositAmount: number = 0
  ): RentalPriceCalculation {
    const breakdown: PriceBreakdownItem[] = [];
    let subtotal = 0;
    let remainingDays = totalDays;

    // Aylık tarife uygulama (28+ gün)
    if (monthlyPrice && remainingDays >= 28) {
      const months = Math.floor(remainingDays / 28);
      const monthTotal = months * monthlyPrice;
      subtotal += monthTotal;
      remainingDays -= months * 28;
      breakdown.push({
        label: "Aylık tarife",
        quantity: months,
        unitPrice: monthlyPrice,
        total: monthTotal,
      });
    }

    // Haftalık tarife uygulama (7+ kalan gün)
    if (weeklyPrice && remainingDays >= 7) {
      const weeks = Math.floor(remainingDays / 7);
      const weekTotal = weeks * weeklyPrice;
      subtotal += weekTotal;
      remainingDays -= weeks * 7;
      breakdown.push({
        label: "Haftalık tarife",
        quantity: weeks,
        unitPrice: weeklyPrice,
        total: weekTotal,
      });
    }

    // Kalan günler → günlük tarife
    if (remainingDays > 0) {
      const dayTotal = remainingDays * dailyPrice;
      subtotal += dayTotal;
      breakdown.push({
        label: "Günlük tarife",
        quantity: remainingDays,
        unitPrice: dailyPrice,
        total: dayTotal,
      });
    }

    return {
      dailyRate: dailyPrice,
      totalDays,
      subtotal,
      depositAmount,
      grandTotal: subtotal + depositAmount,
      breakdown,
    };
  }

  /**
   * Basit fiyat hesaplama (sepet özeti için)
   */
  static calculateSimple(
    totalDays: number,
    dailyPrice: number,
    weeklyPrice?: number,
    monthlyPrice?: number
  ): number {
    const result = this.calculate(totalDays, dailyPrice, weeklyPrice, monthlyPrice, 0);
    return result.subtotal;
  }
}
