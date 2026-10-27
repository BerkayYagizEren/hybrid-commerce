"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/hooks/useCart";
import { formatCurrency } from "@/shared/utils/format";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import type { SerializedProduct } from "@/features/products/types";

export interface AddToCartModalProps {
  product: SerializedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultAction?: "SALE" | "RENTAL";
}

export function AddToCartModal({
  product,
  isOpen,
  onClose,
  onSuccess,
  defaultAction = "SALE",
}: AddToCartModalProps) {
  const router = useRouter();
  const { addToCart, setIsCartOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"SALE" | "RENTAL">("SALE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rentalStart, setRentalStart] = useState("");
  const [rentalEnd, setRentalEnd] = useState("");

  useEffect(() => {
    if (product) {
      if (product.type === "RENTAL") {
        setActiveTab("RENTAL");
      } else {
        setActiveTab(defaultAction);
      }
      setQuantity(1);
      // Varsayılan kiralama tarihleri (Yarın başla, 3 gün sonra bitir)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const after3Days = new Date();
      after3Days.setDate(after3Days.getDate() + 4);
      setRentalStart(tomorrow.toISOString().split("T")[0]);
      setRentalEnd(after3Days.toISOString().split("T")[0]);
    }
  }, [product, defaultAction, isOpen]);

  if (!isOpen || !product) return null;

  const canSale = product.type === "SALE" || product.type === "BOTH";
  const canRental = product.type === "RENTAL" || product.type === "BOTH";

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === "RENTAL") {
        if (!rentalStart || !rentalEnd) {
          alert("Lütfen kiralama başlangıç ve bitiş tarihlerini belirleyin.");
          setIsSubmitting(false);
          return;
        }
      }

      // 1. Ürünü sepete ekle (useCart addToCart)
      const success = await addToCart({
        productId: product.id,
        type: activeTab,
        quantity: activeTab === "SALE" ? quantity : 1,
        rentalStart: activeTab === "RENTAL" ? new Date(rentalStart).toISOString() : undefined,
        rentalEnd: activeTab === "RENTAL" ? new Date(rentalEnd).toISOString() : undefined,
      });

      if (success) {
        // 2. Modal'ı kapat (isOpen: false)
        onClose();

        // 3. Sepet Drawer'ını otomatik aç (setIsCartOpen(true))
        setIsCartOpen(true);

        onSuccess?.();
      } else {
        alert("Ürün sepete eklenirken bir sorun oluştu.");
      }
    } catch (err) {
      console.error("Sepete ekleme hatası:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Arka plan karartması */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Kutusu */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all animate-scale-up">
        {/* Üst Kısım: Başlık & Kapat Butonu */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h3 className="text-lg font-bold text-gray-900">Sepete Ekle</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Ürün Bilgi Kartı */}
        <div className="mt-4 flex gap-4 rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white border border-gray-200">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                📷
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <Badge
              variant={product.type.toLowerCase() as "sale" | "rental" | "both"}
              className="w-fit text-[10px] px-2 py-0.5"
            >
              {product.type === "SALE"
                ? "Satılık"
                : product.type === "RENTAL"
                ? "Kiralık"
                : "Satılık & Kiralık"}
            </Badge>
            <h4 className="mt-1 font-semibold text-sm text-gray-900 line-clamp-1">
              {product.name}
            </h4>
            <div className="mt-1 text-sm font-bold text-gray-900">
              {activeTab === "SALE" && product.salePrice && (
                <span>{formatCurrency(Number(product.salePrice))}</span>
              )}
              {activeTab === "RENTAL" && product.rentalPricing && (
                <span className="text-purple-700">
                  {formatCurrency(Number(product.rentalPricing.dailyPrice))}
                  <span className="text-xs font-normal text-gray-500"> / gün</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BOTH Tipindeki Ürünler İçin Satın Al / Kirala Sekmeleri */}
        {product.type === "BOTH" && (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("SALE")}
              className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "SALE"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🛍️ Satın Al (
              {product.salePrice ? formatCurrency(Number(product.salePrice)) : ""}
              )
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("RENTAL")}
              className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "RENTAL"
                  ? "bg-white text-purple-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📅 Kirala (
              {product.rentalPricing?.dailyPrice
                ? `${formatCurrency(Number(product.rentalPricing.dailyPrice))}/gün`
                : ""}
              )
            </button>
          </div>
        )}

        {/* Satış Modu Seçenekleri: Adet */}
        {activeTab === "SALE" && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
            <span className="text-sm font-medium text-gray-700">Adet Belirleyin:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Kiralama Modu Seçenekleri: Tarih Aralığı */}
        {activeTab === "RENTAL" && (
          <div className="mt-4 space-y-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3.5">
            <span className="block text-xs font-bold text-purple-900">
              Kiralama Tarih Aralığı:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Başlangıç
                </label>
                <input
                  type="date"
                  value={rentalStart}
                  onChange={(e) => setRentalStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Bitiş
                </label>
                <input
                  type="date"
                  value={rentalEnd}
                  onChange={(e) => setRentalEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            {product.rentalPricing?.depositAmount && product.rentalPricing.depositAmount > 0 && (
              <p className="text-[11px] text-purple-700 font-medium">
                🔒 {formatCurrency(Number(product.rentalPricing.depositAmount))} depozito bedeli teslimatta iade edilmek üzere geçici provizyon altına alınacaktır.
              </p>
            )}
          </div>
        )}

        {/* Alt Eylem Butonları */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 text-xs font-semibold"
          >
            Vazgeç
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`rounded-xl px-6 text-xs font-bold shadow-md cursor-pointer ${
              activeTab === "RENTAL"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isSubmitting ? "Ekleniyor..." : "✓ Sepete Ekle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddToCartModal;
