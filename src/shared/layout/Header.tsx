"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRole, type UserRoleType } from "@/shared/providers/RoleContext";
import { useFavorites } from "@/features/favorites/context/FavoritesContext";
import { useCart } from "@/features/cart/hooks/useCart";
import { useState, useEffect, Suspense } from "react";
import type { SessionUser } from "@/lib/auth-token";
import { CategoryMegaMenu } from "@/components/CategoryMegaMenu";

function HeaderContent({ initialUser }: { initialUser?: SessionUser | null }) {
  const { role, user, logout, switchDemoRole } = useRole();
  const { favoriteCount } = useFavorites();
  const { itemCount: cartItemCount, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // URL'deki mevcut ?q= veya ?search= parametresini arama çubuğuna aktar
  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search") || "";
    setSearchTerm(q);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      router.push(`/products?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/products");
    }
  };

  const handleRoleChange = async (newRole: UserRoleType) => {
    await switchDemoRole(newRole);
    setMobileMenuOpen(false);
  };

  // SSR'da initialUser, client mount sonrasında context user kullanılır
  const currentUser = user ?? initialUser ?? null;
  const activeRole = currentUser ? currentUser.role : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur shadow-xs">
      {/* ─────────────────────────────────────────────────────────────
          1. ÜST SATIR (MAIN HEADER BAR)
          Sol: Logo | Orta: Geniş Arama Çubuğu | Sağ: Sepet & Hesabım
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          
          {/* Sol: Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 min-w-[175px] whitespace-nowrap select-none group"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-sm font-black text-white tracking-tight">HC</span>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight whitespace-nowrap">
              Hybrid<span className="text-blue-600">Commerce</span>
            </span>
          </Link>

          {/* Orta: Geniş, Responsive Arama Çubuğu */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-2xl mx-1 sm:mx-4 md:mx-6"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ürün, kategori veya marka ara..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/90 pl-10 pr-9 py-2 text-sm text-gray-900 shadow-2xs transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Temizle"
                >
                  <span className="text-xs font-bold bg-gray-200 rounded-full h-4 w-4 flex items-center justify-center">
                    ✕
                  </span>
                </button>
              )}
            </div>
          </form>

          {/* Sağ: Favorilerim, Sepet Butonu & Oturum Durumu */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Favorilerim Butonu */}
            <Link
              href="/favorites"
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 flex-shrink-0 whitespace-nowrap"
              title="Favorilerim"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-colors ${
                  favoriteCount > 0 ? "fill-rose-500 text-rose-500" : "text-gray-500"
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                fill={favoriteCount > 0 ? "currentColor" : "none"}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="hidden sm:inline">Favorilerim</span>
              {favoriteCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {favoriteCount}
                </span>
              )}
            </Link>

            {/* Sepet Butonu */}
            <Link
              href="/cart"
              onClick={(e) => {
                e.preventDefault();
                openCart();
              }}
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 flex-shrink-0 whitespace-nowrap cursor-pointer"
              title="Sepetim"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              <span className="hidden sm:inline">Sepet</span>
              {cartItemCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Oturum Açılmışsa: Kullanıcı Profil Alanı & Çıkış Yap */}
            {currentUser ? (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs shadow-xs flex-shrink-0">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-xs">
                  {currentUser.name
                    ? currentUser.name.charAt(0).toUpperCase()
                    : currentUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block min-w-0">
                  <p className="truncate max-w-[105px] font-bold text-gray-800 leading-tight">
                    {currentUser.name || currentUser.email.split("@")[0]}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-semibold uppercase leading-none ${
                      currentUser.role === "ADMIN"
                        ? "text-amber-700"
                        : currentUser.role === "VENDOR"
                        ? "text-purple-700"
                        : "text-blue-700"
                    }`}
                  >
                    {currentUser.role === "ADMIN"
                      ? "👑 Admin"
                      : currentUser.role === "VENDOR"
                      ? "🏪 Satıcı"
                      : "👤 Müşteri"}
                  </span>
                </div>

                {/* Çıkış Yap Butonu */}
                <button
                  type="button"
                  onClick={() => logout()}
                  title="Oturumu Kapat"
                  className="ml-1 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-600 shadow-xs transition hover:bg-red-50 hover:text-red-700 cursor-pointer flex-shrink-0 whitespace-nowrap"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </div>
            ) : (
              /* Giriş Yapılmamışsa (Misafir): SADECE Giriş Yap ve Kayıt Ol */
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 whitespace-nowrap">
                <Link
                  href="/login"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-700"
                >
                  Kayıt Ol
                </Link>
              </div>
            )}

            {/* Mobil Menü Hamburger Butonu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
              aria-label="Menüyü Aç"
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ALT SATIR (NAVİGASYON & YETKİ KONTROL BARI)
          Sol: Ürünler, Satın Al, Kirala, Siparişlerim
          Sağ: (Oturum Açılmışsa) Hızlı Rol Switcher, Satıcı Paneli, Admin Paneli
          (Misafir Durumunda Sağ Taraf TAMAMEN GİZLİ)
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-gray-50/90 border-t border-gray-100 text-xs">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Sol Taraf: Temel Navigasyon Linkleri */}
          <nav className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            {/* Trendyol Tarzı Mega Menü */}
            <CategoryMegaMenu />

            <Link
              href="/products"
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                pathname === "/products"
                  ? "bg-white text-blue-700 font-bold shadow-2xs ring-1 ring-gray-200/60"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
              }`}
            >
              🛍️ Ürünler
            </Link>
            <Link
              href="/products?type=SALE"
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                pathname === "/products?type=SALE"
                  ? "bg-emerald-50 text-emerald-800 font-bold shadow-2xs ring-1 ring-emerald-200/60"
                  : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/60"
              }`}
            >
              💰 Satın Al
            </Link>
            <Link
              href="/products?type=RENTAL"
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                pathname === "/products?type=RENTAL"
                  ? "bg-purple-50 text-purple-800 font-bold shadow-2xs ring-1 ring-purple-200/60"
                  : "text-purple-700 hover:text-purple-800 hover:bg-purple-50/60"
              }`}
            >
              📅 Kirala
            </Link>

            {/* Müşteri ve Satıcı: Siparişlerim & Kiralar */}
            {activeRole && (activeRole === "CUSTOMER" || activeRole === "VENDOR") && (
              <Link
                href="/orders"
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  pathname === "/orders"
                    ? "bg-blue-50 text-blue-700 font-bold shadow-2xs ring-1 ring-blue-200/60"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                }`}
              >
                📦 Siparişlerim &amp; Kiralar
              </Link>
            )}
          </nav>

          {/* Sağ Taraf: Ekstra Paneller & Rol Kontrolleri
              YALNIZCA Oturum Açılmışsa Görünür; Misafir Kullanıcıda TAMAMEN GİZLİ */}
          {currentUser && (
            <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
              
              {/* Hızlı Rol Switcher (Sadece Admin için test ve simülasyon kolaylığı) */}
              {activeRole === "ADMIN" && (
                <div className="flex items-center rounded-lg bg-white p-0.5 ring-1 ring-gray-200/80 shadow-2xs">
                  <span className="px-2 text-[10px] font-bold text-gray-400 uppercase">
                    Rol:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("CUSTOMER")}
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
                    title="Müşteri Görünümü"
                  >
                    👤 Müşteri
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("VENDOR")}
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
                    title="Satıcı Görünümü"
                  >
                    🏪 Satıcı
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("ADMIN")}
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 ring-1 ring-amber-300"
                    title="Yönetici Paneli"
                  >
                    🛡️ Admin
                  </button>
                </div>
              )}

              {/* Satıcı Paneli Butonu (YALNIZCA VENDOR ve ADMIN) */}
              {(activeRole === "VENDOR" || activeRole === "ADMIN") && (
                <Link
                  href="/vendor/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    pathname.startsWith("/vendor")
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-100/80 text-purple-800 hover:bg-purple-200/80"
                  }`}
                  title="Satıcı Mağaza Paneli"
                >
                  <span>📊</span> Satıcı Paneli
                </Link>
              )}

              {/* Admin Paneli Butonu (YALNIZCA VE YALNIZCA ADMIN) */}
              {activeRole === "ADMIN" && (
                <div className="relative group">
                  <Link
                    href="/admin/dashboard"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      pathname.startsWith("/admin")
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-100/80 text-amber-900 hover:bg-amber-200/80"
                    }`}
                    title="Yönetici Konsolu"
                  >
                    <span>🛡️</span> Yönetim Paneli
                    <svg className="w-3.5 h-3.5 ml-0.5 opacity-70 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>

                  {/* Admin Açılır Hızlı Menü */}
                  <div className="absolute right-0 top-full pt-1.5 hidden group-hover:block z-50">
                    <div className="w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl space-y-0.5 text-xs animate-in fade-in duration-150">
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-900 font-semibold transition"
                      >
                        <span>📊</span> Dashboard
                      </Link>
                      <Link
                        href="/admin/measurements"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-blue-700 hover:bg-blue-50 font-bold transition"
                      >
                        <span>📐</span> Ölçü Birimleri (Measurement)
                      </Link>
                      <Link
                        href="/admin/warehouses"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 font-semibold transition"
                      >
                        <span>🏢</span> Çoklu Depo &amp; Stok
                      </Link>
                      <Link
                        href="/admin/dealers"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-900 font-semibold transition"
                      >
                        <span>💼</span> B2B Bayi Finans
                      </Link>
                      <Link
                        href="/admin/showcase"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-pink-50 hover:text-pink-900 font-semibold transition"
                      >
                        <span>🖼️</span> Vitrin &amp; Slider
                      </Link>
                      <Link
                        href="/admin/categories"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-900 font-semibold transition"
                      >
                        <span>📁</span> Kategoriler
                      </Link>
                      <Link
                        href="/admin/reviews"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-900 font-semibold transition"
                      >
                        <span>⭐</span> Yorum Moderasyonu
                      </Link>
                      <Link
                        href="/admin/orders"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-semibold transition"
                      >
                        <span>📑</span> Tüm Siparişler
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBİL VE TABLET AÇILIR MENÜSÜ (DRAWER)
      ───────────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          {/* Mobil Navigasyon Linkleri */}
          <div className="flex flex-col space-y-1">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              🛍️ Tüm Ürünler
            </Link>
            <Link
              href="/products?type=SALE"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              💰 Satın Alınabilir Ürünler
            </Link>
            <Link
              href="/products?type=RENTAL"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              📅 Kiralık Ekipmanlar
            </Link>

            {/* Favorilerim */}
            <Link
              href="/favorites"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              <span className="flex items-center gap-2">
                <span>❤️</span>
                <span>Favorilerim</span>
              </span>
              {favoriteCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                  {favoriteCount}
                </span>
              )}
            </Link>

            {/* Sepetim */}
            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <span className="flex items-center gap-2">
                <span>🛒</span>
                <span>Sepetim</span>
              </span>
              {cartItemCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Müşteri ve Satıcı: Siparişlerim */}
            {activeRole && (activeRole === "CUSTOMER" || activeRole === "VENDOR") && (
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                📦 Siparişlerim &amp; Kiralar
              </Link>
            )}

            {/* YALNIZCA Satıcı ve Admin: Mağaza Paneli */}
            {(activeRole === "VENDOR" || activeRole === "ADMIN") && (
              <Link
                href="/vendor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-bold text-purple-800 bg-purple-50 hover:bg-purple-100"
              >
                📊 Satıcı Mağaza Paneli
              </Link>
            )}

            {/* YALNIZCA VE YALNIZCA Yönetici (ADMIN): Yönetim Paneli */}
            {activeRole === "ADMIN" && (
              <div className="space-y-1">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-2"
                >
                  <span>🛡️</span> Yönetim Paneli
                </Link>
                <Link
                  href="/admin/measurements"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 flex items-center gap-2 ml-2"
                >
                  <span>📐</span> Ölçü Birimleri (Measurement)
                </Link>
              </div>
            )}
          </div>

          {/* Giriş yapılmamışsa mobil giriş linkleri */}
          {!currentUser && (
            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700"
              >
                Giriş Yap
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm"
              >
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function Header({ initialUser }: { initialUser?: SessionUser | null }) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-50 w-full h-16 border-b border-gray-200 bg-white" />
      }
    >
      <HeaderContent initialUser={initialUser} />
    </Suspense>
  );
}
