"use client";

import { useEffect, useState } from "react";
import { CartItemComponent } from "@/features/cart/components/CartItem";
import { CartSummaryComponent } from "@/features/cart/components/CartSummary";
import type { CartSummary } from "@/features/cart/types";

export default function CartPage() {
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Sepet yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemove = async (itemId: string) => {
    await fetch(`/api/cart/items?itemId=${itemId}`, { method: "DELETE" });
    fetchCart();
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    await fetch("/api/cart/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    fetchCart();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-gray-500">Sepet yükleniyor...</p>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-5xl">🛒</p>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Sepetiniz Boş</h2>
        <p className="mt-2 text-gray-500">
          Satılık veya kiralık ürünler ekleyerek başlayın.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Sepetim</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Sepet Kalemleri */}
        <div className="space-y-4 lg:col-span-2">
          {summary.items.map((item) => (
            <CartItemComponent
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onUpdateQuantity={handleUpdateQuantity}
            />
          ))}
        </div>

        {/* Sepet Özeti */}
        <div>
          <CartSummaryComponent summary={summary} />
        </div>
      </div>
    </div>
  );
}
