"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavorites } from "@/features/favorites/context/FavoritesContext";
import { useCart } from "@/features/cart/hooks/useCart";
import { useRole } from "@/shared/providers/RoleContext";
import { useSession } from "@/features/auth/hooks/useSession";
import type { SessionUser } from "@/lib/auth-token";
import {
  getFavoriteProducts,
} from "@/features/favorites/actions/favorite.actions";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";
import { AddToCartModal } from "@/features/cart/components/AddToCartModal";
import { formatCurrency } from "@/shared/utils/format";
import type { SerializedProduct } from "@/features/products/types";

interface FavoritesClientProps {
  initialProducts: SerializedProduct[];
  isInitialUser: boolean;
  initialUser?: SessionUser | null;
}

export function FavoritesClient({
  initialProducts,
  isInitialUser,
  initialUser = null,
}: FavoritesClientProps) {
  const session = useSession();
  const { user: roleUser } = useRole();
  const { favoriteIds, isLoading: isFavLoading } = useFavorites();
  const { addToCart, addItem, setIsCartOpen } = useCart();

  // Aktif oturum ve kullanıcı kontrolü: useSession, RoleContext veya SSR initialUser
  const user = session?.user ?? roleUser ?? initialUser ?? null;
  const isLoggedIn = Boolean(user);

  const [products, setProducts] = useState<SerializedProduct[]>(initialProducts);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  // Sepete Ekle Modal Durumları
  const [selectedProductForCart, setSelectedProductForCart] = useState<SerializedProduct | null>(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [cartModalAction, setCartModalAction] = useState<"SALE" | "RENTAL">("SALE");

  const openAddToCartModal = (product: SerializedProduct, action: "SALE" | "RENTAL" = "SALE") => {
    setSelectedProductForCart(product);
    setCartModalAction(action);
    setIsCartModalOpen(true);
  };

  // Favoriler listesini senkronize et
  useEffect(() => {
    let isCancelled = false;

    async function syncList() {
      // Misafir modu kaldırıldı: Giriş yapılmamışsa ürün yüklenmez
      if (!isLoggedIn || !user) {
        setProducts([]);
        return;
      }

      // Favori listesi tamamen boşsa
      if (favoriteIds.length === 0) {
        setProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        // Giriş yapılmış durumdayken favorileri doğrudan veritabanından çek
        const fresh = await getFavoriteProducts(user.id);
        if (!isCancelled) setProducts(fresh);
      } catch (err) {
        console.error("Favoriler güncellenirken hata:", err);
      } finally {
        if (!isCancelled) setLoadingProducts(false);
      }
    }

    syncList();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, user?.id, favoriteIds]);

  // Hızlı sepete ekleme işlemi (useCart addToCart)
  const handleAddToCart = async (product: SerializedProduct) => {
    setAddedMap((prev) => ({ ...prev, [product.id]: true }));
    try {
      const success = await addToCart({
        productId: product.id,
        quantity: 1,
        type: "SALE",
      });
      if (success) {
        setIsCartOpen(true);
      }
      setTimeout(() => {
        setAddedMap((prev) => ({ ...prev, [product.id]: false }));
      }, 2000);
    } catch {
      setAddedMap((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const typeLabel = {
    SALE: "Satılık",
    RENTAL: "Kiralık",
    BOTH: "Satılık & Kiralık",
  };

  return (
    <div>
      {/* ─────────────────────────────────────────────────────────────
          1. BAŞLIK VE SENKRONİZASYON BİLGİ ALANI
      ───────────────────────────────────────────────────────────── */}
      <div className="mb-8 border-b border-gray-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Favorilerim
              </h1>
              {products.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200 shadow-2xs">
                  {products.length} Ürün
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Beğendiğiniz ürünleri takip edin, sepetinize ekleyin veya kiralama planınızı yapın.
            </p>
          </div>

          {/* Oturum Açılmışsa: Senkronizasyon Rozeti */}
          {isLoggedIn && user && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs">
              <span>☁️</span>
              <span>{user?.name || user?.email} — Hesabınızla Senkronize</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. YÜKLENİYOR DURUMU
      ───────────────────────────────────────────────────────────── */}
      {(loadingProducts || isFavLoading) && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-rose-500 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-gray-500">Favorileriniz yükleniyor...</p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. GİRİŞ YAPILMAMIŞ VEYA BOŞ DURUM (EMPTY STATE)
      ───────────────────────────────────────────────────────────── */}
      {!loadingProducts && !isFavLoading && products.length === 0 && (
        !isLoggedIn ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 px-6 text-center shadow-xs">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 fill-none stroke-current"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-bold text-gray-900 sm:text-xl">
              Favorilerinizi Görüntülemek İçin Giriş Yapın
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Favorilerinize ürün eklemek ve kayıtlı ürünlerinizi görmek için lütfen hesabınıza giriş yapın.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link href="/login?redirect=/favorites">
                <Button size="lg" className="rounded-xl px-6 font-bold shadow-md bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">
                  🔑 Giriş Yap
                </Button>
              </Link>
              <Link href="/signup?redirect=/favorites">
                <Button size="lg" variant="outline" className="rounded-xl px-6 font-bold cursor-pointer">
                  Kayıt Ol
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 px-6 text-center shadow-xs">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 fill-none stroke-current"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-bold text-gray-900 sm:text-xl">
              Favori Listeniz Henüz Boş
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Beğendiğiniz satın alınabilir veya kiralık ürünleri üzerlerindeki kalp ikonuna tıklayarak
              buraya kaydedebilirsiniz.
            </p>
            <Link href="/products" className="mt-6">
              <Button size="lg" className="rounded-xl px-6 font-bold shadow-md">
                🛍️ Ürünleri Keşfet →
              </Button>
            </Link>
          </div>
        )
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FAVORİ ÜRÜNLER IZGARASI (FAVORITE GRID)
      ───────────────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const rating = product.averageRating ? Number(product.averageRating) : 0;
            const reviewCount = product.reviewCount || 0;
            const isAdded = addedMap[product.id] || false;

            return (
              <div
                key={product.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs transition-all duration-200 hover:border-gray-300 hover:shadow-lg"
              >
                {/* Görsel Alanı */}
                <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                  <Link href={`/products/${product.slug}`} className="block h-full w-full">
                    {product.images && product.images.length > 0 && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <span className="text-4xl">📷</span>
                      </div>
                    )}
                  </Link>

                  {/* Tip Rozeti */}
                  <div className="absolute left-2.5 top-2.5">
                    <Badge
                      variant={product.type.toLowerCase() as "sale" | "rental" | "both"}
                      className="shadow-xs font-semibold text-[10px] px-2 py-0.5"
                    >
                      {typeLabel[product.type]}
                    </Badge>
                  </div>

                  {/* Kalp Butonu (Favorilerden Çıkarma) */}
                  <FavoriteButton productId={product.id} className="absolute top-3 right-3 z-10" />
                </div>

                {/* Ürün Detayları */}
                <div className="flex flex-1 flex-col p-4">
                  {/* Kategori Bilgisi */}
                  {(product.category || product.subCategory) && (
                    <p className="text-xs text-gray-400 mb-1 truncate">
                      {product.category?.name}
                      {product.subCategory && ` › ${product.subCategory.name}`}
                    </p>
                  )}

                  {/* Başlık */}
                  <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug"
                  >
                    {product.name}
                  </Link>

                  {/* Yıldız & Yorum */}
                  <div className="mt-2 flex items-center gap-1.5">
                    {reviewCount > 0 ? (
                      <>
                        <span className="text-xs font-bold text-gray-900">{rating.toFixed(1)}</span>
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i}>{i < Math.round(rating) ? "★" : "☆"}</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">({reviewCount})</span>
                      </>
                    ) : (
                      <span className="text-[11px] italic text-gray-400">Değerlendirme yok</span>
                    )}
                  </div>

                  {/* Fiyat Bilgileri */}
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    {(product.type === "SALE" || product.type === "BOTH") && product.salePrice && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(Number(product.salePrice))}
                        </span>
                        {product.type === "BOTH" && (
                          <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                            Satın Al
                          </span>
                        )}
                      </div>
                    )}

                    {(product.type === "RENTAL" || product.type === "BOTH") &&
                      product.rentalPricing && (
                        <div className="flex items-baseline justify-between text-xs font-semibold text-purple-700 mt-0.5">
                          <span>
                            {formatCurrency(Number(product.rentalPricing.dailyPrice))}
                            <span className="text-[10px] text-gray-500 font-normal"> / gün</span>
                          </span>
                          {product.rentalPricing.depositAmount > 0 && (
                            <span className="text-[10px] font-normal text-gray-400">
                              +{formatCurrency(Number(product.rentalPricing.depositAmount))} depozito
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Alt Aksiyon Butonları */}
                  <div className="mt-3 pt-2">
                    {product.type === "SALE" ? (
                      <Button
                        size="sm"
                        onClick={() => openAddToCartModal(product, "SALE")}
                        className={`w-full font-bold transition-all cursor-pointer ${
                          isAdded
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {isAdded ? "✓ Sepete Eklendi!" : "🛒 Sepete Ekle"}
                      </Button>
                    ) : product.type === "RENTAL" ? (
                      <Button
                        size="sm"
                        onClick={() => openAddToCartModal(product, "RENTAL")}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                      >
                        📅 Tarih Seç &amp; Kirala
                      </Button>
                    ) : (
                      // BOTH
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => openAddToCartModal(product, "SALE")}
                          className={`font-semibold text-xs cursor-pointer ${
                            isAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isAdded ? "✓ Eklendi" : "🛒 Satın Al"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openAddToCartModal(product, "RENTAL")}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer"
                        >
                          📅 Kirala
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sepete Ekleme Modalı */}
      <AddToCartModal
        product={selectedProductForCart}
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        defaultAction={cartModalAction}
        onSuccess={() => {
          if (selectedProductForCart) {
            setAddedMap((prev) => ({ ...prev, [selectedProductForCart.id]: true }));
            setTimeout(() => {
              setAddedMap((prev) => ({ ...prev, [selectedProductForCart.id]: false }));
            }, 2000);
          }
        }}
      />
    </div>
  );
}
