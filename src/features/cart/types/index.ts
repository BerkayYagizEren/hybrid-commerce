import type { CartItemType } from "@prisma/client";

/** Sepete ekleme isteği */
export interface AddToCartRequest {
  productId: string;
  type: CartItemType;
  quantity?: number;
  /** Kiralama için: başlangıç tarihi */
  rentalStart?: string;
  /** Kiralama için: bitiş tarihi */
  rentalEnd?: string;
}

/** İstemci tarafında sepet kalemi gösterimi */
export interface CartItemDisplay {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  type: CartItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** Kiralama alanları */
  rentalStart?: Date | null;
  rentalEnd?: Date | null;
  rentalDays?: number;
  depositAmount?: number;
}

/** Sepet özeti */
export interface CartSummary {
  items: CartItemDisplay[];
  saleSubtotal: number;
  rentalSubtotal: number;
  totalDeposit: number;
  grandTotal: number;
  itemCount: number;
}
