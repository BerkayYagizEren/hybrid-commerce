import type { OrderStatus, OrderItemType } from "@prisma/client";

/** Sipariş detay gösterimi */
export interface OrderDisplay {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemDisplay[];
  createdAt: Date;
}

export interface OrderItemDisplay {
  id: string;
  productName: string;
  productImage: string;
  type: OrderItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceAtPurchase?: number;
  /** Kiralama kalemi ise */
  rentalInfo?: {
    rentalId: string;
    startDate: Date;
    endDate: Date;
    status: string;
  };
}
