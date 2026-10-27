"use client";

import { useContext, useState, useCallback, useEffect } from "react";
import { createContext } from "react";
import type { CartSummary, AddToCartRequest, CartItemDisplay } from "../types";

export interface UseCartReturn {
  summary: CartSummary | null;
  items: CartItemDisplay[];
  itemCount: number;
  cartId: string | null;
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addItem: (request: AddToCartRequest) => Promise<boolean>;
  addToCart: (request: AddToCartRequest) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
}

// Fallback context import if present
import { useCartContext } from "../context/CartContext";

/**
 * Sepet yönetimi için hook.
 * Eğer CartProvider altındaysa global context'i, değilse bağımsız fallback hook'u döner.
 */
export function useCart(): UseCartReturn {
  try {
    const context = useCartContext();
    if (context) return context;
  } catch {
    // Provider dışı çağrılarda fallback hook'a geç
  }

  // Fallback Local Hook
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCartId(data.cartId);
        setSummary(data.summary);
      }
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
          const data = await res.json();
          if (data.summary) {
            setSummary(data.summary);
          } else {
            await refresh();
          }
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

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const items = summary?.items || [];
  const itemCount = summary?.itemCount || 0;

  return {
    summary,
    items,
    itemCount,
    cartId,
    isLoading,
    isCartOpen,
    setIsCartOpen,
    openCart,
    closeCart,
    addItem,
    addToCart: addItem,
    removeItem,
    updateQuantity,
    refresh,
  };
}

export default useCart;
