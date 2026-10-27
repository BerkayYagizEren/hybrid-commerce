"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVendorProduct } from "@/features/vendor/actions/vendor.actions";
import { getAllCategories } from "@/features/categories/actions/category.actions";
import { getMeasurements, type MeasurementItem } from "@/features/measurement/actions/measurement.actions";
import type { CategoryItem } from "@/features/categories/types";

export default function NewVendorProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "BOTH" as "SALE" | "RENTAL" | "BOTH",
    categoryId: "",
    subCategoryId: "",
    measurementId: "",
    images: [
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80",
    ],
    salePrice: "3500",
    dailyPrice: "200",
    depositAmount: "1500",
    totalStock: "20",
    rentalQuantity: "5",
  });

  useEffect(() => {
    Promise.all([getAllCategories(), getMeasurements()])
      .then(([cats, meas]) => {
        setCategories(cats);
        setMeasurements(meas);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAddImage = () => {
    setForm((prev) => ({ ...prev, images: [...prev.images, ""] }));
  };

  const handleUpdateImage = (index: number, val: string) => {
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = val;
      return { ...prev, images: next };
    });
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const filteredImages = form.images.filter((img) => img.trim().length > 0);
      const res = await createVendorProduct({
        name: form.name,
        type: form.type,
        description: form.description || undefined,
        images: filteredImages.length > 0 ? filteredImages : undefined,
        imageUrl: filteredImages[0] || undefined,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
        dailyPrice: form.dailyPrice ? parseFloat(form.dailyPrice) : undefined,
        depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : 0,
        totalStock: parseInt(form.totalStock || "0"),
        rentalQuantity: parseInt(form.rentalQuantity || "0"),
        categoryId: form.categoryId || undefined,
        subCategoryId: form.subCategoryId || undefined,
        measurementId: form.measurementId || undefined,
      });

      if (res.success) {
        alert(res.message || "Ürün başarıyla listelendi!");
        router.push("/vendor/dashboard");
      } else {
        setError(res.error || "Ürün eklenemedi.");
      }
    } catch (err: any) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => c.parentId === form.categoryId);

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Üst Navigasyon & Başlık */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/vendor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
          >
            ← Satıcı Paneline Dön
          </Link>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
            🏪 Satıcı Portalı
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            ✨ Yeni Ürün / İlan Ekle
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Ürün detaylarını, dinamik kategori eşleşmesini ve stok bilgilerini eksiksiz doldurun.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Ürün Adı */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Ürün Adı *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Dağcılık Sırt Çantası 70L"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Dinamik Kategori ve Alt Kategori Seçimi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Ana Kategori *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value, subCategoryId: "" })
                  }
                  required
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">— Ana Kategori Seçin —</option>
                  {mainCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      📁 {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Alt Kategori
                </label>
                <select
                  value={form.subCategoryId}
                  onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })}
                  disabled={!form.categoryId}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">— Alt Kategori Seçin —</option>
                  {subCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      └─ {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ölçü Birimi (Measurement) Seçimi */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Ölçü Birimi (Birim Tipi)
                </label>
                <Link
                  href="/admin/measurements"
                  target="_blank"
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  + Yeni Birim Tanımla
                </Link>
              </div>
              <select
                value={form.measurementId}
                onChange={(e) => setForm({ ...form, measurementId: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-purple-500 focus:outline-none"
              >
                <option value="">— Ölçü Birimi Seçin (Opsiyonel) —</option>
                {measurements.map((m) => (
                  <option key={m.id} value={m.id}>
                    📐 {m.name} ({m.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                Ürünün satış veya kiralamada hangi birim üzerinden işlem göreceğini belirler (Örn: Adet, Metre, Günlük Paket).
              </p>
            </div>

            {/* Çoklu Görseller */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                    🖼️ Ürün Görselleri ({form.images.filter(Boolean).length} Görsel)
                  </label>
                  <p className="text-[11px] text-gray-400">İlk görsel ana kapak resmi olarak kullanılır.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-200 transition cursor-pointer"
                >
                  + Görsel URL Ekle
                </button>
              </div>

              <div className="space-y-2">
                {form.images.map((imgUrl, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
                    <span className="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      {idx === 0 ? "★ Kapak" : `#${idx + 1}`}
                    </span>
                    <input
                      type="text"
                      placeholder="https://... (Görsel URL)"
                      value={imgUrl}
                      onChange={(e) => handleUpdateImage(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="text-gray-400 hover:text-red-600 text-xs px-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* İş Modeli */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                İş Modeli
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as "SALE" | "RENTAL" | "BOTH" })
                }
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-purple-500 focus:outline-none"
              >
                <option value="BOTH">Hem Satılık Hem Kiralık (Hibrit)</option>
                <option value="RENTAL">Sadece Kiralık</option>
                <option value="SALE">Sadece Satılık</option>
              </select>
            </div>

            {/* Fiyatlandırma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.type !== "RENTAL" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Satış Fiyatı (₺)</label>
                  <input
                    type="number"
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-bold text-emerald-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
              {form.type !== "SALE" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Günlük Kira (₺)</label>
                  <input
                    type="number"
                    value={form.dailyPrice}
                    onChange={(e) => setForm({ ...form, dailyPrice: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-bold text-purple-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Stoklar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.type !== "RENTAL" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Satış Stoku (Adet)</label>
                  <input
                    type="number"
                    value={form.totalStock}
                    onChange={(e) => setForm({ ...form, totalStock: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
              {form.type !== "SALE" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Kiralık Birim Sayısı</label>
                  <input
                    type="number"
                    value={form.rentalQuantity}
                    onChange={(e) => setForm({ ...form, rentalQuantity: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {form.type !== "SALE" && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">Güvence Depozitosu (₺)</label>
                <input
                  type="number"
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            {/* Açıklama */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700">Ürün Açıklaması</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ürünün teknik özellikleri, kullanım alanları..."
                className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Link
                href="/vendor/dashboard"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Vazgeç
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition"
              >
                {submitting ? "Kaydediliyor..." : "Ürünü Yayınla"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
