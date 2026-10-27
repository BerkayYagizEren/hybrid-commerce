"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getWarehousesAction,
  createWarehouseAction,
  setWarehouseStockAction,
} from "@/features/warehouse/actions/warehouse.actions";
import { getVendorProductsList } from "@/features/vendor/actions/vendor.actions";

export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Depo Ekleme Modalı
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stok Düzenleme Modalı
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedWh, setSelectedWh] = useState<any>(null);
  const [stockForm, setStockForm] = useState({
    productId: "",
    quantity: "0",
  });
  const [stockSubmitting, setStockSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [whList, prodList] = await Promise.all([
        getWarehousesAction(),
        getVendorProductsList(),
      ]);
      setWarehouses(whList);
      setProducts(prodList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createWarehouseAction(formData);
      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({ name: "", code: "", address: "", isDefault: false });
        await loadAll();
      } else {
        setErrorMsg(res.error || "Hata");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWh || !stockForm.productId) return;
    setStockSubmitting(true);
    try {
      const res = await setWarehouseStockAction({
        warehouseId: selectedWh.id,
        productId: stockForm.productId,
        quantity: parseInt(stockForm.quantity || "0"),
      });
      if (res.success) {
        setIsStockModalOpen(false);
        setStockForm({ productId: "", quantity: "0" });
        await loadAll();
      } else {
        alert(res.error || "Hata");
      }
    } finally {
      setStockSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
              <Link href="/admin/dashboard" className="hover:text-blue-600">Admin</Link>
              <span>/</span>
              <span>Çoklu Depo Yönetimi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Çoklu Depo ve Şube Yönetimi (Warehouse & Stock)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Şube bazlı depo stoklarını yönetin, transferleri ve sipariş bazlı stok düşümlerini izleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({ name: "", code: "", address: "", isDefault: false });
              setErrorMsg(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            <span>+</span>
            <span>Yeni Depo / Şube Ekle</span>
          </button>
        </div>

        {/* Depolar Listesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full p-12 text-center text-sm text-gray-500">Yükleniyor...</div>
          ) : warehouses.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-white p-12 text-center text-sm text-gray-500 border border-gray-100">
              Henüz tanımlı bir depo bulunmuyor.
            </div>
          ) : (
            warehouses.map((wh) => (
              <div key={wh.id} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏢</span>
                        <h3 className="text-base font-bold text-gray-900">{wh.name}</h3>
                      </div>
                      <span className="inline-block mt-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-700">
                        {wh.code}
                      </span>
                    </div>
                    {wh.isDefault && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        Varsayılan Ana Depo
                      </span>
                    )}
                  </div>
                  {wh.address && (
                    <p className="text-xs text-gray-500 mt-2">📍 {wh.address}</p>
                  )}
                </div>

                {/* Depodaki Ürün Stokları */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
                    <span>Depo Stok Kalemleri ({wh.stocks?.length || 0})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWh(wh);
                        setIsStockModalOpen(true);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      + Stok Ekle/Düzenle
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {!wh.stocks || wh.stocks.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Bu depoda henüz ürün stoku girilmemiş.</p>
                    ) : (
                      wh.stocks.map((st: any) => (
                        <div key={st.id} className="flex items-center justify-between text-xs rounded-lg bg-gray-50 p-2">
                          <span className="font-semibold text-gray-800 line-clamp-1">{st.product?.name}</span>
                          <span className="font-bold text-blue-700 whitespace-nowrap">{st.quantity} Adet</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Depo Ekleme Modalı */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Yeni Depo / Şube Tanımla</h2>
              {errorMsg && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleCreateWarehouse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Depo / Şube Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kadıköy Şube Deposu"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Depo Kodu *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: WH-KDK-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Adres / Konum</label>
                  <input
                    type="text"
                    placeholder="Örn: Rıhtım Cad. No:12, Kadıköy / İstanbul"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefaultWh"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="isDefaultWh" className="text-xs font-semibold text-gray-700">
                    Varsayılan Ana Depo Yap (Siparişler öncelikli buradan düşer)
                  </label>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    {submitting ? "Ekleniyor..." : "Depoyu Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stok Düzenleme Modalı */}
        {isStockModalOpen && selectedWh && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Depo Stoku Güncelle</h2>
              <p className="text-xs text-gray-500 mb-4">{selectedWh.name} ({selectedWh.code})</p>
              <form onSubmit={handleSetStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ürün Seçin *</label>
                  <select
                    required
                    value={stockForm.productId}
                    onChange={(e) => setStockForm({ ...stockForm, productId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— Ürün Seçin —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mevcut Depo Adedi *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStockModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={stockSubmitting}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    {stockSubmitting ? "Güncelleniyor..." : "Stoku Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
