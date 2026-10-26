"use client";

import { formatCurrency, daysBetween } from "@/shared/utils/format";
import { RentalPricingService } from "../services/pricing.service";

interface RentalPriceSummaryProps {
  dailyPrice: number;
  weeklyPrice?: number;
  monthlyPrice?: number;
  depositAmount: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Kiralama Fiyat Özeti Bileşeni
 * Seçilen tarih aralığına göre detaylı fiyat dökümü gösterir.
 */
export function RentalPriceSummary({
  dailyPrice,
  weeklyPrice,
  monthlyPrice,
  depositAmount,
  startDate,
  endDate,
}: RentalPriceSummaryProps) {
  const totalDays = daysBetween(startDate, endDate);
  const calculation = RentalPricingService.calculate(
    totalDays,
    dailyPrice,
    weeklyPrice,
    monthlyPrice,
    depositAmount
  );

  return (
    <div className="rounded-xl border border-rental-200 bg-rental-50 p-4">
      <h4 className="text-sm font-semibold text-rental-800">Fiyat Dökümü</h4>

      <div className="mt-3 space-y-2">
        {calculation.breakdown.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {item.label} × {item.quantity}
            </span>
            <span className="font-medium text-gray-900">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}

        <div className="border-t border-rental-200 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Ara Toplam</span>
            <span className="font-medium">{formatCurrency(calculation.subtotal)}</span>
          </div>
          {depositAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Depozito (iade edilir)</span>
              <span className="font-medium">{formatCurrency(depositAmount)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-rental-200 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-rental-800">Toplam</span>
            <span className="text-lg font-bold text-rental-700">
              {formatCurrency(calculation.grandTotal)}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {totalDays} gün • {startDate.toLocaleDateString("tr-TR")} →{" "}
            {endDate.toLocaleDateString("tr-TR")}
          </p>
        </div>
      </div>
    </div>
  );
}
