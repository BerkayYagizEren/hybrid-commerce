"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  type MeasurementItem,
} from "@/features/measurement/actions/measurement.actions";

export default function AdminMeasurementsPage() {
  const [measurements, setMeasurements] = useState<MeasurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MeasurementItem | null>(null);

  const [formData, setFormData] = useState({ name: "", code: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getMeasurements();
      setMeasurements(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createMeasurement(formData);
      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({ name: "", code: "" });
        await loadData();
      } else {
        setErrorMsg(res.error || "Oluşturulamadı");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await updateMeasurement(selectedItem.id, formData);
      if (res.success) {
        setIsEditModalOpen(false);
        setSelectedItem(null);
        await loadData();
      } else {
        setErrorMsg(res.error || "Güncellenemedi");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ölçü birimini silmek istediğinize emin misiniz?`)) return;
    const res = await deleteMeasurement(id);
    if (res.success) {
      await loadData();
    } else {
      alert(res.error || "Silinemedi");
    }
  };

  const filtered = measurements.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
              <Link href="/admin/dashboard" className="hover:text-blue-600">Admin</Link>
              <span>/</span>
              <span>Ölçü Birimleri</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Ölçü Birimi Yönetimi (Measurement)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ürünlerin satış ve kiralama aşamasında kullandığı ölçü birimlerini (Adet, Metre, Kg, Paket vb.) yönetin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({ name: "", code: "" });
              setErrorMsg(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition cursor-pointer"
          >
            <span>+</span>
            <span>Yeni Ölçü Birimi Ekle</span>
          </button>
        </div>

        {/* Arama & İstatistik */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <input
            type="text"
            placeholder="Ölçü birimi adı veya kodu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="text-xs font-bold text-gray-500 whitespace-nowrap">
            Toplam: <span className="text-blue-600">{measurements.length}</span> birim
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Kayıtlı ölçü birimi bulunamadı.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Birim Adı</th>
                  <th className="px-6 py-4">Birim Kodu</th>
                  <th className="px-6 py-4">Bağlı Ürün Sayısı</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-800">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {item._count?.products || 0} ürün
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setFormData({ name: item.name, code: item.code });
                          setErrorMsg(null);
                          setIsEditModalOpen(true);
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ekleme Modalı */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Yeni Ölçü Birimi Ekle</h2>
              {errorMsg && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Birim Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Metre, Kilogram, Adet"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Birim Kodu</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: MTR, KG, ADT"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
                  />
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
                    {submitting ? "Ekleniyor..." : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Düzenleme Modalı */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ölçü Birimini Düzenle</h2>
              {errorMsg && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Birim Adı</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Birim Kodu</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    {submitting ? "Güncelleniyor..." : "Güncelle"}
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
