import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";
import {
  getActiveSliders,
  getShowcaseProducts,
  getActiveInstagramPosts,
} from "@/features/showcase/actions/showcase.actions";
import { ProductCard } from "@/features/products/components/ProductCard";

export const dynamic = "force-dynamic";

/**
 * Dinamik Admin Vitrinleri ile Zenginleştirilmiş Ana Sayfa
 */
export default async function HomePage() {
  const [sliders, trendProducts, bestSellers, instaPosts] = await Promise.all([
    getActiveSliders(),
    getShowcaseProducts("TREND"),
    getShowcaseProducts("BEST_SELLER"),
    getActiveInstagramPosts(),
  ]);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SLIDER VEYA VARSAYILAN BANNER */}
      {sliders.length > 0 ? (
        <section className="relative overflow-hidden bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sliders.map((s, idx) => (
                <div
                  key={s.id}
                  className={`relative group overflow-hidden rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl ${
                    idx === 0 && sliders.length > 1 ? "md:col-span-2 aspect-[21/9]" : "aspect-[16/10]"
                  }`}
                >
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 sm:p-8 flex flex-col justify-end text-white">
                    <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">
                      {s.title}
                    </h2>
                    {s.subtitle && (
                      <p className="mt-2 text-xs sm:text-sm text-gray-200 max-w-md line-clamp-2">
                        {s.subtitle}
                      </p>
                    )}
                    {s.linkUrl && (
                      <div className="mt-4">
                        <Link href={s.linkUrl}>
                          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition shadow-md">
                            İncele →
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Fallback Hero Section */
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-gray-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-4">
                ⚡ Türkiye'nin İlk Hibrit Platformu
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Satın Al <span className="text-blue-300">veya</span> Kirala
              </h1>
              <p className="mt-6 text-base sm:text-lg text-blue-100/90 leading-relaxed">
                İhtiyacınız olan ürünleri satın alın veya ihtiyacınız olduğu süre boyunca güvenle kiralayın.
                Escrow depozito koruması ile tek bir sepet altında.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/products?type=SALE">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8 font-bold shadow-lg">
                    💰 Satın Alınabilir Ürünler
                  </Button>
                </Link>
                <Link href="/products?type=RENTAL">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700 px-8 font-bold shadow-lg">
                    📅 Kiralanabilir Ürünler
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. DİNAMİK VİTRİN: TREND ÜRÜNLER */}
      {trendProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  Haftanın Trend Ürünleri
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Kullanıcılarımız tarafından en çok ilgi gören ve kiralanan modeller.
              </p>
            </div>
            <Link href="/products" className="text-xs font-bold text-blue-600 hover:underline">
              Tümünü Gör →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {trendProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 3. DİNAMİK VİTRİN: ÇOK SATANLAR */}
      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  En Çok Satan & Kiralananlar
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Güvenle tercih edilen popüler ekipman ve cihazlar.
              </p>
            </div>
            <Link href="/products" className="text-xs font-bold text-blue-600 hover:underline">
              Tümünü Gör →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 4. NASIL ÇALIŞIR */}
      <section className="bg-white py-14 border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold text-gray-900 tracking-tight">
            Hibrit Ticaret Nasıl Çalışır?
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                🔍
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">1. Ürünü Seçin</h3>
              <p className="mt-2 text-xs text-gray-500 max-w-xs mx-auto">
                Katalogdan aradığınız ürünü bulun. Satılık, kiralık veya hibrit olarak filtreleyin.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-2xl">
                📅
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">2. Kiralama Tarihini Belirleyin</h3>
              <p className="mt-2 text-xs text-gray-500 max-w-xs mx-auto">
                İster hemen satın alın, ister takvim üzerinden dilediğiniz gün aralığında kiralayın.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                🔒
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">3. Escrow Depozito Güvencesi</h3>
              <p className="mt-2 text-xs text-gray-500 max-w-xs mx-auto">
                Depozitonuz havuzda güvende tutulur, ürün teslim edildiğinde otomatik kartınıza iade edilir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DİNAMİK INSTAGRAM AKIŞI */}
      {instaPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">@HybridCommerce</span>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">
              Bizi Instagram'da Takip Edin
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Topluluğumuzun paylaşımları ve saha maceraları.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {instaPosts.map((post) => (
              <a
                key={post.id}
                href={post.postUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-xs"
              >
                <img
                  src={post.imageUrl}
                  alt={post.caption || "Instagram"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold p-2 text-center">
                  <span>📸 İncele</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
