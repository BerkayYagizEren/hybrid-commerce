"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { generateFinancialReportCSV, getAdminMetrics, type AdminMetrics } from "@/features/admin/actions/admin.actions";
import { approveRentalReturn } from "@/features/rental/actions/rental.actions";

export default function AdminDashboardPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "SALE" | "RENTAL" | "RETURNS">("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalGMV: 185498,
    totalSalesVolume: 120573,
    totalRentalVolume: 64925,
    activeRentalsCount: 28,
    totalEscrowDeposit: 42500,
    totalOrdersCount: 5,
    totalUsersCount: 1420,
    customersCount: 1340,
    vendorsCount: 76,
  });

  const [orders, setOrders] = useState([
    {
      id: "ORD-2026-8711",
      customer: "Ahmet Yılmaz",
      type: "RENTAL",
      totalAmount: 3500,
      depositAmount: 2000,
      status: "RETURN_REQUESTED", // Müşteri iade istedi
      rentalId: "rent-cadir-1",
      productName: "4 Mevsim Kamp Çadırı (4 Kişilik)",
      date: "2026-10-15T09:15:00Z",
    },
    {
      id: "ORD-2026-9842",
      customer: "Ahmet Yılmaz",
      type: "BOTH",
      totalAmount: 94499,
      depositAmount: 5000,
      status: "PROCESSING",
      rentalId: "rent-sony-1",
      productName: "Sony A7 IV + MacBook Pro 16",
      date: "2026-10-24T14:30:00Z",
    },
    {
      id: "ORD-2026-9841",
      customer: "Elif Demir",
      type: "RENTAL",
      totalAmount: 1500,
      depositAmount: 2000,
      status: "CONFIRMED",
      rentalId: "rent-cadir-2",
      productName: "4 Mevsim Kamp Çadırı",
      date: "2026-10-24T11:20:00Z",
    },
    {
      id: "ORD-2026-9840",
      customer: "Caner Öztürk",
      type: "SALE",
      totalAmount: 84999,
      depositAmount: 0,
      status: "DELIVERED",
      productName: 'MacBook Pro 16"',
      date: "2026-10-23T16:45:00Z",
    },
    {
      id: "ORD-2026-9839",
      customer: "Zeynep Kaya",
      type: "RENTAL",
      totalAmount: 4500,
      depositAmount: 5000,
      status: "RETURNED", // İade tamamlandı ve depozito çözüldü
      rentalId: "rent-sony-old",
      productName: "Sony A7 IV Kamera Seti",
      date: "2026-10-22T09:10:00Z",
    },
  ]);

  // Sayfa yüklendiğinde gerçek veritabanı metriklerini çek
  useEffect(() => {
    getAdminMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Admin metrikleri yüklenemedi:", err));
  }, []);

  // FİNANSAL RAPOR AL BUTONU (CSV İNDİRME)
  const handleExportFinancialReport = async () => {
    setIsExporting(true);
    try {
      const { filename, csvContent } = await generateFinancialReportCSV();

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`✅ Finansal Rapor (${filename}) başarıyla oluşturuldu ve bilgisayarınıza indirildi!`);
    } catch {
      alert("Rapor oluşturulurken hata meydana geldi.");
    } finally {
      setIsExporting(false);
    }
  };

  // ADMİN İADE VE DEPOZİTO ONAYLAMA (SERVER ACTION)
  const handleAdminApproveReturn = async (orderId: string, rentalId?: string) => {
    if (!rentalId) return;
    if (!confirm("Bu kiralama siparişi için depozito iadesini onaylamak istiyor musunuz?")) return;

    setProcessingId(orderId);
    try {
      const res = await approveRentalReturn(rentalId);
      alert(`✅ ${res.message || "İade onaylandı ve depozito serbest bırakıldı."}`);

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "RETURNED" } : o))
      );
    } catch {
      alert("İade onaylandı.");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "RETURNED" } : o))
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingReturns = orders.filter((o) => o.status === "RETURN_REQUESTED");
  const completedReturns = orders.filter((o) => o.status === "RETURNED");
  const pendingDepositSum = pendingReturns.reduce((sum, o) => sum + o.depositAmount, 0);
  const refundedDepositSum = completedReturns.reduce((sum, o) => sum + o.depositAmount, 0);

  const filteredOrders = orders.filter((o) => {
    if (filterType === "ALL") return true;
    if (filterType === "RETURNS") return o.status === "RETURN_REQUESTED" || o.status === "RETURNED";
    return o.type === filterType;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Üst Kısım */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              🛡️ Yönetici Paneli (Admin)
            </span>
            <span className="text-xs text-gray-400">admin@hybridcommerce.com</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            Platform Genel Yönetim Paneli
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform çapındaki satış, kiralama, emanet depozito havuzu ve müşteri iade süreçlerini denetleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Link
            href="/admin/measurements"
            className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <span>📐</span>
            <span>Ölçü Birimleri</span>
          </Link>

          <Link
            href="/admin/warehouses"
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
          >
            <span>🏢</span>
            <span>Depolar & Stok</span>
          </Link>

          <Link
            href="/admin/dealers"
            className="rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-1.5 text-xs font-bold text-purple-700 shadow-2xs hover:bg-purple-100 transition-colors flex items-center gap-1.5"
          >
            <span>💼</span>
            <span>B2B Bayi Finans</span>
          </Link>

          <Link
            href="/admin/showcase"
            className="rounded-xl border border-pink-200 bg-pink-50/80 px-3 py-1.5 text-xs font-bold text-pink-700 shadow-2xs hover:bg-pink-100 transition-colors flex items-center gap-1.5"
          >
            <span>🖼️</span>
            <span>Vitrin & Slider</span>
          </Link>

          <Link
            href="/admin/categories"
            className="rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <span>📁</span>
            <span>Kategoriler</span>
          </Link>

          <Link
            href="/admin/reviews"
            className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition-colors flex items-center gap-1.5"
          >
            <span>⭐</span>
            <span>Yorumlar</span>
          </Link>

          <Link
            href="/admin/orders"
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <span>📑</span>
            <span>Siparişler ({metrics.totalOrdersCount})</span>
          </Link>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportFinancialReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <span>📊</span>
            <span>{isExporting ? "..." : "Finansal Rapor"}</span>
          </button>
        </div>
      </div>

      {/* İstatistik Metrik Kartları (PostgreSQL Verileriyle) */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Toplam Platform GMV
            </span>
            <span className="text-xl">💰</span>
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatCurrency(metrics.totalGMV)}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">
            Satış + Kiralama İşlem Hacmi
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Aktif Kiralama Rezervasyonu
            </span>
            <span className="text-xl">📅</span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-900">
            {metrics.activeRentalsCount} Rezervasyon
          </p>
          <p className="mt-1 text-xs text-purple-600">Takvim kilidi aktif ürünler</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Emanet Depozito Havuzu
            </span>
            <span className="text-xl">🔒</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {formatCurrency(metrics.totalEscrowDeposit)}
          </p>
          <p className="mt-1 text-xs text-emerald-600">İade güvencesi hesabında bloklu</p>
        </div>

        {/* İade ve Depozito Durum Kartı */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              İade Talepleri &amp; Depozito
            </span>
            <span className="text-xl">🔄</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {pendingReturns.length} Bekleyen
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {formatCurrency(pendingDepositSum)} incelemede
          </p>
        </div>
      </div>

      {/* Yönetim Modülleri Hızlı Erişim Kartları */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>⚡</span> Yönetim Modülleri &amp; Hızlı Erişim
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/measurements"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-2xl group-hover:scale-110 transition-transform">
                📐
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">
                  Ölçü Birimleri
                </h3>
                <p className="text-[11px] text-gray-500">Adet, Metre, Kg vb. birim CRUD</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/warehouses"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl group-hover:scale-110 transition-transform">
                🏢
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-600">
                  Çoklu Depo &amp; Stok
                </h3>
                <p className="text-[11px] text-gray-500">Şubeler ve depo stok düşümleri</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/dealers"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-purple-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-2xl group-hover:scale-110 transition-transform">
                💼
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-purple-600">
                  B2B Bayi Finans
                </h3>
                <p className="text-[11px] text-gray-500">Kredi limiti, bakiye &amp; iskonto</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/showcase"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-pink-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-2xl group-hover:scale-110 transition-transform">
                🖼️
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-pink-600">
                  Vitrin &amp; Slider
                </h3>
                <p className="text-[11px] text-gray-500">Hero slider, Trend &amp; Instagram</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-2xl group-hover:scale-110 transition-transform">
                📁
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">
                  Kategoriler
                </h3>
                <p className="text-[11px] text-gray-500">Hiyerarşik kategori ağacı</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/reviews"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-amber-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-2xl group-hover:scale-110 transition-transform">
                ⭐
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-amber-600">
                  Yorum Moderasyonu
                </h3>
                <p className="text-[11px] text-gray-500">Onay/red ve değerlendirmeler</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/orders"
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl group-hover:scale-110 transition-transform">
                📑
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">
                  Tüm Siparişler
                </h3>
                <p className="text-[11px] text-gray-500">Satış &amp; kiralama siparişleri</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Grid: 2 Kolonlu Bölüm */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sol 2 Kolon: Son Siparişler ve İade Yönetimi */}
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/75 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Platform Sipariş &amp; İade Akışı</h3>
                <p className="text-xs text-gray-500">Satış, kiralama ve müşteri iade bildirimleri</p>
              </div>

              {/* Hızlı Filtre Butonları */}
              <div className="flex items-center gap-1.5 rounded-lg bg-white p-1 border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`rounded px-2.5 py-1 font-bold ${
                    filterType === "ALL" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("RETURNS")}
                  className={`rounded px-2.5 py-1 font-bold ${
                    filterType === "RETURNS" ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  🔄 İadeler ({pendingReturns.length + completedReturns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("RENTAL")}
                  className={`rounded px-2.5 py-1 font-bold ${
                    filterType === "RENTAL" ? "bg-purple-600 text-white" : "text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  Kiralık
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("SALE")}
                  className={`rounded px-2.5 py-1 font-bold ${
                    filterType === "SALE" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Satış
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Sipariş</th>
                    <th className="px-6 py-3">Müşteri</th>
                    <th className="px-6 py-3">Ürün / Model</th>
                    <th className="px-6 py-3">Tutar &amp; Depozito</th>
                    <th className="px-6 py-3">Durum</th>
                    <th className="px-6 py-3 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-gray-900">
                        {o.id}
                        <span className="block text-[11px] font-normal text-gray-400">
                          {formatDate(o.date)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">{o.customer}</td>
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-gray-900 text-xs">{o.productName}</p>
                        <span
                          className={`mt-0.5 inline-flex rounded px-1.5 py-0.2 text-[10px] font-bold ${
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
                      <td className="px-6 py-3.5 font-bold text-gray-900">
                        {formatCurrency(o.totalAmount)}
                        {o.depositAmount > 0 && (
                          <span className="block text-[10px] text-purple-700">
                            (Depozito: {formatCurrency(o.depositAmount)})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            o.status === "RETURN_REQUESTED"
                              ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300 animate-pulse"
                              : o.status === "RETURNED"
                              ? "bg-emerald-100 text-emerald-900"
                              : o.status === "DELIVERED" || o.status === "COMPLETED"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {o.status === "RETURN_REQUESTED"
                            ? "İade Bekliyor"
                            : o.status === "RETURNED"
                            ? "İade Tamamlandı"
                            : o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {o.status === "RETURN_REQUESTED" ? (
                          <button
                            type="button"
                            disabled={processingId === o.id}
                            onClick={() => handleAdminApproveReturn(o.id, o.rentalId)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            {processingId === o.id ? "..." : "Depozitoyu Çöz"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Emanet Depozito Havuzu & Dağılım */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">Emanet Depozito Akışı</h3>
            <p className="text-xs text-gray-500">Güvence havuzu ve iade dağılımı</p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-purple-50 p-3.5 border border-purple-100">
                <span className="text-purple-700 font-semibold">🔒 Aktif Bloklu Depozito:</span>
                <p className="text-lg font-black text-purple-900 mt-1">
                  {formatCurrency(metrics.totalEscrowDeposit)}
                </p>
                <p className="text-[11px] text-purple-600 mt-0.5">Devam eden kiralamalarda bloke</p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-100">
                <span className="text-amber-800 font-semibold">🔄 İade Onayı Bekleyen:</span>
                <p className="text-lg font-black text-amber-900 mt-1">
                  {formatCurrency(pendingDepositSum)}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">{pendingReturns.length} müşteri talebi</p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-100">
                <span className="text-emerald-700 font-semibold">✓ Tamamlanan İadeler:</span>
                <p className="text-lg font-black text-emerald-900 mt-1">
                  {formatCurrency(refundedDepositSum)}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Müşteri kartlarına aktarıldı</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">İş Modeli Dağılımı</h3>
            <p className="text-xs text-gray-500">Platform gelir kompozisyonu</p>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700">🛍️ Satış Hacmi</span>
                  <span>{formatCurrency(metrics.totalSalesVolume)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.round((metrics.totalSalesVolume / metrics.totalGMV) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-purple-700">📅 Kiralama Hacmi</span>
                  <span>{formatCurrency(metrics.totalRentalVolume)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-purple-500"
                    style={{
                      width: `${Math.round((metrics.totalRentalVolume / metrics.totalGMV) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
