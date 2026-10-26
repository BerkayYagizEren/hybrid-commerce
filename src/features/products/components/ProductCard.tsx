"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/Badge";
import { formatCurrency } from "@/shared/utils/format";
import type { ProductWithDetails, SerializedProduct } from "../types";

interface ProductCardProps {
  product: ProductWithDetails | SerializedProduct;
  showBadges?: boolean;
}

/**
 * 5 Yıldız Çizici Yardımcı Bileşen
 */
function MiniStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const isFilled = rating >= starValue;
        const isHalf = !isFilled && rating >= starValue - 0.5;

        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`h-3 w-3 ${
              isFilled
                ? "fill-amber-400 text-amber-400"
                : isHalf
                ? "fill-amber-400/50 text-amber-400"
                : "fill-gray-200 text-gray-200"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        );
      })}
    </div>
  );
}

/**
 * Trendyol Standartlarında Zenginleştirilmiş Hibrit Ürün Kartı
 */
export function ProductCard({ product, showBadges = true }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const typeLabel = {
    SALE: "Satılık",
    RENTAL: "Kiralık",
    BOTH: "Satılık & Kiralık",
  };

  const badgeVariant = product.type.toLowerCase() as "sale" | "rental" | "both";

  const rating = product.averageRating ? Number(product.averageRating) : 0;
  const reviewCount = product.reviewCount || 0;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  // Dinamik Trendyol Rozetleri Belirleme
  const isBestSeller = reviewCount >= 2;
  const isFreeShipping = product.type === "SALE" || product.type === "BOTH";

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white transition-all duration-300 hover:border-gray-300 hover:shadow-xl"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. GÖRSEL ALANI & ROZETLER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Sol Üst: İş Modeli Tipi Rozeti */}
        <div className="absolute left-2.5 top-2.5 z-10">
          <Badge variant={badgeVariant} className="shadow-xs backdrop-blur-xs font-bold text-[11px] px-2 py-0.5">
            {typeLabel[product.type]}
          </Badge>
        </div>

        {/* Sağ Üst: Favori Butonu (Trendyol Kalp İkonu) */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
          className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-xs transition-transform hover:scale-115 cursor-pointer ${
            isFavorite ? "text-rose-500" : "text-gray-400 hover:text-rose-500"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4.5 w-4.5 transition-colors"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* Sol Alt: Hızlı Teslimat / Kargo Rozeti */}
        {showBadges && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex flex-col gap-1">
            {isBestSeller && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-black text-white shadow-xs backdrop-blur-xs">
                🔥 Çok Satan
              </span>
            )}
            {isFreeShipping && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                ⚡ Hızlı Teslimat
              </span>
            )}
          </div>
        )}

        {/* Sağ Alt: Çoklu Görsel İndikatörü */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
            <span>📷</span>
            <span>{product.images.length}</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ÜRÜN BİLGİLERİ (TRENDYOL DÜZENİ)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* Satıcı & Kategori Üst Bilgisi */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1 truncate">
          <span className="font-bold text-gray-700 truncate">
            {product.vendor?.name || "Kamp Dünyası"}
          </span>
          {(product.category || product.subCategory) && (
            <>
              <span className="text-gray-300">•</span>
              <span className="truncate text-gray-400">
                {product.subCategory?.name || product.category?.name}
              </span>
            </>
          )}
        </div>

        {/* Ürün Başlığı (2 Satır Sabit Yükseklik) */}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-xs font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-relaxed">
          {product.name}
        </h3>

        {/* ─────────────────────────────────────────────────────────
            YILDIZ DEĞERLENDİRME & YORUM SAYISI (TRENDYOL STANDARTI)
        ───────────────────────────────────────────────────────── */}
        <div className="mt-2 flex items-center gap-1.5">
          {reviewCount > 0 ? (
            <>
              {/* Ortalama Puan (Örn: 4.8) */}
              <span className="text-xs font-bold text-gray-900 leading-none">
                {rating.toFixed(1)}
              </span>

              {/* 5 Yıldız İkon Grubu */}
              <MiniStars rating={rating} />

              {/* Toplam Yorum Sayısı Parantez İçinde (Örn: (11)) */}
              <span className="text-[11px] font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
                ({reviewCount})
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <MiniStars rating={0} />
              <span className="text-[10px] italic">Henüz değerlendirilmedi</span>
            </div>
          )}
        </div>

        {/* Ek Fırsat Rozetleri (Trendyol Stili: Çok Al Az Öde) */}
        {showBadges && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200">
              🏷️ Çok Al Az Öde
            </span>
            {product.type === "RENTAL" && (
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                🔒 Escrow Depozito
              </span>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────
            FİYAT ALANI (SATIŞ & KİRALAMA KIRILIMI)
        ───────────────────────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-gray-100/80 flex flex-col justify-end">
          {/* Satış Fiyatı */}
          {(product.type === "SALE" || product.type === "BOTH") && product.salePrice && (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-emerald-700">
                {formatCurrency(Number(product.salePrice))}
              </span>
              {product.type === "BOTH" && (
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Satın Al
                </span>
              )}
            </div>
          )}

          {/* Kiralama Fiyatı */}
          {(product.type === "RENTAL" || product.type === "BOTH") && product.rentalPricing && (
            <div className="flex items-baseline justify-between gap-1 text-xs font-semibold text-purple-700 mt-0.5">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-sm">
                  {formatCurrency(Number(product.rentalPricing.dailyPrice))}
                </span>
                <span className="text-[10px] text-gray-500 font-normal">/ gün</span>
              </div>

              {product.rentalPricing.depositAmount && Number(product.rentalPricing.depositAmount) > 0 && (
                <span className="text-[10px] font-medium text-gray-400 truncate">
                  + {formatCurrency(Number(product.rentalPricing.depositAmount))} depozito
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
