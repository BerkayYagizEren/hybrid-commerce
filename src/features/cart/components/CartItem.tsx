"use client";

import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import type { CartItemDisplay } from "../types";

interface CartItemComponentProps {
  item: CartItemDisplay;
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

export function CartItemComponent({
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemComponentProps) {
  return (
    <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* Ürün Görseli */}
      <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100">
        <div className="flex h-full items-center justify-center text-gray-300">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>

      {/* Detaylar */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{item.productName}</h3>
            <Badge variant={item.type === "SALE" ? "sale" : "rental"} className="mt-1">
              {item.type === "SALE" ? "Satın Alma" : "Kiralama"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
            ✕
          </Button>
        </div>

        {/* Satış kalemi detayları */}
        {item.type === "SALE" && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="rounded border px-2 py-0.5 text-sm hover:bg-gray-50"
              >
                −
              </button>
              <span className="text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="rounded border px-2 py-0.5 text-sm hover:bg-gray-50"
              >
                +
              </button>
            </div>
            <p className="text-sm font-bold text-sale-600">
              {formatCurrency(item.totalPrice)}
            </p>
          </div>
        )}

        {/* Kiralama kalemi detayları */}
        {item.type === "RENTAL" && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              📅 {item.rentalStart ? formatDate(item.rentalStart) : ""} →{" "}
              {item.rentalEnd ? formatDate(item.rentalEnd) : ""}{" "}
              <span className="font-medium">({item.rentalDays} gün)</span>
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                + {formatCurrency(item.depositAmount ?? 0)} depozito
              </span>
              <p className="text-sm font-bold text-rental-600">
                {formatCurrency(item.totalPrice)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
