"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { ProductSortOption } from "../types";

export const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: "recommended", label: "Önerilen Sıralama" },
  { value: "price_asc", label: "Fiyat: Düşükten Yükseğe" },
  { value: "price_desc", label: "Fiyat: Yüksekten Düşüğe" },
  { value: "newest", label: "En Yeniler" },
  { value: "best_seller", label: "En Çok Satanlar" },
  { value: "most_rented", label: "En Çok Kiralananlar" },
  { value: "most_favorited", label: "En Favoriler" },
  { value: "rating", label: "En Yüksek Puanlılar" },
];

interface ProductSortSelectProps {
  currentSort?: string;
  className?: string;
}

export function ProductSortSelect({
  currentSort = "recommended",
  className = "",
}: ProductSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeSort =
    searchParams.get("sortBy") ||
    searchParams.get("sort") ||
    currentSort ||
    "recommended";

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSort = e.target.value;
      const params = new URLSearchParams(searchParams.toString());

      if (newSort === "recommended") {
        params.delete("sortBy");
        params.delete("sort");
      } else {
        params.set("sortBy", newSort);
        params.delete("sort");
      }

      // Sıralama değiştiğinde sayfa numarasını başa al
      params.delete("page");

      const queryStr = params.toString();
      const url = `${pathname}${queryStr ? `?${queryStr}` : ""}`;

      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <label
        htmlFor="product-sort-select"
        className="text-xs font-semibold text-gray-500 whitespace-nowrap hidden sm:inline"
      >
        Sıralama:
      </label>
      <div className="relative inline-block">
        <select
          id="product-sort-select"
          value={activeSort}
          onChange={handleSortChange}
          disabled={isPending}
          className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3.5 pr-9 text-xs font-bold text-gray-700 shadow-2xs transition hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:opacity-60"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
          <svg
            className={`h-4 w-4 transition-transform ${isPending ? "animate-spin text-blue-500" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            {isPending ? (
              <path
                fillRule="evenodd"
                d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a1 1 0 00-1.414-1.414L10 11.429l-1.486-1.485a1 1 0 00-1.414 1.414l2.2 2.2a1 1 0 001.414 0l.286-.285z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default ProductSortSelect;
