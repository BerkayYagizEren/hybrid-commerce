"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/hooks/useCart";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";

export function CartDrawer() {
  const router = useRouter();
  const {
    isCartOpen,
    setIsCartOpen,
    items,
    itemCount,
    summary,
    removeItem,
    updateQuantity,
  } = useCart();

  if (!isCartOpen) return null;

  const handleNavigate = (path: string) => {
    setIsCartOpen(false);
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Arka plan karartması */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col">
          {/* Drawer Başlığı */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛍️</span>
              <h2 className="text-lg font-bold text-gray-900">
                Sepetim ({itemCount} Ürün)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Kalemler Listesi */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl">🛒</span>
                <p className="mt-4 text-base font-bold text-gray-900">Sepetiniz Boş</p>
                <p className="mt-1 text-xs text-gray-500 max-w-xs">
                  Henüz sepetinize bir ürün eklemediniz. Ürünleri keşfetmeye başlayın!
                </p>
                <Button
                  onClick={() => handleNavigate("/products")}
                  className="mt-5 rounded-xl text-xs font-bold"
                >
                  Alışverişe Başla
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 p-3 transition hover:border-gray-200"
                >
                  <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl bg-white border border-gray-100">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        📷
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                          {item.productName}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 text-xs cursor-pointer"
                          title="Kaldır"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge
                          variant={item.type.toLowerCase() as "sale" | "rental"}
                          className="text-[9px] px-1.5 py-0.2"
                        >
                          {item.type === "SALE" ? "Satın Alma" : "Kiralama"}
                        </Badge>
                        {item.type === "RENTAL" && item.rentalDays && (
                          <span className="text-[10px] text-purple-700 font-semibold">
                            {item.rentalDays} Gün
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                      {item.type === "SALE" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-6 w-6 rounded border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-gray-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-6 w-6 rounded border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-500">Adet: 1</span>
                      )}
                      <span className="text-xs font-extrabold text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Alt Kısım: Fiyat Özeti & Butonlar */}
          {items.length > 0 && summary && (
            <div className="border-t border-gray-100 bg-white p-6 space-y-4">
              <div className="space-y-1.5 text-xs text-gray-600">
                {summary.saleSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span>Satış Toplamı</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(summary.saleSubtotal)}
                    </span>
                  </div>
                )}
                {summary.rentalSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span>Kiralama Toplamı</span>
                    <span className="font-semibold text-purple-700">
                      {formatCurrency(summary.rentalSubtotal)}
                    </span>
                  </div>
                )}
                {summary.totalDeposit > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Depozito Blokajı (İadeli)</span>
                    <span className="font-semibold">
                      +{formatCurrency(summary.totalDeposit)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2 text-sm font-extrabold text-gray-900">
                  <span>Genel Toplam</span>
                  <span>{formatCurrency(summary.grandTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => handleNavigate("/cart")}
                  className="rounded-xl text-xs font-bold"
                >
                  Sepete Git
                </Button>
                <Button
                  onClick={() => handleNavigate("/checkout")}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
                >
                  Ödemeye Geç →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartDrawer;
