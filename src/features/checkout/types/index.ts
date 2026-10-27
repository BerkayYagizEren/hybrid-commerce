import type { OrderStatus } from "@prisma/client";
import type { PaymentCardData } from "@/features/payment/types";

/** Checkout (ödeme) isteği */
export interface CheckoutRequest {
  userId: string;
  cartId: string;
  paymentMethod?: "CREDIT_CARD" | "B2B_CREDIT";
  /** Kart ödeme bilgileri (Stripe / Iyzico Sandbox) */
  paymentCard?: PaymentCardData;
  shippingAddress?: ShippingAddress;
  /** İndirim Kupon Kodu */
  couponCode?: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
  phone: string;
  email?: string;
}

/** Checkout sonucu */
export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  productTotal?: number;
  depositTotal?: number;
  paymentId?: string;
  transactionId?: string;
  depositHoldId?: string;
  cardLast4?: string;
  cardBrand?: string;
  error?: string;
}
