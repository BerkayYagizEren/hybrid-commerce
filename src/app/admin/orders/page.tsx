"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/shared/utils/format";

export default function AdminOrdersPage() {
  const orders = [
    {
      id: "ORD-2026-9842",
      customer: "Ahmet Yılmaz",
      email: "ahmet@example.com",
      itemsSummary: '1x Sony A7 IV (Kiralık) + 1x MacBook Pro 16" (Satış)',
      type: "BOTH",
      totalAmount: 94499,
      depositAmount: 5000,
      status: "PROCESSING",
      date: "2026-10-24T14:30:00Z",
    },
    {
      id: "ORD-2026-9841",
      customer: "Elif Demir",
      email: "elif@example.com",
      itemsSummary: "1x 4 Mevsim Kamp Çadırı (Kiralık: 7 Gün)",
      type: "RENTAL",
      totalAmount: 1500,
      depositAmount: 2000,
      status: "CONFIRMED",
      date: "2026-10-24T11:20:00Z",
    },
    {
      id: "ORD-2026-9840",
      customer: "Caner Öztürk",
      email: "caner@example.com",
      itemsSummary: '1x MacBook Pro 16" (Satış)',
      type: "SALE",
      totalAmount: 84999,
      depositAmount: 0,
      status: "DELIVERED",
      date: "2026-10-23T16:45:00Z",
    },
    {
      id: "ORD-2026-9839",
      customer: "Zeynep Kaya",
      email: "zeynep@example.com",
      itemsSummary: "1x Sony A7 IV (Kiralık: 7 Gün)",
      type: "RENTAL",
      totalAmount: 4500,
      depositAmount: 5000,
      status: "COMPLETED",
      date: "2026-10-22T09:10:00Z",
    },
    {
      id: "ORD-2026-9838",
      customer: "Burak Şen",
      email: "burak@example.com",
      itemsSummary: "2x 4 Mevsim Kamp Çadırı (Satış)",
      type: "SALE",
      totalAmount: 25000,
      depositAmount: 0,
      status: "COMPLETED",
      date: "2026-10-20T14:10:00Z",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Üst Kısım */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              🛡️ Yönetici Sipariş Listesi
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            Tüm Platform Siparişleri &amp; Rezervasyonları
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Satış ve kiralama modeli kapsamındaki tüm sipariş kalemlerini denetleyin.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700"
        >
          📊 Yönetim Paneline Dön
        </Link>
      </div>

      {/* Sipariş Tablosu */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Sipariş ID</th>
                <th className="px-6 py-4">Müşteri</th>
                <th className="px-6 py-4">İçerik Özeti</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4">Tutar &amp; Depozito</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {o.id}
                    <span className="block text-[11px] font-normal text-gray-400">
                      {formatDate(o.date)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{o.customer}</p>
                    <span className="text-xs text-gray-400">{o.email}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 max-w-xs">{o.itemsSummary}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                        o.type === "BOTH"
                          ? "bg-blue-100 text-blue-800"
                          : o.type === "RENTAL"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {o.type === "BOTH" ? "Hibrit" : o.type === "RENTAL" ? "Kiralama" : "Satış"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">{formatCurrency(o.totalAmount)}</p>
                    {o.depositAmount > 0 && (
                      <p className="text-[11px] font-semibold text-purple-700">
                        Depozito: {formatCurrency(o.depositAmount)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        o.status === "DELIVERED" || o.status === "COMPLETED"
                          ? "bg-gray-100 text-gray-700"
                          : o.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Sipariş ${o.id} detay modalı.`)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      İncele
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
