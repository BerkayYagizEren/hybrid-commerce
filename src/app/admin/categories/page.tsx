"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCategoriesTree,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/categories/actions/category.actions";
import type { CategoryItem } from "@/features/categories/types";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categoriesTree, setCategoriesTree] = useState<CategoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    parentId: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Verileri Yükle
  const loadData = async () => {
    try {
      setLoading(true);
      const [tree, flat] = await Promise.all([
        getCategoriesTree(),
        getAllCategories(),
      ]);
      setCategoriesTree(tree);
      setAllCategories(flat);
    } catch (err) {
      console.error("Kategoriler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ekleme Modalı Aç
  const handleOpenAddModal = (parentIdDefault: string = "") => {
    setFormData({
      name: "",
      slug: "",
      parentId: parentIdDefault,
      description: "",
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Düzenleme Modalı Aç
  const handleOpenEditModal = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || "",
      description: cat.description || "",
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Silme Modalı Aç
  const handleOpenDeleteModal = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setIsDeleteModalOpen(true);
  };

  // Form Submit: Yeni Kategori Ekle
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await createCategory({
        name: formData.name,
        slug: formData.slug || undefined,
        parentId: formData.parentId || null,
        description: formData.description || undefined,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        startTransition(() => {
          router.refresh();
        });
        await loadData();
      } else {
        setFormError(res.error || "Kategori eklenemedi.");
      }
    } catch (err: any) {
      setFormError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Form Submit: Kategori Güncelle
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await updateCategory({
        id: selectedCategory.id,
        name: formData.name,
        slug: formData.slug || undefined,
        parentId: formData.parentId || null,
        description: formData.description,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        startTransition(() => {
          router.refresh();
        });
        await loadData();
      } else {
        setFormError(res.error || "Kategori güncellenemedi.");
      }
    } catch (err: any) {
      setFormError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Silme Onayla
  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);

    try {
      const res = await deleteCategory(selectedCategory.id);
      if (res.success) {
        setIsDeleteModalOpen(false);
        startTransition(() => {
          router.refresh();
        });
        await loadData();
      } else {
        alert("Silinemedi: " + res.error);
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrikler
  const mainCategories = categoriesTree;
  const subCategoriesCount = allCategories.filter((c) => Boolean(c.parentId)).length;
  const totalProductsLinked = allCategories.reduce(
    (acc, c) => acc + (c._count?.products || 0) + (c._count?.subProducts || 0),
    0
  );

  // Filtreleme
  const filteredTree = categoriesTree.filter((cat) => {
    if (!searchQuery) return true;
    const matchMain =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchChild = cat.children?.some(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchMain || matchChild;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & BREADCRUMB
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <span>👑 Yönetici Portalı</span>
                <span>/</span>
                <span>Katalog Mimarisi</span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Kategori Yönetim Paneli
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Ana ve alt kategorileri hiyerarşik olarak düzenleyin, Mega Menü kırılımlarını yönetin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50"
              >
                📊 Dashboard
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50"
              >
                📦 Siparişler
              </Link>
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
              >
                <span>➕</span> Yeni Kategori Ekle
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            2. METRİK KARTLARI
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-gray-400 uppercase">Toplam Kategori</span>
            <p className="mt-2 text-2xl font-black text-gray-900">{allCategories.length}</p>
            <span className="mt-1 block text-[11px] text-gray-500">Ana ve alt kırılımlar</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-blue-600 uppercase">Ana Kategoriler</span>
            <p className="mt-2 text-2xl font-black text-blue-600">{mainCategories.length}</p>
            <span className="mt-1 block text-[11px] text-blue-500">Mega Menü 1. seviye</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-purple-600 uppercase">Alt Kategoriler</span>
            <p className="mt-2 text-2xl font-black text-purple-600">{subCategoriesCount}</p>
            <span className="mt-1 block text-[11px] text-purple-500">Bağlı alt dallar</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-emerald-600 uppercase">Eşleşen Ürünler</span>
            <p className="mt-2 text-2xl font-black text-emerald-600">{totalProductsLinked}</p>
            <span className="mt-1 block text-[11px] text-emerald-500">Katalogdaki ürün bağı</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ARAMA VE FİLTRELEME
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kategori adı veya slug ara..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 pl-9 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-2xs"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>
          <p className="text-xs text-gray-500">
            {filteredTree.length} ana kategori listeleniyor
          </p>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. KATEGORİ AĞACI VE LİSTESİ
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-3">Kategoriler yükleniyor...</p>
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <span className="text-3xl">📂</span>
              <p className="mt-3 text-sm font-semibold">Henüz kategori bulunmuyor.</p>
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                + İlk Ana Kategoriyi Ekle
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTree.map((mainCat) => {
                const mainProductCount = mainCat._count?.products || 0;
                const children = mainCat.children || [];

                return (
                  <div key={mainCat.id} className="p-4 sm:p-5 transition hover:bg-gray-50/50">
                    {/* Ana Kategori Satırı */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-lg shadow-2xs border border-blue-100">
                          📁
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-sm">
                              {mainCat.name}
                            </h3>
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              Ana Kategori
                            </span>
                            <span className="font-mono text-[11px] text-gray-400">
                              /{mainCat.slug}
                            </span>
                          </div>
                          {mainCat.description && (
                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                              {mainCat.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Aksiyonlar & Sayaçlar */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-lg">
                          🏷️ {children.length} Alt Kırılım
                        </span>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          📦 {mainProductCount} Ürün
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(mainCat.id)}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                          title="Bu ana kategori altına alt kategori ekle"
                        >
                          + Alt Kategori
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(mainCat)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(mainCat)}
                          className="rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                        >
                          Sil
                        </button>
                      </div>
                    </div>

                    {/* Alt Kategoriler Listesi (Varsa) */}
                    {children.length > 0 && (
                      <div className="mt-3.5 pl-6 sm:pl-12 border-l-2 border-gray-100 space-y-2">
                        {children.map((subCat) => {
                          const subProductCount =
                            (subCat._count?.products || 0) + (subCat._count?.subProducts || 0);

                          return (
                            <div
                              key={subCat.id}
                              className="flex items-center justify-between rounded-xl bg-gray-50/70 px-3.5 py-2 transition hover:bg-gray-100/70 border border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">└─</span>
                                <span className="font-semibold text-gray-800 text-xs">
                                  {subCat.name}
                                </span>
                                <span className="font-mono text-[10px] text-gray-400">
                                  /{subCat.slug}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {subProductCount} Ürün
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(subCat)}
                                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                >
                                  Düzenle
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(subCat)}
                                  className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                                >
                                  Sil
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: YENİ KATEGORİ EKLE
      ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {formData.parentId ? "➕ Yeni Alt Kategori Ekle" : "📁 Yeni Kategori Ekle"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Kategori Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Çadırlar veya Laptop & Bilgisayar"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Slug (URL Adresi)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Boş bırakılırsa isimden otomatik üretilir"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Üst Kategori Hiyerarşisi
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Ana Kategori Olarak Tanımla (En Üst Seviye) —</option>
                  {mainCategories.map((m) => (
                    <option key={m.id} value={m.id}>
                      📁 {m.name} (Ana Kategori Altına Ekle)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kategori hakkında kısa bilgi..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Kaydediliyor..." : "Kategoriyi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: KATEGORİ DÜZENLE
      ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                ✏️ Kategoriyi Düzenle: {selectedCategory.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Kategori Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Slug (URL Adresi)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Üst Kategori Hiyerarşisi
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Ana Kategori Olarak Ayarla (En Üst Seviye) —</option>
                  {mainCategories
                    .filter((m) => m.id !== selectedCategory.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        📁 {m.name} (Ana Kategoriye Bağla)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Açıklama
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MODAL: KATEGORİ SİL ONAYI
      ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <span className="text-4xl">⚠️</span>
            <h3 className="mt-3 text-base font-bold text-gray-900">
              Kategoriyi Silmek İstediğinize Emin Misiniz?
            </h3>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              <strong>"{selectedCategory.name}"</strong> kategorisi silindiğinde bağlı alt kategoriler de silinecektir. Bu kategoriye bağlı ürünler silinmez, kategori referansları güvenle temizlenir.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Siliniyor..." : "Evet, Kategoriyi Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
