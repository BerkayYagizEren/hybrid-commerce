export type PaymentMethodType = "CREDIT_CARD";

export interface PaymentCardData {
  cardHolder: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

export interface PaymentProcessingRequest {
  orderId: string;
  userId: string;
  grandTotal: number;
  productTotal: number;
  depositTotal: number;
  rentalIds?: string[];
  card: PaymentCardData;
  provider?: "STRIPE" | "IYZICO" | "SANDBOX";
}

export interface PaymentProcessingResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  depositHoldId?: string;
  status: "SUCCEEDED" | "FAILED" | "AUTHORIZED";
  cardLast4?: string;
  cardBrand?: string;
  error?: string;
  provider: "STRIPE" | "IYZICO" | "SANDBOX";
  receipt?: {
    chargedAmount: number;
    heldDepositAmount: number;
    totalPaid: number;
    currency: string;
  };
}

export interface EscrowReleaseResponse {
  success: boolean;
  rentalId: string;
  releaseTxId?: string;
  refundedDepositAmount: number;
  customerName?: string;
  message: string;
  error?: string;
}
