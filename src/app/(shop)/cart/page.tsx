"use client";

import { useCart } from "@/features/cart/hooks/useCart";
import { CartItemComponent } from "@/features/cart/components/CartItem";
import { CartSummaryComponent } from "@/features/cart/components/CartSummary";
import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";

export default function CartPage() {
  const { summary, isLoading, removeItem, updateQuantity } = useCart();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500">Sepetiniz yükleniyor...</p>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-5xl">
          🛒
        </div>
        <h2 className="mt-6 text-2xl font-extrabold text-gray-900">Sepetiniz Boş</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Sepetinizde henüz ürün bulunmuyor. Satın almak veya kiralamak istediğiniz ürünleri keşfetmeye hemen başlayın!
        </p>
        <div className="mt-6">
          <Link href="/products">
            <Button size="lg" className="rounded-xl px-8 font-bold shadow-md cursor-pointer">
              Ürünleri Keşfet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Sepetim</h1>
          <p className="mt-1 text-xs text-gray-500">
            Sepetinizdeki satış ve kiralama kalemlerini yönetin.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
          {summary.itemCount} Kalem Ürün
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Sepet Kalemleri */}
        <div className="space-y-4 lg:col-span-2">
          {summary.items.map((item) => (
            <CartItemComponent
              key={item.id}
              item={item}
              onRemove={removeItem}
              onUpdateQuantity={updateQuantity}
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
