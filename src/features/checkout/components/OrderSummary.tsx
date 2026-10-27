"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/Badge";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import type { CartSummary } from "@/features/cart/types";
import type { CouponValidationResult } from "@/features/coupons/actions/coupon.actions";

interface OrderSummaryProps {
  summary: CartSummary;
  couponResult?: CouponValidationResult | null;
  onApplyCoupon?: (code: string) => Promise<void>;
  onRemoveCoupon?: () => void;
  isApplyingCoupon?: boolean;
  couponError?: string | null;
}

export function OrderSummary({
  summary,
  couponResult,
  onApplyCoupon,
  onRemoveCoupon,
  isApplyingCoupon,
  couponError,
}: OrderSummaryProps) {
  const [localCode, setLocalCode] = useState("");
  const productTotal = summary.saleSubtotal + summary.rentalSubtotal;
  const discountAmount = couponResult?.valid ? couponResult.discountAmount : 0;
  const finalGrandTotal = Math.max(0, summary.grandTotal - discountAmount);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localCode.trim() || !onApplyCoupon) return;
    onApplyCoupon(localCode.trim());
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h3 className="text-lg font-bold text-gray-900">Sipariş &amp; Ödeme Özeti</h3>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          {summary.items.length} Kalem
        </span>
      </div>

      {/* Sepetteki Ürünler Listesi */}
      <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
        {summary.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 transition hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{item.productName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={item.type === "SALE" ? "sale" : "rental"}
                  className="text-[11px]"
                >
                  {item.type === "SALE"
                    ? `${item.quantity} Adet Satın Alma`
                    : `${item.rentalDays} Gün Kiralama`}
                </Badge>
                {item.type === "RENTAL" && (
                  <span className="text-[10px] text-purple-700 font-medium">
                    (Depozito: {formatCurrency(item.depositAmount ?? 0)})
                  </span>
                )}
              </div>
              {item.type === "RENTAL" && item.rentalStart && item.rentalEnd && (
                <p className="mt-1 text-xs text-gray-500">
                  📅 {formatDate(item.rentalStart)} → {formatDate(item.rentalEnd)}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(item.totalPrice)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* İndirim Kuponu Giriş Alanı */}
      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span>🏷️</span> İndirim Kuponu / Promosyon Kodu
          </label>
          {couponResult?.valid && onRemoveCoupon && (
            <button
              type="button"
              onClick={onRemoveCoupon}
              className="text-xs text-red-600 hover:text-red-700 font-medium underline"
            >
              Kaldır
            </button>
          )}
        </div>

        {couponResult?.valid ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
            <span>✅ {couponResult.code} ({couponResult.message || "Uygulandı"})</span>
            <span className="font-bold text-sm">- {formatCurrency(discountAmount)}</span>
          </div>
        ) : (
          <form onSubmit={handleApply} className="flex gap-2">
            <input
              type="text"
              placeholder="Örn: HOSGELDIN, INDIRIM20"
              value={localCode}
              onChange={(e) => setLocalCode(e.target.value.toUpperCase())}
              disabled={isApplyingCoupon}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-mono uppercase tracking-wider focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isApplyingCoupon || !localCode.trim()}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isApplyingCoupon ? "..." : "Uygula"}
            </button>
          </form>
        )}

        {couponError && (
          <p className="mt-2 text-xs font-medium text-red-600">
            ⚠️ {couponError}
          </p>
        )}
      </div>

      {/* Maliyet Kalemleri (Ürün Toplamı, Kiralama Depozito Tutarı, Genel Toplam) */}
      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        {/* 1. Ürün Toplamı */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">Ürün Toplamı</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(productTotal)}
          </span>
        </div>

        {summary.saleSubtotal > 0 && summary.rentalSubtotal > 0 && (
          <div className="pl-3 text-xs text-gray-400 space-y-1 border-l-2 border-gray-200">
            <div className="flex justify-between">
              <span>• Satın alma kalemi</span>
              <span>{formatCurrency(summary.saleSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>• Kiralama kullanım bedeli</span>
              <span>{formatCurrency(summary.rentalSubtotal)}</span>
            </div>
          </div>
        )}

        {/* 2. Kiralama Depozito Tutarı */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 font-medium">Kiralama Depozito Tutarı</span>
            {summary.totalDeposit > 0 && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                🔒 Provizyon / Blokaj
              </span>
            )}
          </div>
          <span className="font-semibold text-amber-800">
            {formatCurrency(summary.totalDeposit)}
          </span>
        </div>

        {/* Kupon İndirimi */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600 font-semibold">
            <span>Kupon İndirimi ({couponResult?.code})</span>
            <span>- {formatCurrency(discountAmount)}</span>
          </div>
        )}

        {/* 3. Genel Toplam */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <div>
            <span className="text-base font-bold text-gray-900">Genel Toplam</span>
            <p className="text-[11px] text-gray-400">Tahsilat + Provizyon Blokajı</p>
          </div>
          <div className="text-right">
            {discountAmount > 0 && (
              <span className="block text-xs line-through text-gray-400 font-medium">
                {formatCurrency(summary.grandTotal)}
              </span>
            )}
            <span className="text-xl font-extrabold text-blue-600">
              {formatCurrency(finalGrandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Escrow Depozito Güvence Bilgilendirme Kartı */}
      {summary.totalDeposit > 0 && (
        <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-900">
          <div className="flex items-start gap-2">
            <span className="text-sm">🛡️</span>
            <div>
              <p className="font-bold">Iyzico / Stripe Escrow Depozito Koruması</p>
              <p className="mt-0.5 text-[11px] text-purple-700 leading-relaxed">
                Kiralık ürünler için alınan <strong>{formatCurrency(summary.totalDeposit)}</strong> tutarındaki depozito kartınızda geçici olarak bloke edilir. Kiralama bitiminde ürün iadesi onaylandığında blokaj otomatik olarak kartınıza serbest bırakılır.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
