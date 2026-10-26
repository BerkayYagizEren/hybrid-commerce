"use client";

import { Button } from "@/shared/components/ui/Button";
import { formatCurrency } from "@/shared/utils/format";
import type { CartSummary as CartSummaryType } from "../types";
import Link from "next/link";

interface CartSummaryProps {
  summary: CartSummaryType;
}

export function CartSummaryComponent({ summary }: CartSummaryProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-bold text-gray-900">Sipariş Özeti</h3>

      <div className="mt-4 space-y-3">
        {summary.saleSubtotal > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">💰 Satın Alma</span>
            <span className="font-medium text-sale-600">
              {formatCurrency(summary.saleSubtotal)}
            </span>
          </div>
        )}

        {summary.rentalSubtotal > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">📅 Kiralama</span>
            <span className="font-medium text-rental-600">
              {formatCurrency(summary.rentalSubtotal)}
            </span>
          </div>
        )}

        {summary.totalDeposit > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">🔒 Depozito (iade edilir)</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(summary.totalDeposit)}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">Genel Toplam</span>
            <span className="text-xl font-bold text-primary-600">
              {formatCurrency(summary.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      <Link href="/checkout" className="mt-6 block">
        <Button size="lg" className="w-full">
          Ödemeye Geç ({summary.itemCount} ürün)
        </Button>
      </Link>

      <p className="mt-3 text-center text-xs text-gray-400">
        Kiralama depozitoları ürün iadesi sonrasında hesabınıza geri yatırılır.
      </p>
    </div>
  );
}
