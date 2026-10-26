"use client";

import { StarRating } from "./StarRating";
import type { ProductRatingStats } from "../types";

interface ReviewSummaryProps {
  stats: ProductRatingStats;
  canReview: boolean;
  isVerifiedBuyer: boolean;
  onOpenModal: () => void;
  hasExistingReview?: boolean;
}

export function ReviewSummary({
  stats,
  canReview,
  isVerifiedBuyer,
  onOpenModal,
  hasExistingReview,
}: ReviewSummaryProps) {
  const { averageRating, totalReviews, distribution } = stats;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Sol Sütun: Ortalama Puan */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
          <div className="text-5xl font-black text-gray-900 tracking-tight">
            {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
          </div>

          <div className="mt-2.5">
            <StarRating rating={averageRating} size="md" />
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            {totalReviews > 0
              ? `${totalReviews} doğrulanmış değerlendirmeye göre`
              : "Henüz değerlendirme yapılmamış"}
          </p>

          <button
            type="button"
            onClick={onOpenModal}
            className={`mt-4 w-full max-w-[220px] rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
              hasExistingReview
                ? "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                : canReview
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {hasExistingReview ? "✏️ Yorumumu Güncelle" : "⭐ Ürünü Değerlendir"}
          </button>
        </div>

        {/* Sağ Sütun: 5'ten 1'e Yıldız Dağılım Barları */}
        <div className="md:col-span-8 space-y-2.5">
          {distribution.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-bold text-gray-700 flex items-center gap-1 justify-end">
                <span>{star}</span>
                <span className="text-amber-400">★</span>
              </span>

              <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <span className="w-16 text-right font-medium text-gray-500">
                %{percentage}{" "}
                <span className="text-gray-400 text-[10px]">({count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
