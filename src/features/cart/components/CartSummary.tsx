"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { formatCurrency } from "@/shared/utils/format";
import type { CartSummary as CartSummaryType } from "../types";
import { validateCouponAction, type CouponValidationResult } from "@/features/coupons/actions/coupon.actions";
import Link from "next/link";

interface CartSummaryProps {
  summary: CartSummaryType;
}

export function CartSummaryComponent({ summary }: CartSummaryProps) {
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplying(true);
    setErrorMsg(null);
    try {
      const res = await validateCouponAction(couponCode, summary.grandTotal);
      if (res.valid) {
        setCouponResult(res);
        setErrorMsg(null);
      } else {
        setCouponResult(null);
        setErrorMsg(res.error || "Kupon uygulanamadı.");
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponResult(null);
    setCouponCode("");
    setErrorMsg(null);
  };

  const discountAmount = couponResult?.valid ? couponResult.discountAmount : 0;
  const finalTotal = Math.max(0, summary.grandTotal - discountAmount);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Sipariş Özeti</h3>

      <div className="mt-4 space-y-3">
        {summary.saleSubtotal > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">💰 Satın Alma</span>
            <span className="font-medium text-emerald-600">
              {formatCurrency(summary.saleSubtotal)}
            </span>
          </div>
        )}

        {summary.rentalSubtotal > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">📅 Kiralama</span>
            <span className="font-medium text-purple-600">
              {formatCurrency(summary.rentalSubtotal)}
            </span>
          </div>
        )}

        {summary.totalDeposit > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">🔒 Depozito (iade edilir)</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(summary.totalDeposit)}
            </span>
          </div>
        )}

        {/* Kupon İndirimi */}
        {couponResult && couponResult.valid && (
          <div className="flex items-center justify-between text-sm rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800 border border-emerald-200 font-semibold animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span>🏷️ Kupon: {couponResult.code}</span>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs text-red-500 hover:text-red-700 ml-1 underline cursor-pointer"
              >
                Kaldır
              </button>
            </div>
            <span>- {formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">Genel Toplam</span>
            <div className="text-right">
              {discountAmount > 0 && (
                <span className="block text-xs line-through text-gray-400">
                  {formatCurrency(summary.grandTotal)}
                </span>
              )}
              <span className="text-xl font-extrabold text-blue-600">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* İndirim Kuponu Giriş Alanı */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          İndirim Kuponu
        </label>
        <form onSubmit={handleApplyCoupon} className="flex gap-2">
          <input
            type="text"
            placeholder="Kupon Kodu (Örn: HOSGELDIN)"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            disabled={Boolean(couponResult?.valid)}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs uppercase font-mono tracking-wider focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          />
          <Button
            type="submit"
            disabled={isApplying || Boolean(couponResult?.valid) || !couponCode.trim()}
            className="rounded-xl px-4 py-2 text-xs font-bold"
          >
            {isApplying ? "..." : "Uygula"}
          </Button>
        </form>

        {errorMsg && (
          <p className="mt-2 text-xs font-medium text-red-600 animate-fade-in">
            ⚠️ {errorMsg}
          </p>
        )}

        {couponResult && couponResult.valid && (
          <p className="mt-2 text-xs font-medium text-emerald-600">
            {couponResult.message}
          </p>
        )}
      </div>

      <Link
        href={`/checkout${couponResult?.valid ? `?coupon=${encodeURIComponent(couponResult.code || "")}` : ""}`}
        className="mt-6 block"
      >
        <Button size="lg" className="w-full font-bold shadow-md">
          Ödemeye Geç ({summary.itemCount} ürün)
        </Button>
      </Link>

      <p className="mt-3 text-center text-[11px] text-gray-400">
        Kiralama depozitoları ürün iadesi sonrasında hesabınıza geri yatırılır.
      </p>
    </div>
  );
}
