"use client";

import { useState, useCallback, useEffect } from "react";
import type { CartSummary, AddToCartRequest } from "../types";

interface UseCartReturn {
  summary: CartSummary | null;
  cartId: string | null;
  isLoading: boolean;
  addItem: (request: AddToCartRequest) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Sepet yönetimi için custom hook
 */
export function useCart(): UseCartReturn {
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCartId(data.cartId);
      setSummary(data.summary);
    } catch (err) {
      console.error("Sepet yüklenemedi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (request: AddToCartRequest): Promise<boolean> => {
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (res.ok) {
          await refresh();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await fetch(`/api/cart/items?itemId=${itemId}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      await fetch("/api/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      await refresh();
    },
    [refresh]
  );

  return {
    summary,
    cartId,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    refresh,
  };
}
