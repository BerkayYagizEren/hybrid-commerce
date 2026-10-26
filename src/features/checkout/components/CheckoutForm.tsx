"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import type { PaymentCardData } from "@/features/payment/types";

export interface CheckoutFormData {
  // Teslimat Bilgileri
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  postalCode: string;

  // Kart Bilgileri
  paymentCard: PaymentCardData;
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function CheckoutForm({ onSubmit, isLoading, errorMessage }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    fullName: "Ahmet Yılmaz",
    email: "ahmet@example.com",
    phone: "+90 532 555 0123",
    addressLine1: "Barbaros Bulvarı No: 42 Daire: 8",
    city: "İstanbul",
    postalCode: "34349",
  });

  const [cardData, setCardData] = useState<PaymentCardData>({
    cardHolder: "AHMET YILMAZ",
    cardNumber: "4242 4242 4242 4242",
    expireMonth: "12",
    expireYear: "2028",
    cvc: "123",
  });

  const [expiryInput, setExpiryInput] = useState("12/28");
  const [clientError, setClientError] = useState<string | null>(null);

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Kart Numarası Formatlama (4'lü gruplar)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardData((prev) => ({ ...prev, cardNumber: formatted }));
  };

  // Son Kullanma Tarihi Formatlama (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setExpiryInput(val);

    const parts = val.split("/");
    const month = parts[0] || "";
    let year = parts[1] || "";
    if (year.length === 2) {
      year = `20${year}`;
    }
    setCardData((prev) => ({
      ...prev,
      expireMonth: month,
      expireYear: year,
    }));
  };

  // Hızlı Sandbox Test Kartları
  const applyTestCard = (scenario: "SUCCESS" | "INSUFFICIENT" | "EXPIRED" | "BAD_CVC") => {
    setClientError(null);
    if (scenario === "SUCCESS") {
      setCardData({
        cardHolder: "AHMET YILMAZ",
        cardNumber: "4242 4242 4242 4242",
        expireMonth: "12",
        expireYear: "2028",
        cvc: "123",
      });
      setExpiryInput("12/28");
    } else if (scenario === "INSUFFICIENT") {
      setCardData({
        cardHolder: "YETERSIZ BAKIYE KARTI",
        cardNumber: "4000 0000 0000 0002",
        expireMonth: "08",
        expireYear: "2029",
        cvc: "456",
      });
      setExpiryInput("08/29");
    } else if (scenario === "EXPIRED") {
      setCardData({
        cardHolder: "SURESI GECMIS KART",
        cardNumber: "4000 0000 0000 0110",
        expireMonth: "01",
        expireYear: "2023",
        cvc: "789",
      });
      setExpiryInput("01/23");
    } else if (scenario === "BAD_CVC") {
      setCardData({
        cardHolder: "HATALI CVC KARTI",
        cardNumber: "4000 0000 0000 0127",
        expireMonth: "05",
        expireYear: "2027",
        cvc: "000",
      });
      setExpiryInput("05/27");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    // Temel istemci kontrolleri
    const rawNumber = cardData.cardNumber.replace(/\s/g, "");
    if (rawNumber.length < 15) {
      setClientError("Lütfen 16 haneli kart numaranızı eksiksiz giriniz.");
      return;
    }
    if (!cardData.expireMonth || !cardData.expireYear) {
      setClientError("Lütfen son kullanma tarihini (Ay/Yıl) giriniz.");
      return;
    }
    if (cardData.cvc.length < 3) {
      setClientError("Lütfen kartınızın arkasındaki 3 haneli güvenlik kodunu (CVC) giriniz.");
      return;
    }

    onSubmit({
      ...formData,
      paymentCard: cardData,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs";

  const displayError = clientError || errorMessage;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hata Bildirimi */}
      {displayError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs animate-shake">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold">Ödeme Başarısız</p>
              <p className="mt-0.5 text-xs text-red-700 leading-relaxed">{displayError}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. TESLİMAT BİLGİLERİ
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="text-lg">📍</span>
          <h3 className="text-base font-bold text-gray-900">Teslimat Adresi</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Ad Soyad
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleDeliveryChange}
              required
              className={inputClass}
              placeholder="Ad Soyad"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              E-posta Adresi
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleDeliveryChange}
              required
              className={inputClass}
              placeholder="ornek@email.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Telefon Numarası
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleDeliveryChange}
            required
            className={inputClass}
            placeholder="+90 5XX XXX XX XX"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Açık Adres
          </label>
          <input
            type="text"
            name="addressLine1"
            value={formData.addressLine1}
            onChange={handleDeliveryChange}
            required
            className={inputClass}
            placeholder="Mahalle, Cadde, Sokak, Bina ve Daire No"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Şehir
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleDeliveryChange}
              required
              className={inputClass}
              placeholder="İstanbul"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Posta Kodu
            </label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleDeliveryChange}
              required
              className={inputClass}
              placeholder="34000"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KART VE ÖDEME BİLGİLERİ (IYZICO / STRIPE SANDBOX)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <h3 className="text-base font-bold text-gray-900">Kart ile Güvenli Ödeme</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <span>🔒</span> 256-Bit SSL &amp; Escrow
          </div>
        </div>

        {/* Sandbox Test Kartları Seçici Butonları */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            🧪 Sandbox Test Senaryosu Seç:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => applyTestCard("SUCCESS")}
              className="rounded-lg border border-emerald-300 bg-emerald-50/70 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100 cursor-pointer text-center"
            >
              ✅ Başarılı Kart
            </button>
            <button
              type="button"
              onClick={() => applyTestCard("INSUFFICIENT")}
              className="rounded-lg border border-amber-300 bg-amber-50/70 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 cursor-pointer text-center"
            >
              ⚠️ Yetersiz Bakiye
            </button>
            <button
              type="button"
              onClick={() => applyTestCard("BAD_CVC")}
              className="rounded-lg border border-red-300 bg-red-50/70 px-2.5 py-1.5 text-[11px] font-bold text-red-800 transition hover:bg-red-100 cursor-pointer text-center"
            >
              ❌ Hatalı CVC
            </button>
            <button
              type="button"
              onClick={() => applyTestCard("EXPIRED")}
              className="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-100 cursor-pointer text-center"
            >
              📅 Süresi Geçmiş
            </button>
          </div>
        </div>

        {/* Kart Sahibi */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Kart Üzerindeki İsim
          </label>
          <input
            type="text"
            name="cardHolder"
            value={cardData.cardHolder}
            onChange={(e) =>
              setCardData((prev) => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))
            }
            required
            className={inputClass}
            placeholder="AD SOYAD"
          />
        </div>

        {/* Kart Numarası */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Kart Numarası
          </label>
          <div className="relative">
            <input
              type="text"
              name="cardNumber"
              value={cardData.cardNumber}
              onChange={handleCardNumberChange}
              required
              maxLength={19}
              className={`${inputClass} font-mono tracking-wider pl-10`}
              placeholder="0000 0000 0000 0000"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">💳</span>
          </div>
        </div>

        {/* SKT & CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Son Kullanma Tarihi
            </label>
            <input
              type="text"
              value={expiryInput}
              onChange={handleExpiryChange}
              required
              maxLength={5}
              className={`${inputClass} font-mono text-center`}
              placeholder="AA/YY"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Güvenlik Kodu (CVC)
            </label>
            <input
              type="password"
              name="cvc"
              value={cardData.cvc}
              onChange={(e) =>
                setCardData((prev) => ({
                  ...prev,
                  cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
              required
              maxLength={4}
              className={`${inputClass} font-mono text-center`}
              placeholder="123"
            />
          </div>
        </div>
      </div>

      {/* Onay & Ödeme Butonu */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Ödeme ve Depozito Blokajı İşleniyor...
          </span>
        ) : (
          "🔒 Siparişi Onayla ve Ödemeyi Tamamla"
        )}
      </Button>
    </form>
  );
}
