"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCategoriesTree } from "@/features/categories/actions/category.actions";
import type { CategoryItem } from "@/features/categories/types";

function getCategoryIcon(name: string, slug: string): string {
  const text = (name + " " + slug).toLowerCase();
  if (text.includes("outdoor") || text.includes("kamp") || text.includes("cadir")) return "⛺";
  if (text.includes("elektronik") || text.includes("laptop") || text.includes("bilgisayar")) return "💻";
  if (text.includes("foto") || text.includes("kamera") || text.includes("video") || text.includes("lens")) return "📷";
  if (text.includes("karavan") || text.includes("arac")) return "🚐";
  if (text.includes("ses") || text.includes("kulaklik") || text.includes("hoparlor")) return "🎧";
  if (text.includes("guc") || text.includes("enerji") || text.includes("solar")) return "🔋";
  if (text.includes("drone") || text.includes("havadan")) return "🚁";
  if (text.includes("spor") || text.includes("bisiklet")) return "🚴";
  return "📦";
}

export function CategoryMegaMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Kategorileri yükle
  useEffect(() => {
    getCategoriesTree()
      .then((tree) => {
        if (tree && tree.length > 0) {
          setCategories(tree);
          setActiveCategoryId(tree[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Sayfa değiştiğinde menüyü kapat
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const activeCategory =
    categories.find((c) => c.id === activeCategoryId) || categories[0];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TETİKLEYİCİ BUTON (NAVBAR ALT SATIRI)
      ───────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
          isOpen
            ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
            : "bg-white text-gray-800 hover:bg-gray-100 hover:text-blue-600 ring-1 ring-gray-200/80 shadow-2xs"
        }`}
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-90 text-white" : "text-blue-600 group-hover:scale-110"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>Kategoriler</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : "text-gray-400 group-hover:text-blue-600"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ─────────────────────────────────────────────────────────────
          2. TRENDYOL TARZI MEGA MENÜ AÇILIR PANELİ
      ───────────────────────────────────────────────────────────── */}
      {isOpen && categories.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-[760px] lg:w-[840px] rounded-2xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex min-h-[380px] max-h-[480px]">
            {/* SOL SÜTUN: ANA KATEGORİLER */}
            <div className="w-[260px] lg:w-[280px] flex-shrink-0 bg-gray-50/80 border-r border-gray-100 py-3 overflow-y-auto">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Ana Kategoriler
              </div>

              <div className="space-y-0.5 px-2">
                {categories.map((cat) => {
                  const isActive = activeCategory?.id === cat.id;
                  const icon = getCategoryIcon(cat.name, cat.slug);
                  const childCount = cat.children?.length || 0;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={() => setActiveCategoryId(cat.id)}
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-white font-bold text-blue-700 shadow-xs ring-1 ring-gray-200/60 translate-x-1"
                          : "text-gray-700 font-medium hover:bg-gray-100/80 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base flex-shrink-0">{icon}</span>
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 text-gray-400">
                        {childCount > 0 && (
                          <span className="text-[10px] text-gray-400 font-normal">
                            ({childCount})
                          </span>
                        )}
                        <span className="text-xs">›</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/80 px-4">
                <Link
                  href="/products"
                  className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                >
                  <span>🛍️ Tüm Kataloğu Gör</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* SAĞ ALAN: SEÇİLEN KATEGORİ VE ALT KATEGORİLERİ */}
            {activeCategory && (
              <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col justify-between">
                <div>
                  {/* Başlık & Ana Kategoriye Doğrudan Geçiş */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {getCategoryIcon(activeCategory.name, activeCategory.slug)}
                      </span>
                      <div>
                        <Link
                          href={`/products?category=${encodeURIComponent(activeCategory.slug)}`}
                          className="font-bold text-sm text-gray-900 hover:text-blue-600 transition"
                        >
                          {activeCategory.name}
                        </Link>
                        <p className="text-[11px] text-gray-400">
                          {activeCategory.description || "Tüm ürünleri ve modelleri filtreleyin"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/products?category=${encodeURIComponent(activeCategory.slug)}`}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                    >
                      Kategoriye Git →
                    </Link>
                  </div>

                  {/* Alt Kategoriler Grid */}
                  {activeCategory.children && activeCategory.children.length > 0 ? (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2.5 block">
                        Alt Kategoriler
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {activeCategory.children.map((sub) => {
                          const subIcon = getCategoryIcon(sub.name, sub.slug);
                          const productCount =
                            (sub._count?.products || 0) + (sub._count?.subProducts || 0);

                          return (
                            <Link
                              key={sub.id}
                              href={`/products?category=${encodeURIComponent(
                                activeCategory.slug
                              )}&subcategory=${encodeURIComponent(sub.slug)}`}
                              className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm flex-shrink-0">{subIcon}</span>
                                <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 truncate">
                                  {sub.name}
                                </span>
                              </div>
                              {productCount > 0 ? (
                                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-500 border border-gray-200 flex-shrink-0 group-hover:border-blue-200 group-hover:text-blue-600">
                                  {productCount}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs flex-shrink-0">›</span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400">
                      <span className="text-3xl">📦</span>
                      <p className="mt-2 text-xs font-medium">Bu ana kategoriye ait alt kategori tanımlanmadı.</p>
                      <Link
                        href={`/products?category=${encodeURIComponent(activeCategory.slug)}`}
                        className="mt-3 inline-block rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200"
                      >
                        "{activeCategory.name}" Ürünlerini Görüntüle
                      </Link>
                    </div>
                  )}
                </div>

                {/* Alt Reklam/Avantaj Şeridi */}
                <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 bg-gray-50/60 -mx-6 -mb-6 px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span>⚡ Hızlı Teslimat</span>
                    <span>•</span>
                    <span>🔒 Escrow Depozito Koruması</span>
                  </div>
                  <Link
                    href={`/products?category=${encodeURIComponent(activeCategory.slug)}`}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Tümünü Gör ({activeCategory.name})
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
