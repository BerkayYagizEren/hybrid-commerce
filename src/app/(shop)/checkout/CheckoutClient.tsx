"use client";

import { useState } from "react";
import { CheckoutForm, type CheckoutFormData } from "@/features/checkout/components/CheckoutForm";
import { OrderSummary } from "@/features/checkout/components/OrderSummary";
import type { CartSummary } from "@/features/cart/types";
import { formatCurrency } from "@/shared/utils/format";
import Link from "next/link";

interface CheckoutSuccessData {
  orderId: string;
  totalAmount: number;
  productTotal?: number;
  depositTotal?: number;
  transactionId?: string;
  depositHoldId?: string;
  cardLast4?: string;
  cardBrand?: string;
}

interface CheckoutClientProps {
  initialSummary: CartSummary | null;
}

export function CheckoutClient({ initialSummary }: CheckoutClientProps) {
  const [summary] = useState<CartSummary | null>(initialSummary);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CheckoutSuccessData | null>(null);

  const handleSubmit = async (formData: CheckoutFormData) => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            addressLine1: formData.addressLine1,
            city: formData.city,
            postalCode: formData.postalCode,
          },
          paymentCard: formData.paymentCard,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSuccessData(result);
      } else {
        setErrorMessage(
          result.error ||
            "Ödeme işlemi sırasında bir hata oluştu. Lütfen kart bilgilerinizi kontrol ediniz."
        );
      }
    } catch {
      setErrorMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      setProcessing(false);
    }
  };

  // Başarılı Sipariş ve Ödeme Onay Ekranı
  if (successData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 sm:p-10 shadow-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            🎉
          </div>

          <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold text-gray-900">
            Ödemeniz Başarıyla Alındı!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Siparişiniz onaylandı ve ödeme sağlayıcı (Stripe / Iyzico Sandbox) üzerinden tahsil edildi.
          </p>

          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50/80 p-6 text-left space-y-3">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Sipariş Numarası:</span>
              <span className="font-mono font-bold text-gray-800">{successData.orderId}</span>
            </div>

            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Ödeme Durumu:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ✅ PAID (Tahsil Edildi)
              </span>
            </div>

            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Tahsil Edilen Tutar:</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(successData.productTotal ?? successData.totalAmount)}
              </span>
            </div>

            {successData.depositTotal && successData.depositTotal > 0 ? (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Depozito Provizyonu (Escrow Hold):</span>
                <span className="font-bold text-purple-700">
                  {formatCurrency(successData.depositTotal)} (Bloke Edildi)
                </span>
              </div>
            ) : null}

            {successData.transactionId && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>İşlem Dekont No:</span>
                <span className="font-mono">{successData.transactionId}</span>
              </div>
            )}

            {successData.depositHoldId && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Escrow Hold ID:</span>
                <span className="font-mono">{successData.depositHoldId}</span>
              </div>
            )}

            {successData.cardLast4 && (
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                <span>Ödeme Yapan Kart:</span>
                <span className="font-medium">
                  {successData.cardBrand || "Kart"} (•••• {successData.cardLast4})
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              📦 Siparişlerime Git
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              Alışverişe Devam Et
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
          🛒
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Sepetiniz Boş</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ödeme yapabilmek için sepetinize en az bir satış veya kiralama ürünü eklemelisiniz.
        </p>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Ürünleri İncele
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Sayfa Başlığı ve Güvenlik Rozetleri */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Güvenli Ödeme &amp; Checkout
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Hibrit e-ticaret siparişinizi ve güvence depozitonuzu onaylayın.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              🛡️ Stripe / Iyzico Sandbox
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
        {/* Sol Kolon: Teslimat ve Kart Formu */}
        <div className="lg:col-span-7">
          <CheckoutForm
            onSubmit={handleSubmit}
            isLoading={processing}
            errorMessage={errorMessage}
          />
        </div>

        {/* Sağ Kolon: Sipariş ve Maliyet Özeti */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <OrderSummary summary={summary} />
        </div>
      </div>
    </div>
  );
}
