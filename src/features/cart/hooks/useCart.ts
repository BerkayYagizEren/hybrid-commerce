"use client";

import { useCartContext, type CartContextType } from "../context/CartContext";
export type UseCartReturn = CartContextType;

/**
 * Global sepet yönetimi için tek yetkili hook.
 * CartProvider bağlamındaki tek ve merkezi sepet durumunu döner.
 */
export function useCart(): CartContextType {
  return useCartContext();
}

export default useCart;
