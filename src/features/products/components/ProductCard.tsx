import Link from "next/link";
import { Badge } from "@/shared/components/ui/Badge";
import { formatCurrency } from "@/shared/utils/format";
import type { ProductWithDetails } from "../types";

interface ProductCardProps {
  product: ProductWithDetails;
}

/**
 * Ürün Kartı
 * Satış, kiralama ve her iki tipi destekleyen hibrit kart bileşeni.
 */
export function ProductCard({ product }: ProductCardProps) {
  const typeLabel = {
    SALE: "Satılık",
    RENTAL: "Kiralık",
    BOTH: "Satılık & Kiralık",
  };

  const badgeVariant = product.type.toLowerCase() as "sale" | "rental" | "both";

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
    >
      {/* Ürün Görseli */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
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
          <Badge variant={badgeVariant}>{typeLabel[product.type]}</Badge>
        </div>

        {/* Çoklu Görsel İndikatörü */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
            <span>📷</span>
            <span>{product.images.length}</span>
          </div>
        )}
      </div>

      {/* Ürün Bilgileri */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600">
          {product.name}
        </h3>

        {(product.category || product.subCategory) && (
          <p className="mt-1 text-xs text-gray-500 truncate">
            {product.category?.name}
            {product.subCategory && ` › ${product.subCategory.name}`}
          </p>
        )}

        <div className="mt-auto pt-3">
          {/* Satış Fiyatı */}
          {(product.type === "SALE" || product.type === "BOTH") && product.salePrice && (
            <p className="text-lg font-bold text-sale-600">
              {formatCurrency(Number(product.salePrice))}
            </p>
          )}

          {/* Kiralama Fiyatı */}
          {(product.type === "RENTAL" || product.type === "BOTH") && product.rentalPricing && (
            <p className="text-sm font-medium text-rental-600">
              {formatCurrency(Number(product.rentalPricing.dailyPrice))}/gün
              {product.rentalPricing.depositAmount && Number(product.rentalPricing.depositAmount) > 0 && (
                <span className="ml-1 text-xs text-gray-400">
                  + {formatCurrency(Number(product.rentalPricing.depositAmount))} depozito
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
