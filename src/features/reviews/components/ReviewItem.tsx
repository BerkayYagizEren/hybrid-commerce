"use client";

import { StarRating } from "./StarRating";
import type { ReviewWithUser } from "../types";

interface ReviewItemProps {
  review: ReviewWithUser;
}

export function ReviewItem({ review }: ReviewItemProps) {
  const formattedDate = new Date(review.createdAt).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName = review.user?.name || review.user?.email.split("@")[0] || "Müşteri";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs transition hover:border-gray-200 hover:shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm shadow-2xs">
            {initial}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{userName}</span>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                  <svg
                    className="h-3 w-3 fill-emerald-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Doğrulanmış Alıcı
                </span>
              )}

              {review.status === "PENDING" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-500/20">
                  ⏳ Moderatör Onayı Bekliyor
                </span>
              )}
            </div>

            <span className="text-[11px] text-gray-400">{formattedDate}</span>
          </div>
        </div>

        {/* Yıldız Puanı */}
        <div className="flex items-center gap-1.5">
          <StarRating rating={review.rating} size="sm" />
          <span className="text-xs font-bold text-amber-600">{review.rating} / 5</span>
        </div>
      </div>

      {/* Yorum Metni */}
      <p className="mt-3.5 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {review.comment}
      </p>

      {/* Yönetici Moderasyon Notu varsa */}
      {review.moderationNote && review.status === "APPROVED" && (
        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-2.5 text-xs text-gray-500 flex items-center gap-1.5">
          <span>🛡️</span>
          <span>{review.moderationNote}</span>
        </div>
      )}
    </div>
  );
}
