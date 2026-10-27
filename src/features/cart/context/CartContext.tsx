"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { CartSummary, AddToCartRequest, CartItemDisplay } from "../types";
import { useRole } from "@/shared/providers/RoleContext";

export interface CartContextType {
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

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useRole();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

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
      console.error("Sepet yenilenemedi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Kullanıcı giriş/çıkış veya rol değiştirdiğinde sepeti otomatik tazele
  useEffect(() => {
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== user?.id) {
      refresh();
    }
    prevUserIdRef.current = user?.id;
  }, [user?.id, refresh]);

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
      } catch (err) {
        console.error("Sepete ekleme hatası:", err);
        return false;
      }
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      // İyimser UI güncellemesi: Kullanıcıya anında görsel yanıt ver
      setSummary((prev) => {
        if (!prev) return prev;
        const filteredItems = prev.items.filter((it) => it.id !== itemId);
        const removedItem = prev.items.find((it) => it.id === itemId);
        if (!removedItem) return prev;

        const saleSubtotal =
          removedItem.type === "SALE"
            ? Math.max(0, prev.saleSubtotal - removedItem.totalPrice)
            : prev.saleSubtotal;
        const rentalSubtotal =
          removedItem.type === "RENTAL"
            ? Math.max(0, prev.rentalSubtotal - removedItem.totalPrice)
            : prev.rentalSubtotal;
        const totalDeposit =
          removedItem.type === "RENTAL"
            ? Math.max(0, prev.totalDeposit - (removedItem.depositAmount ?? 0))
            : prev.totalDeposit;

        return {
          items: filteredItems,
          itemCount: filteredItems.length,
          saleSubtotal,
          rentalSubtotal,
          totalDeposit,
          grandTotal: saleSubtotal + rentalSubtotal + totalDeposit,
        };
      });

      try {
        const res = await fetch(`/api/cart/items?itemId=${itemId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.summary) {
            setSummary(data.summary);
            return;
          }
        }
        await refresh();
      } catch (err) {
        console.error("Sepetten ürün silme hatası:", err);
        await refresh();
      }
    },
    [refresh]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        const res = await fetch("/api/cart/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, quantity }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.summary) {
            setSummary(data.summary);
          } else {
            await refresh();
          }
        }
      } catch (err) {
        console.error("Miktar güncelleme hatası:", err);
        await refresh();
      }
    },
    [refresh]
  );

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const items = summary?.items || [];
  const itemCount = summary?.itemCount || 0;

  return (
    <CartContext.Provider
      value={{
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
        addToCart: addItem, // Her iki isimle de çağrılabilir
        removeItem,
        updateQuantity,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}
