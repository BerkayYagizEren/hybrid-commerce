"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { formatCurrency } from "@/shared/utils/format";
import { RentalCalendar } from "@/features/rental/components/RentalCalendar";
import { RentalPriceSummary } from "@/features/rental/components/RentalPriceSummary";
import type { SerializedProduct } from "../types";

interface ProductDetailProps {
  product: SerializedProduct;
}

/**
 * Ürün Detay Bileşeni
 * Ürün tipine göre satış veya kiralama arayüzünü gösterir.
 * BOTH tipindeki ürünler için tab ile geçiş yapılabilir.
 */
export function ProductDetail({ product }: ProductDetailProps) {
  const [activeTab, setActiveTab] = useState<"sale" | "rental">(
    product.type === "RENTAL" ? "rental" : "sale"
  );
  const [quantity, setQuantity] = useState(1);
  const [rentalDates, setRentalDates] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const images = product.images && product.images.length > 0 ? product.images : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const activeImage = images[selectedImageIndex] || "";

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSale = product.type === "SALE" || product.type === "BOTH";
  const canRental = product.type === "RENTAL" || product.type === "BOTH";
  const availableStock =
    (product.inventory?.totalStock ?? 0) - (product.inventory?.reservedStock ?? 0);

  const handleAddToCart = async () => {
    setIsSubmitting(true);
    const payload: Record<string, unknown> = {
      productId: product.id,
      type: activeTab === "sale" ? "SALE" : "RENTAL",
    };

    if (activeTab === "sale") {
      payload.quantity = quantity;
    } else {
      if (!rentalDates.start || !rentalDates.end) {
        alert("Lütfen kiralama tarihlerini seçin");
        setIsSubmitting(false);
        return;
      }
      payload.rentalStart = rentalDates.start.toISOString();
      payload.rentalEnd = rentalDates.end.toISOString();
    }

    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Ürün başarıyla sepete eklendi!");
      } else {
        const data = await res.json();
        alert(data.error || "Bir hata oluştu");
      }
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Sol: Ürün Görseli Galerisi & Slider */}
      <div className="flex flex-col gap-3">
        <div className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-md">
          {activeImage ? (
            <img
              src={activeImage}
              alt={`${product.name} - Görsel ${selectedImageIndex + 1}`}
              className="h-full w-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <svg className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Slider Prev / Next Kontrolleri */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Önceki Görsel"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs transition hover:bg-black/80 hover:scale-110 cursor-pointer shadow-md opacity-90 group-hover:opacity-100"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Sonraki Görsel"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs transition hover:bg-black/80 hover:scale-110 cursor-pointer shadow-md opacity-90 group-hover:opacity-100"
              >
                ›
              </button>
              {/* Sayfa İndikatörü */}
              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                {selectedImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Galerisi (Birden fazla resim varsa) */}
        {images.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                  selectedImageIndex === idx
                    ? "border-purple-600 scale-105 shadow-md ring-2 ring-purple-300"
                    : "border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100"
                }`}
              >
                <img src={img} alt={`Küçük Görsel ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sağ: Ürün Bilgileri ve Eylem Alanları */}
      <div className="flex flex-col">
        <div className="mb-2">
          <Badge
            variant={product.type.toLowerCase() as "sale" | "rental" | "both"}
          >
            {product.type === "SALE"
              ? "Satılık"
              : product.type === "RENTAL"
              ? "Kiralık"
              : "Satılık & Kiralık"}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {product.name}
        </h1>

        {(product.category || product.subCategory) && (
          <nav className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Link href="/products" className="hover:text-blue-600 transition">
              Ürünler
            </Link>
            {product.category && (
              <>
                <span className="text-gray-300">/</span>
                <Link
                  href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                  className="hover:text-blue-600 transition"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            {product.subCategory && (
              <>
                <span className="text-gray-300">/</span>
                <Link
                  href={`/products?category=${encodeURIComponent(
                    product.category?.slug || ""
                  )}&subcategory=${encodeURIComponent(product.subCategory.slug)}`}
                  className="text-blue-600 font-semibold hover:underline transition"
                >
                  {product.subCategory.name}
                </Link>
              </>
            )}
          </nav>
        )}

        {product.description && (
          <p className="mt-4 text-gray-600 leading-relaxed">{product.description}</p>
        )}

        {/* Satış / Kiralama Tabları (BOTH tipi için) */}
        {product.type === "BOTH" && (
          <div className="mt-6 flex rounded-xl bg-gray-100 p-1.5 ring-1 ring-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("sale")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                activeTab === "sale"
                  ? "bg-white text-emerald-700 shadow-md ring-1 ring-emerald-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              💰 Satın Al
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rental")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                activeTab === "rental"
                  ? "bg-white text-purple-700 shadow-md ring-1 ring-purple-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📅 Kirala
            </button>
          </div>
        )}

        {/* Satış Paneli */}
        {activeTab === "sale" && canSale && (
          <div className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-3xl font-extrabold text-emerald-600">
                {formatCurrency(Number(product.salePrice ?? 0))}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Stok Durumu:{" "}
                <span className={availableStock > 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                  {availableStock > 0 ? `${availableStock} adet mevcut` : "Tükendi"}
                </span>
              </p>
            </div>

            {/* Miktar Seçici */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Satın Alınacak Adet:</label>
              <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition-colors font-bold"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-bold text-gray-800">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="px-3.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition-colors font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Satın Alma Butonu */}
            <Button
              size="lg"
              variant="sale"
              className="w-full text-base font-bold py-3.5 shadow-md cursor-pointer"
              disabled={availableStock <= 0 || isSubmitting}
              onClick={handleAddToCart}
            >
              {availableStock > 0 ? "🛒 Satın Al & Sepete Ekle" : "Stokta Yok"}
            </Button>
          </div>
        )}

        {/* Kiralama Paneli */}
        {activeTab === "rental" && canRental && product.rentalPricing && (
          <div className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-extrabold text-purple-700">
                  {formatCurrency(Number(product.rentalPricing.dailyPrice))}
                  <span className="text-sm font-medium text-gray-500"> / gün</span>
                </p>
                {product.rentalPricing.weeklyPrice && (
                  <p className="mt-0.5 text-xs text-gray-500 font-medium">
                    Haftalık İndirimli: {formatCurrency(Number(product.rentalPricing.weeklyPrice))}
                  </p>
                )}
              </div>
              {product.rentalPricing.depositAmount > 0 && (
                <div className="text-right">
                  <span className="inline-block rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                    Depozito: {formatCurrency(Number(product.rentalPricing.depositAmount))}
                  </span>
                </div>
              )}
            </div>

            {/* Kiralama Takvimi & Tarih Seçici */}
            <RentalCalendar
              productId={product.id}
              minDays={product.rentalPricing.minDays}
              maxDays={product.rentalPricing.maxDays}
              onDateSelect={(start, end) => setRentalDates({ start, end })}
            />

            {/* Fiyat Özeti Kırılımı */}
            {rentalDates.start && rentalDates.end && (
              <RentalPriceSummary
                dailyPrice={Number(product.rentalPricing.dailyPrice)}
                weeklyPrice={
                  product.rentalPricing.weeklyPrice
                    ? Number(product.rentalPricing.weeklyPrice)
                    : undefined
                }
                monthlyPrice={
                  product.rentalPricing.monthlyPrice
                    ? Number(product.rentalPricing.monthlyPrice)
                    : undefined
                }
                depositAmount={Number(product.rentalPricing.depositAmount)}
                startDate={rentalDates.start}
                endDate={rentalDates.end}
              />
            )}

            {/* Kiralama Butonu */}
            <Button
              size="lg"
              variant="rental"
              className="w-full text-base font-bold py-3.5 shadow-md cursor-pointer"
              disabled={!rentalDates.start || !rentalDates.end || isSubmitting}
              onClick={handleAddToCart}
            >
              {rentalDates.start && rentalDates.end
                ? "📅 Kiralama Sepetine Ekle"
                : "📅 Lütfen Kiralama Tarih Aralığı Seçin"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
