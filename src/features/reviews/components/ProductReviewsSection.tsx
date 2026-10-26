"use client";

import { useState } from "react";
import { ReviewSummary } from "./ReviewSummary";
import { ReviewItem } from "./ReviewItem";
import { ReviewModal } from "./ReviewModal";
import { StarRating } from "./StarRating";
import type { ProductReviewsData } from "../types";
import { useRole } from "@/shared/providers/RoleContext";

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  data: ProductReviewsData;
}

export function ProductReviewsSection({
  productId,
  productName,
  data,
}: ProductReviewsSectionProps) {
  const { user } = useRole();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  const isLoggedIn = Boolean(user);
  const { stats, reviews, userReview, isVerifiedBuyer, canReview } = data;

  const filteredReviews = selectedStarFilter
    ? reviews.filter((r) => r.rating === selectedStarFilter)
    : reviews;

  return (
    <section id="reviews" className="mt-16 pt-12 border-t border-gray-200">
      {/* Başlık Alanı */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Müşteri Değerlendirmeleri
            </h2>
            {stats.averageRating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-400/30">
                <span>★</span> {stats.averageRating.toFixed(1)} / 5
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Yalnızca bu ürünü satın almış veya kiralamış müşterilerin gerçek deneyimleri.
          </p>
        </div>

        {/* Hızlı Değerlendirme Butonu */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
        >
          <span>✍️</span>
          <span>{userReview ? "Yorumumu Düzenle" : "Yorum Yaz"}</span>
        </button>
      </div>

      {/* Özet Kartı ve Dağılım */}
      <ReviewSummary
        stats={stats}
        canReview={canReview}
        isVerifiedBuyer={isVerifiedBuyer}
        onOpenModal={() => setIsModalOpen(true)}
        hasExistingReview={Boolean(userReview)}
      />

      {/* Kullanıcının Kendi Yorumu Varsa Özel Alan */}
      {userReview && (
        <div className="mt-8 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <span>👤</span> Sizin Değerlendirmeniz
            </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              Düzenle ✏️
            </button>
          </div>
          <ReviewItem review={userReview} />
        </div>
      )}

      {/* Filtreleme ve Yorum Listesi */}
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">
              Filtrele:
            </span>
            <button
              type="button"
              onClick={() => setSelectedStarFilter(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedStarFilter === null
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tümü ({reviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setSelectedStarFilter(selectedStarFilter === star ? null : star)
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  selectedStarFilter === star
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {star} ★
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400">
            {filteredReviews.length} yorum listeleniyor
          </span>
        </div>

        {/* Yorumlar Listesi */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((rev) => (
              <ReviewItem key={rev.id} review={rev} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <span className="text-4xl block mb-2">💬</span>
            <h4 className="font-bold text-gray-800 text-sm">
              {selectedStarFilter
                ? `${selectedStarFilter} yıldızlı yorum bulunamadı.`
                : "Bu ürün için henüz onaylanmış bir değerlendirme bulunmuyor."}
            </h4>
            <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">
              Ürünü satın aldıysanız veya kiraladıysanız ilk değerlendirmeyi yaparak diğer kullanıcılara yardımcı olabilirsiniz!
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              İlk Yorumu Sen Yap →
            </button>
          </div>
        )}
      </div>

      {/* Yorum Yap / Düzenle Modalı */}
      <ReviewModal
        productId={productId}
        productName={productName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canReview={canReview}
        isLoggedIn={isLoggedIn}
        isVerifiedBuyer={isVerifiedBuyer}
        existingRating={userReview?.rating}
        existingComment={userReview?.comment}
      />
    </section>
  );
}
