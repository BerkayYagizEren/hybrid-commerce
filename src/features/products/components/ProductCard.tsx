"use client";

import Link from "next/link";
import { Badge } from "@/shared/components/ui/Badge";
import { formatCurrency } from "@/shared/utils/format";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";
import type { ProductWithDetails, SerializedProduct } from "../types";

interface ProductCardProps {
  product: ProductWithDetails | SerializedProduct;
  heartPosition?: "top-right" | "bottom-right";
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
            className={`h-3.5 w-3.5 ${
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
 * Sadeleştirilmiş, Sadece Yıldız ve Yorum Odaklı Ürün Kartı
 */
export function ProductCard({
  product,
  heartPosition = "top-right",
}: ProductCardProps) {
  const typeLabel = {
    SALE: "Satılık",
    RENTAL: "Kiralık",
    BOTH: "Satılık & Kiralık",
  };

  const badgeVariant = product.type.toLowerCase() as "sale" | "rental" | "both";

  const rating = product.averageRating ? Number(product.averageRating) : 0;
  const reviewCount = product.reviewCount || 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-lg"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. GÖRSEL ALANI
      ───────────────────────────────────────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

        {/* Tip Etiketi */}
        <div className="absolute left-3 top-3">
          <Badge variant={badgeVariant} className="shadow-xs font-semibold text-[10px] px-2 py-0.5">
            {typeLabel[product.type]}
          </Badge>
        </div>

        {/* Çoklu Görsel İndikatörü */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
            <span>📷</span>
            <span>{product.images.length}</span>
          </div>
        )}

        {/* Favori Kalp Butonu (Görselin Sağ Alt Köşesine Sabitlendi) */}
        <FavoriteButton
          productId={product.id}
          className="absolute bottom-3 right-3 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-md backdrop-blur-sm transition-all"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ÜRÜN BİLGİLERİ (SADE, YILDIZ & YORUM ODAKLI)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        {/* Kategori Bilgisi */}
        {(product.category || product.subCategory) && (
          <p className="text-xs text-gray-400 mb-1 truncate">
            {product.category?.name}
            {product.subCategory && ` › ${product.subCategory.name}`}
          </p>
        )}

        {/* Ürün Başlığı */}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {product.name}
        </h3>

        {/* ─────────────────────────────────────────────────────────
            YILDIZ DEĞERLENDİRME & YORUM SAYISI GÖSTERİMİ
        ───────────────────────────────────────────────────────── */}
        <div className="mt-2 flex items-center gap-1.5">
          {reviewCount > 0 ? (
            <>
              {/* Ortalama Puan (Örn: 4.1) */}
              <span className="text-xs font-bold text-gray-900">
                {rating.toFixed(1)}
              </span>

              {/* 5 Sarı Yıldız Grubu */}
              <MiniStars rating={rating} />

              {/* Toplam Yorum Sayısı Parantez İçinde (Örn: (11)) */}
              <span className="text-xs text-gray-400">
                ({reviewCount})
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MiniStars rating={0} />
              <span className="text-[11px] italic">Henüz değerlendirilmedi</span>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────
            FİYAT ALANI (SATIŞ & KİRALAMA)
        ───────────────────────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col justify-end">
          {/* Satış Fiyatı */}
          {(product.type === "SALE" || product.type === "BOTH") && product.salePrice && (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(Number(product.salePrice))}
              </span>
              {product.type === "BOTH" && (
                <span className="text-[10px] font-medium text-emerald-600 uppercase">
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
                <span className="text-[10px] font-normal text-gray-400 truncate">
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
