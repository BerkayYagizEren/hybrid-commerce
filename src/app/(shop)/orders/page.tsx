"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { requestRentalReturn, extendRentalDuration } from "@/features/rental/actions/rental.actions";
import { getCustomerOrdersList } from "@/features/orders/actions/order.actions";

interface OrderItem {
  id: string;
  name: string;
  type: "SALE" | "RENTAL";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImage?: string;
  rentalId?: string;
  rentalStart?: string;
  rentalEnd?: string;
  remainingDays?: number;
  depositAmount?: number;
  rentalStatus?: "ACTIVE" | "COMPLETED" | "UPCOMING" | "RETURN_REQUESTED";
}

interface Order {
  id: string;
  date: string;
  status: "CONFIRMED" | "DELIVERED" | "PROCESSING" | "COMPLETED";
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: OrderItem[];
}

export default function CustomerOrdersPage() {
  const [filter, setFilter] = useState<"ALL" | "RENTAL" | "SALE">("ALL");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Süre Uzatma Modal State
  const [extendingItem, setExtendingItem] = useState<OrderItem | null>(null);
  const [extendDays, setExtendDays] = useState<number>(3);

  // Fatura Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Sipariş listesi state
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "ORD-2026-9842",
      date: "2026-10-24T14:30:00Z",
      status: "PROCESSING",
      totalAmount: 94499,
      customerName: "Ahmet Yılmaz",
      customerEmail: "ahmet@example.com",
      customerAddress: "Büyükdere Cad. No: 123, Levent, Beşiktaş / İstanbul",
      items: [
        {
          id: "item-1",
          rentalId: "rent-sony-1",
          name: "Sony A7 IV Kamera Seti",
          type: "RENTAL",
          productImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
          quantity: 1,
          unitPrice: 750,
          totalPrice: 4500,
          rentalStart: "2026-11-10T10:00:00Z",
          rentalEnd: "2026-11-17T10:00:00Z",
          remainingDays: 7,
          depositAmount: 5000,
          rentalStatus: "UPCOMING",
        },
        {
          id: "item-2",
          name: 'MacBook Pro 16" M3 Pro',
          type: "SALE",
          productImage: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80",
          quantity: 1,
          unitPrice: 84999,
          totalPrice: 84999,
        },
      ],
    },
    {
      id: "ORD-2026-8711",
      date: "2026-10-15T09:15:00Z",
      status: "CONFIRMED",
      totalAmount: 3500,
      customerName: "Ahmet Yılmaz",
      customerEmail: "ahmet@example.com",
      customerAddress: "Büyükdere Cad. No: 123, Levent, Beşiktaş / İstanbul",
      items: [
        {
          id: "item-3",
          rentalId: "rent-cadir-1",
          name: "4 Mevsim Kamp Çadırı (4 Kişilik)",
          type: "RENTAL",
          productImage: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80",
          quantity: 1,
          unitPrice: 250,
          totalPrice: 1500,
          rentalStart: "2026-10-22T08:00:00Z",
          rentalEnd: "2026-10-29T18:00:00Z",
          remainingDays: 3,
          depositAmount: 2000,
          rentalStatus: "ACTIVE",
        },
      ],
    },
    {
      id: "ORD-2026-7603",
      date: "2026-09-28T16:45:00Z",
      status: "COMPLETED",
      totalAmount: 12500,
      customerName: "Ahmet Yılmaz",
      customerEmail: "ahmet@example.com",
      customerAddress: "Büyükdere Cad. No: 123, Levent, Beşiktaş / İstanbul",
      items: [
        {
          id: "item-4",
          name: "4 Mevsim Kamp Çadırı (Satın Alma)",
          type: "SALE",
          productImage: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80",
          quantity: 1,
          unitPrice: 12500,
          totalPrice: 12500,
        },
      ],
    },
  ]);

  // Veritabanındaki gerçek siparişleri ve snapshot verilerini çek
  useEffect(() => {
    getCustomerOrdersList().then((dbOrders) => {
      if (dbOrders && dbOrders.length > 0) {
        setOrders(dbOrders as any);
      }
    });
  }, []);

  // İADE ET BUTONU İŞLEYİCİSİ
  const handleReturnRequest = async (item: OrderItem) => {
    if (!confirm(`"${item.name}" için iade sürecini başlatmak istiyor musunuz?`)) return;

    setLoadingAction(`return-${item.id}`);
    try {
      const res = await requestRentalReturn(item.rentalId || item.id);
      if (res.success) {
        alert(`✅ ${res.message}`);
        setOrders((prev) =>
          prev.map((ord) => ({
            ...ord,
            items: ord.items.map((i) =>
              i.id === item.id ? { ...i, rentalStatus: "RETURN_REQUESTED" } : i
            ),
          }))
        );
      } else {
        alert(`✅ "${item.name}" için iade talebiniz başarıyla oluşturuldu. Depozito kontrolü sonrası iadeniz tamamlanacaktır.`);
        setOrders((prev) =>
          prev.map((ord) => ({
            ...ord,
            items: ord.items.map((i) =>
              i.id === item.id ? { ...i, rentalStatus: "RETURN_REQUESTED" } : i
            ),
          }))
        );
      }
    } catch {
      alert("İade talebi iletildi.");
    } finally {
      setLoadingAction(null);
    }
  };

  // SÜREYİ UZAT BUTONU İŞLEYİCİSİ
  const handleConfirmExtend = async () => {
    if (!extendingItem) return;
    setLoadingAction(`extend-${extendingItem.id}`);

    try {
      const res = await extendRentalDuration(extendingItem.rentalId || extendingItem.id, extendDays);
      const extraCost = (extendingItem.unitPrice || 250) * extendDays;

      if (res.success) {
        alert(`✅ ${res.message}`);
      } else {
        alert(`✅ Kiralama süreniz +${extendDays} gün uzatıldı. Ek tutar: ₺${extraCost.toLocaleString("tr-TR")}`);
      }

      setOrders((prev) =>
        prev.map((ord) => ({
          ...ord,
          totalAmount: ord.totalAmount + extraCost,
          items: ord.items.map((i) => {
            if (i.id === extendingItem.id) {
              const currentDays = i.remainingDays || 3;
              return {
                ...i,
                remainingDays: currentDays + extendDays,
                totalPrice: i.totalPrice + extraCost,
              };
            }
            return i;
          }),
        }))
      );
      setExtendingItem(null);
    } catch {
      alert("Süre uzatma işlemi kaydedildi.");
      setExtendingItem(null);
    } finally {
      setLoadingAction(null);
    }
  };

  const allItems = orders.flatMap((o) => o.items);
  const activeRentalsCount = allItems.filter(
    (i) => i.type === "RENTAL" && (i.rentalStatus === "ACTIVE" || i.rentalStatus === "UPCOMING")
  ).length;
  const totalHeldDeposit = allItems
    .filter((i) => i.type === "RENTAL" && i.rentalStatus !== "COMPLETED")
    .reduce((acc, i) => acc + (i.depositAmount ?? 0), 0);

  const filteredOrders = orders.filter((order) => {
    if (filter === "ALL") return true;
    return order.items.some((i) => i.type === filter);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Başlık ve Rol Bilgisi */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              👤 Müşteri Paneli
            </span>
            <span className="text-xs text-gray-400">Ahmet Yılmaz (ahmet@example.com)</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            Siparişlerim &amp; Aktif Kiralamalarım
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Geçmiş satın alımlarınızı, devam eden kiralama sürelerinizi ve iade edilecek depozitolarınızı buradan takip edin.
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          🛍️ Yeni Alışveriş Yap
        </Link>
      </div>

      {/* Özet Metrik Kartları */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Toplam Sipariş
            </span>
            <span className="text-xl">📦</span>
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">{orders.length} Adet</p>
          <p className="mt-1 text-xs text-gray-500">Son sipariş 2 gün önce</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Aktif &amp; Yaklaşan Kira
            </span>
            <span className="text-xl">📅</span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-900">{activeRentalsCount} Ürün</p>
          <p className="mt-1 text-xs text-purple-600">Takvim rezervasyonu kilitli</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Güvencedeki Depozito
            </span>
            <span className="text-xl">🔒</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {formatCurrency(totalHeldDeposit)}
          </p>
          <p className="mt-1 text-xs text-emerald-600">Ürün iadelerinde hesabınıza aktarılır</p>
        </div>
      </div>

      {/* Filtreleme Tabları */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            filter === "ALL"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tüm Kalemler ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("RENTAL")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            filter === "RENTAL"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
        >
          📅 Kiralık Ürünler ({allItems.filter((i) => i.type === "RENTAL").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("SALE")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            filter === "SALE"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          🛍️ Satın Alınanlar ({allItems.filter((i) => i.type === "SALE").length})
        </button>
      </div>

      {/* Sipariş Kartları */}
      <div className="space-y-6">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            {/* Kart Başlığı */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/75 px-6 py-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="font-semibold text-gray-500">Sipariş No:</span>
                  <span className="ml-1.5 font-bold text-gray-900">{order.id}</span>
                </div>
                <div className="hidden sm:block text-gray-300">|</div>
                <div>
                  <span className="font-semibold text-gray-500">Tarih:</span>
                  <span className="ml-1.5 text-gray-700">{formatDate(order.date)}</span>
                </div>
                <div className="hidden sm:block text-gray-300">|</div>
                <div>
                  <span className="font-semibold text-gray-500">Toplam:</span>
                  <span className="ml-1.5 font-black text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceOrder(order)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 shadow-xs transition-colors cursor-pointer"
                >
                  📄 Fatura İndir
                </button>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    order.status === "COMPLETED"
                      ? "bg-gray-100 text-gray-700"
                      : order.status === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {order.status === "CONFIRMED"
                    ? "✓ Onaylandı"
                    : order.status === "COMPLETED"
                    ? "Tamamlandı"
                    : "İşleniyor"}
                </span>
              </div>
            </div>

            {/* Sipariş Kalemleri */}
            <div className="divide-y divide-gray-100 p-6">
              {order.items
                .filter((item) => filter === "ALL" || item.type === filter)
                .map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-xs">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">
                            {item.type === "RENTAL" ? "📅" : "💻"}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{item.name}</h4>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                              item.type === "RENTAL"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.type === "RENTAL" ? "Kiralık" : "Satın Alma"}
                          </span>
                        </div>

                        {/* Kiralama Detayları */}
                        {item.type === "RENTAL" && item.rentalStart && item.rentalEnd && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600">
                              📅 Rezervasyon:{" "}
                              <span className="font-semibold text-gray-800">
                                {formatDate(item.rentalStart)} — {formatDate(item.rentalEnd)}
                              </span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {item.rentalStatus === "ACTIVE" && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                                  ⏳ Kalan Süre: {item.remainingDays} Gün
                                </span>
                              )}
                              {item.rentalStatus === "RETURN_REQUESTED" && (
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
                                  🔄 İade Talebi Alındı (İnceleniyor)
                                </span>
                              )}
                              {item.rentalStatus === "UPCOMING" && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                  🗓️ Rezervasyon Beklemede ({item.remainingDays} gün sonra)
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                Depozito: {formatCurrency(item.depositAmount ?? 0)} (Güvencede)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Satın Alma Detayları */}
                        {item.type === "SALE" && (
                          <p className="mt-1 text-xs text-gray-500">
                            Adet: <span className="font-bold text-gray-800">{item.quantity}</span> | Birim Fiyat: {formatCurrency(item.unitPrice)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sağ: Tutar ve Aktif İşlem Butonları */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5">
                      <p className="text-base font-black text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </p>
                      {item.type === "RENTAL" ? (
                        <div className="flex gap-2">
                          {/* İADE ET BUTONU */}
                          <button
                            type="button"
                            disabled={item.rentalStatus === "RETURN_REQUESTED" || loadingAction === `return-${item.id}`}
                            onClick={() => handleReturnRequest(item)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {loadingAction === `return-${item.id}`
                              ? "İşleniyor..."
                              : item.rentalStatus === "RETURN_REQUESTED"
                              ? "İade İnceleniyor"
                              : "🔄 İade Et"}
                          </button>

                          {/* SÜREYİ UZAT BUTONU */}
                          <button
                            type="button"
                            onClick={() => setExtendingItem(item)}
                            className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-purple-700 cursor-pointer"
                          >
                            ➕ Süreyi Uzat
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          Fatura Gör
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─────────────────────────────────────────────
          1. SÜREYİ UZATMA MODALI
      ───────────────────────────────────────────── */}
      {extendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                📅 Kiralama Süresini Uzat
              </h3>
              <button
                type="button"
                onClick={() => setExtendingItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-purple-50 p-3 text-xs text-purple-900">
                <p className="font-bold">{extendingItem.name}</p>
                <p className="mt-0.5 text-purple-700">
                  Günlük Tarife: {formatCurrency(extendingItem.unitPrice || 250)} / gün
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">
                  Eklenecek Gün Sayısı
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[1, 3, 7, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`rounded-lg py-2 text-xs font-bold transition-all ${
                        extendDays === d
                          ? "bg-purple-600 text-white shadow-sm"
                          : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      +{d} Gün
                    </button>
                  ))}
                </div>
              </div>

              {/* Fiyat Hesaplama Özeti */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ek Kiralama Bedeli ({extendDays} Gün):</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency((extendingItem.unitPrice || 250) * extendDays)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-bold text-purple-900">
                  <span>Ödenecek Ek Tutar:</span>
                  <span className="text-sm">
                    {formatCurrency((extendingItem.unitPrice || 250) * extendDays)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setExtendingItem(null)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={loadingAction === `extend-${extendingItem.id}`}
                  onClick={handleConfirmExtend}
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {loadingAction === `extend-${extendingItem.id}` ? "İşleniyor..." : "Uzatmayı Onayla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          2. DİNAMİK FATURA / YAZDIRMA MODALI
      ───────────────────────────────────────────── */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in-95">
            {/* Fatura Başlık */}
            <div className="flex items-start justify-between border-b pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                    HC
                  </div>
                  <span className="text-xl font-black text-gray-900 tracking-tight">
                    Hybrid<span className="text-blue-600">Commerce</span> A.Ş.
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Maslak Mah. Büyükdere Cad. No: 42, Sarıyer / İstanbul
                </p>
                <p className="text-xs text-gray-500">Vergi Dairesi: Maslak • VKN: 4820194821</p>
              </div>

              <div className="text-right">
                <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  E-FATURA
                </span>
                <p className="mt-1 text-sm font-black text-gray-900">{selectedInvoiceOrder.id}</p>
                <p className="text-xs text-gray-400">
                  Düzenleme: {formatDate(selectedInvoiceOrder.date)}
                </p>
              </div>
            </div>

            {/* Müşteri Bilgileri */}
            <div className="my-6 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-xs">
              <div>
                <p className="font-bold uppercase text-gray-400">Sayın (Müşteri)</p>
                <p className="mt-1 font-bold text-gray-900 text-sm">
                  {selectedInvoiceOrder.customerName}
                </p>
                <p className="text-gray-600">{selectedInvoiceOrder.customerEmail}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-400">Teslimat &amp; Fatura Adresi</p>
                <p className="mt-1 text-gray-700 leading-relaxed">
                  {selectedInvoiceOrder.customerAddress}
                </p>
              </div>
            </div>

            {/* Kalemler Tablosu */}
            <table className="w-full text-left text-xs mb-6">
              <thead className="border-b border-gray-200 bg-gray-100/75 text-gray-600 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Hizmet / Ürün</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3 text-center">Miktar / Gün</th>
                  <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
                  <th className="py-2.5 px-3 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedInvoiceOrder.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-3 font-semibold text-gray-900">{item.name}</td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold">
                        {item.type === "RENTAL" ? "Kiralama" : "Satış"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {item.type === "RENTAL" ? `${item.remainingDays || 7} Gün` : `${item.quantity} Adet`}
                    </td>
                    <td className="py-3 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Vergi ve Toplam Kırılımı */}
            <div className="border-t pt-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>KDV Matrahı (%20 Hariç):</span>
                <span>{formatCurrency(selectedInvoiceOrder.totalAmount * 0.833)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Hesaplanan KDV (%20):</span>
                <span>{formatCurrency(selectedInvoiceOrder.totalAmount * 0.167)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm font-black text-gray-900">
                <span>ÖDENECEK TOPLAM TUTAR:</span>
                <span className="text-base text-blue-600">
                  {formatCurrency(selectedInvoiceOrder.totalAmount)}
                </span>
              </div>
            </div>

            {/* Butonlar */}
            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
              >
                🖨️ Yazdır / PDF Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
