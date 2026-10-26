import type { RentalStatus } from "@prisma/client";

/** Kiralama fiyat hesaplama sonucu */
export interface RentalPriceCalculation {
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  depositAmount: number;
  grandTotal: number;
  /** Uygulanan tarife detayı */
  breakdown: PriceBreakdownItem[];
}

export interface PriceBreakdownItem {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Müsaitlik kontrol isteği */
export interface AvailabilityCheckRequest {
  productId: string;
  startDate: string;
  endDate: string;
}

/** Müsaitlik kontrol sonucu */
export interface AvailabilityCheckResult {
  available: boolean;
  productId: string;
  requestedStart: Date;
  requestedEnd: Date;
  /** Çakışan mevcut kiralama varsa bilgisi */
  conflicts?: Array<{
    startDate: Date;
    endDate: Date;
  }>;
}

/** Kiralama detay bilgisi */
export interface RentalDetail {
  id: string;
  productName: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  totalPrice: number;
  depositAmount: number;
  status: RentalStatus;
}
