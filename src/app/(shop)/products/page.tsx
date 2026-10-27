import { ProductGrid } from "@/features/products/components/ProductGrid";
import { ProductService } from "@/features/products/services/product.service";
import { ProductSortSelect } from "@/features/products/components/ProductSortSelect";
import { Badge } from "@/shared/components/ui/Badge";
import Link from "next/link";
import prisma from "@/lib/prisma";
import type { ProductType, ShowcaseType } from "@prisma/client";

interface ProductsPageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    subcategory?: string;
    search?: string;
    q?: string;
    page?: string;
    showcase?: string;
    title?: string;
    sortBy?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const searchQuery = params.q || params.search;
  const activeType = params.type;
  const showcaseType = params.showcase as ShowcaseType | undefined;
  const showcaseTitle = params.title;
  const sortBy = params.sortBy || params.sort || "recommended";

  const showcaseInfoMap: Record<string, { title: string; subtitle: string; icon: string }> = {
    TREND: {
      title: "Haftanın Trend Ürünleri",
      subtitle: "Kullanıcılarımız tarafından en çok ilgi gören ve kiralanan modeller.",
      icon: "🔥",
    },
    BEST_SELLER: {
      title: "En Çok Satan & Kiralananlar",
      subtitle: "Güvenle tercih edilen popüler ekipman ve cihazlar.",
      icon: "🏆",
    },
    NEW_ARRIVALS: {
      title: "Yeni Gelenler",
      subtitle: "Kataloğumuza yeni eklenen en güncel satış ve kiralama ürünleri.",
      icon: "✨",
    },
    CUSTOM: {
      title: showcaseTitle || "Özel Vitrin Koleksiyonu",
      subtitle: "Özel seçki ve kampanya koleksiyon ürünleri.",
      icon: "🌟",
    },
  };

  const activeShowcase = showcaseType ? showcaseInfoMap[showcaseType] : null;

  const result = await ProductService.list({
    type: params.type as ProductType | undefined,
    categorySlug: params.category,
    subCategorySlug: params.subcategory,
    search: searchQuery,
    page: params.page ? parseInt(params.page) : 1,
    showcaseType,
    showcaseTitle,
    sortBy,
  });

  // Kategori bilgilerini çek (Breadcrumb ve başlık gösterimi için)
  let activeCategoryInfo: { name: string; slug: string } | null = null;
  let activeSubCategoryInfo: { name: string; slug: string } | null = null;

  if (params.category) {
    const cat = await prisma.category.findUnique({
      where: { slug: params.category },
      select: { name: true, slug: true },
    });
    if (cat) activeCategoryInfo = cat;
  }

  if (params.subcategory) {
    const sub = await prisma.category.findUnique({
      where: { slug: params.subcategory },
      select: { name: true, slug: true },
    });
    if (sub) activeSubCategoryInfo = sub;
  }

  // URL oluşturucu
  const buildFilterUrl = (newParams: { type?: string; page?: string }) => {
    const p = new URLSearchParams();
    if (newParams.type !== undefined) {
      if (newParams.type) p.set("type", newParams.type);
    } else if (activeType) {
      p.set("type", activeType);
    }

    if (params.category) p.set("category", params.category);
    if (params.subcategory) p.set("subcategory", params.subcategory);
    if (searchQuery) p.set("q", searchQuery);
    if (params.showcase) p.set("showcase", params.showcase);
    if (params.title) p.set("title", params.title);
    if (sortBy && sortBy !== "recommended") p.set("sortBy", sortBy);

    if (newParams.page && newParams.page !== "1") {
      p.set("page", newParams.page);
    }

    const queryStr = p.toString();
    return `/products${queryStr ? `?${queryStr}` : ""}`;
  };

  const hasCategoryFilter = Boolean(activeCategoryInfo || activeSubCategoryInfo);
  const hasActiveFilter = Boolean(searchQuery || hasCategoryFilter || activeShowcase);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Kategori veya Vitrin Breadcrumb */}
      {(hasCategoryFilter || activeShowcase) && (
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-gray-500">
          <Link href="/products" className="hover:text-blue-600 transition font-medium">
            Tüm Ürünler
          </Link>
          {activeShowcase && (
            <>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900 flex items-center gap-1">
                <span>{activeShowcase.icon}</span> {activeShowcase.title}
              </span>
            </>
          )}
          {activeCategoryInfo && (
            <>
              <span className="text-gray-300">/</span>
              <Link
                href={`/products?category=${encodeURIComponent(activeCategoryInfo.slug)}`}
                className={`transition ${
                  activeSubCategoryInfo
                    ? "hover:text-blue-600 font-medium"
                    : "font-bold text-gray-900"
                }`}
              >
                {activeCategoryInfo.name}
              </Link>
            </>
          )}
          {activeSubCategoryInfo && (
            <>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {activeSubCategoryInfo.name}
              </span>
            </>
          )}
        </nav>
      )}

      {/* Başlık, Filtreler ve Sıralama (Sort Options) */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-2">
              {activeShowcase ? (
                <>
                  <span>{activeShowcase.icon}</span> {activeShowcase.title}
                </>
              ) : searchQuery ? (
                `"${searchQuery}" için Arama Sonuçları`
              ) : activeSubCategoryInfo ? (
                activeSubCategoryInfo.name
              ) : activeCategoryInfo ? (
                activeCategoryInfo.name
              ) : (
                "Tüm Ürünler"
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {activeShowcase?.subtitle && `${activeShowcase.subtitle} • `}
              {result.total} ürün listeleniyor
              {hasActiveFilter && (
                <Link
                  href="/products"
                  className="ml-3 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 transition underline"
                >
                  ✕ Tüm Filtreleri Temizle
                </Link>
              )}
            </p>
          </div>

          {/* Sağ Üst: Filtre Rozetleri & Sıralama Dropdown Menüsü */}
          <div className="flex items-center gap-3 flex-wrap">
            {activeShowcase && (
              <div className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/90 px-3 py-1.5 text-xs font-bold text-purple-900 shadow-2xs">
                <span>{activeShowcase.icon} {activeShowcase.title} Vitrini</span>
                <Link
                  href="/products"
                  className="rounded-full bg-purple-200 hover:bg-purple-300 text-purple-950 px-1.5 py-0.5 text-[10px] ml-1 transition"
                  title="Vitrin Filtresini Kaldır"
                >
                  ✕
                </Link>
              </div>
            )}

            {hasCategoryFilter && (
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-2xs">
                  📁 {activeCategoryInfo?.name}
                  {activeSubCategoryInfo && ` › ${activeSubCategoryInfo.name}`}
                </span>
                <Link
                  href={`/products${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
                  className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition"
                  title="Kategori Filtresini Kaldır"
                >
                  ✕ Kaldır
                </Link>
              </div>
            )}

            {/* Ürün Listesi Sıralama Dropdown Menüsü (Sağ Üst) */}
            <ProductSortSelect currentSort={sortBy} />
          </div>
        </div>

        {/* Tip Filtreleri */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={buildFilterUrl({ type: "" })}>
            <Badge
              variant={!activeType ? "both" : "default"}
              className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold"
            >
              Tümü
            </Badge>
          </Link>
          <Link href={buildFilterUrl({ type: "SALE" })}>
            <Badge
              variant={activeType === "SALE" ? "sale" : "default"}
              className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold"
            >
              💰 Satılık
            </Badge>
          </Link>
          <Link href={buildFilterUrl({ type: "RENTAL" })}>
            <Badge
              variant={activeType === "RENTAL" ? "rental" : "default"}
              className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold"
            >
              📅 Kiralık
            </Badge>
          </Link>
          <Link href={buildFilterUrl({ type: "BOTH" })}>
            <Badge
              variant={activeType === "BOTH" ? "both" : "default"}
              className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold"
            >
              💰📅 Satılık &amp; Kiralık
            </Badge>
          </Link>
        </div>
      </div>

      {/* Ürün Grid */}
      <ProductGrid products={result.products} />

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Link
                key={pageNum}
                href={buildFilterUrl({ page: pageNum.toString() })}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pageNum === result.page
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {pageNum}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
