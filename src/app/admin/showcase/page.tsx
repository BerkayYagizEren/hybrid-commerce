"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAllSliders,
  createSlider,
  deleteSlider,
  getAllShowcaseItems,
  addShowcaseItem,
  removeShowcaseItem,
  deleteCustomShowcase,
  clearShowcaseByType,
  getActiveInstagramPosts,
  createInstagramPost,
  deleteInstagramPost,
} from "@/features/showcase/actions/showcase.actions";
import { getVendorProductsList } from "@/features/vendor/actions/vendor.actions";

export default function AdminShowcasePage() {
  const [activeTab, setActiveTab] = useState<"sliders" | "showcase" | "instagram">("sliders");
  const [loading, setLoading] = useState(true);

  // Sliders
  const [sliders, setSliders] = useState<any[]>([]);
  const [sliderForm, setSliderForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    linkUrl: "",
    order: "0",
  });
  const [sliderSubmitting, setSliderSubmitting] = useState(false);

  // Vitrinler
  const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedType, setSelectedType] = useState<"TREND" | "BEST_SELLER" | "NEW_ARRIVALS" | "CUSTOM">("TREND");
  const [customTitle, setCustomTitle] = useState("");
  const [showcaseSubmitting, setShowcaseSubmitting] = useState(false);

  // Instagram
  const [instaPosts, setInstaPosts] = useState<any[]>([]);
  const [instaForm, setInstaForm] = useState({
    postUrl: "",
    imageUrl: "",
    caption: "",
    order: "0",
  });
  const [instaSubmitting, setInstaSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sList, scList, pList, iList] = await Promise.all([
        getAllSliders(),
        getAllShowcaseItems(),
        getVendorProductsList(),
        getActiveInstagramPosts(),
      ]);
      setSliders(sList);
      setShowcaseItems(scList);
      setProducts(pList);
      setInstaPosts(iList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddSlider = async (e: React.FormEvent) => {
    e.preventDefault();
    setSliderSubmitting(true);
    try {
      const res = await createSlider({
        title: sliderForm.title,
        subtitle: sliderForm.subtitle || undefined,
        imageUrl: sliderForm.imageUrl,
        linkUrl: sliderForm.linkUrl || undefined,
        order: parseInt(sliderForm.order || "0"),
      });
      if (res.success) {
        setSliderForm({ title: "", subtitle: "", imageUrl: "", linkUrl: "", order: "0" });
        await loadAll();
      } else {
        alert(res.error || "Hata");
      }
    } finally {
      setSliderSubmitting(false);
    }
  };

  const handleAddShowcase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    if (selectedType === "CUSTOM" && !customTitle.trim()) {
      alert("Lütfen özel vitrin/slider başlığı giriniz.");
      return;
    }
    setShowcaseSubmitting(true);
    try {
      const res = await addShowcaseItem(
        selectedProductId,
        selectedType,
        0,
        selectedType === "CUSTOM" ? customTitle.trim() : undefined
      );
      if (res.success) {
        setSelectedProductId("");
        if (selectedType === "CUSTOM") {
          // Keep title or reset
        }
        await loadAll();
      } else {
        alert(res.error || "Hata");
      }
    } finally {
      setShowcaseSubmitting(false);
    }
  };

  const handleAddInsta = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstaSubmitting(true);
    try {
      const res = await createInstagramPost({
        postUrl: instaForm.postUrl,
        imageUrl: instaForm.imageUrl,
        caption: instaForm.caption || undefined,
        order: parseInt(instaForm.order || "0"),
      });
      if (res.success) {
        setInstaForm({ postUrl: "", imageUrl: "", caption: "", order: "0" });
        await loadAll();
      } else {
        alert(res.error || "Hata");
      }
    } finally {
      setInstaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span>Ana Sayfa Vitrin Yönetimi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Ana Sayfa Vitrin ve Medya Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Hero banner slider'ları, Trend/Çok Satanlar vitrin ürünlerini ve Instagram sosyal akışını anlık yönetin.
          </p>
        </div>

        {/* Tab Butonları */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("sliders")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
              activeTab === "sliders"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            🖼️ Hero Slider ({sliders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("showcase")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
              activeTab === "showcase"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            ⭐ Vitrin Ürünleri ({showcaseItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("instagram")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
              activeTab === "instagram"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            📸 Instagram Akışı ({instaPosts.length})
          </button>
        </div>

        {/* TAB 1: SLIDERS */}
        {activeTab === "sliders" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-4">+ Yeni Slider Ekle</h3>
              <form onSubmit={handleAddSlider} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Başlık *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Yeni Sezon İndirimleri"
                    value={sliderForm.title}
                    onChange={(e) => setSliderForm({ ...sliderForm, title: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Alt Başlık</label>
                  <input
                    type="text"
                    placeholder="Örn: Kirala veya Satın Al"
                    value={sliderForm.subtitle}
                    onChange={(e) => setSliderForm({ ...sliderForm, subtitle: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Görsel URL *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={sliderForm.imageUrl}
                    onChange={(e) => setSliderForm({ ...sliderForm, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Yönlendirme Linki</label>
                  <input
                    type="text"
                    placeholder="/products?type=SALE"
                    value={sliderForm.linkUrl}
                    onChange={(e) => setSliderForm({ ...sliderForm, linkUrl: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sıra No</label>
                  <input
                    type="number"
                    value={sliderForm.order}
                    onChange={(e) => setSliderForm({ ...sliderForm, order: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sliderSubmitting}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  {sliderSubmitting ? "Ekleniyor..." : "Slider'ı Kaydet"}
                </button>
              </form>
            </div>

            {/* Liste */}
            <div className="lg:col-span-2 space-y-4">
              {sliders.length === 0 ? (
                <div className="rounded-2xl bg-white p-12 text-center text-sm text-gray-500 border border-gray-100">
                  Henüz kayıtlı slider bulunmuyor.
                </div>
              ) : (
                sliders.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <img src={s.imageUrl} alt={s.title} className="h-20 w-32 rounded-xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Sıra: {s.order}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">{s.title}</h4>
                      </div>
                      {s.subtitle && <p className="text-xs text-gray-500 mt-0.5">{s.subtitle}</p>}
                      {s.linkUrl && <p className="text-[11px] text-blue-600 mt-1 font-mono">{s.linkUrl}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Slider silinsin mi?")) {
                          await deleteSlider(s.id);
                          await loadAll();
                        }
                      }}
                      className="rounded-lg p-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SHOWCASE ITEMS */}
        {activeTab === "showcase" && (
          <div className="space-y-6">
            {/* Ekleme Alanı */}
            <form onSubmit={handleAddShowcase} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ürün Seçin *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— Ürün Listesi —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-56">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vitrin Bölümü</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="TREND">🔥 Trend Ürünler</option>
                  <option value="BEST_SELLER">🏆 Çok Satanlar</option>
                  <option value="NEW_ARRIVALS">✨ Yeni Gelenler</option>
                  <option value="CUSTOM">🌟 Özel Vitrin / Slider Adı Tanımla...</option>
                </select>
              </div>

              {selectedType === "CUSTOM" && (
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-semibold text-purple-900 mb-1">
                    Özel Vitrin / Slider Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: kendisinin_koydugu_ad_2, Fırsat Ürünleri"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 bg-purple-50/40 px-3 py-2 text-xs font-medium text-purple-950 focus:border-purple-600 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={showcaseSubmitting}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                {showcaseSubmitting ? "Ekleniyor..." : "+ Vitrine Ekle"}
              </button>
            </form>

            {/* Vitrin Listesi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["TREND", "BEST_SELLER", "NEW_ARRIVALS"] as const).map((typeKey) => {
                const itemsOfType = showcaseItems.filter((i) => i.type === typeKey);
                const titleMap = {
                  TREND: "🔥 Trend Ürünler",
                  BEST_SELLER: "🏆 Çok Satanlar",
                  NEW_ARRIVALS: "✨ Yeni Gelenler",
                };

                return (
                  <div key={typeKey} className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{titleMap[typeKey]}</h4>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {itemsOfType.length}
                        </span>
                      </div>
                      {itemsOfType.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              confirm(
                                `"${titleMap[typeKey]}" vitrinindeki tüm ürünleri kaldırıp vitrini temizlemek istediğinize emin misiniz?`
                              )
                            ) {
                              await clearShowcaseByType(typeKey);
                              await loadAll();
                            }
                          }}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition"
                          title="Vitrindeki tüm ürünleri kaldır"
                        >
                          ✕ Vitrini Temizle
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {itemsOfType.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">Bu vitrinde ürün yok.</p>
                      ) : (
                        itemsOfType.map((sc) => (
                          <div key={sc.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-2">
                            <span className="text-xs font-semibold text-gray-800 line-clamp-1">
                              {sc.product?.name}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await removeShowcaseItem(sc.id);
                                await loadAll();
                              }}
                              className="text-xs text-red-500 hover:text-red-700 px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Özel Vitrin / Slider Grupları */}
              {Array.from(
                new Set(
                  showcaseItems
                    .filter((i) => i.type === "CUSTOM")
                    .map((i) => i.title || "Özel Vitrin")
                )
              ).map((grpTitle) => {
                const itemsInGrp = showcaseItems.filter(
                  (i) => i.type === "CUSTOM" && (i.title || "Özel Vitrin") === grpTitle
                );

                return (
                  <div
                    key={grpTitle}
                    className="rounded-2xl bg-white p-5 shadow-sm border border-purple-200 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                          <span>🌟</span> <span>{grpTitle}</span>
                        </h4>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                          {itemsInGrp.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            confirm(
                              `"${grpTitle}" vitrinini ve içindeki tüm ürünleri tamamen kaldırmak istediğinize emin misiniz?`
                            )
                          ) {
                            await deleteCustomShowcase(grpTitle);
                            await loadAll();
                          }
                        }}
                        className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 px-2.5 py-1 rounded-lg transition border border-red-200"
                        title="Bu vitrini tamamen kaldır"
                      >
                        🗑️ Vitrini Kaldır
                      </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {itemsInGrp.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">Bu vitrinde ürün yok.</p>
                      ) : (
                        itemsInGrp.map((sc) => (
                          <div
                            key={sc.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-purple-50/50 p-2"
                          >
                            <span className="text-xs font-semibold text-gray-800 line-clamp-1">
                              {sc.product?.name}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await removeShowcaseItem(sc.id);
                                await loadAll();
                              }}
                              className="text-xs text-red-500 hover:text-red-700 px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: INSTAGRAM POSTS */}
        {activeTab === "instagram" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-4">+ Instagram Gönderisi Ekle</h3>
              <form onSubmit={handleAddInsta} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Görsel URL *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={instaForm.imageUrl}
                    onChange={(e) => setInstaForm({ ...instaForm, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Post / Profil URL *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://instagram.com/p/..."
                    value={instaForm.postUrl}
                    onChange={(e) => setInstaForm({ ...instaForm, postUrl: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Açıklama</label>
                  <input
                    type="text"
                    placeholder="Örn: Hafta sonu kamp rotası ⛺"
                    value={instaForm.caption}
                    onChange={(e) => setInstaForm({ ...instaForm, caption: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={instaSubmitting}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  {instaSubmitting ? "Ekleniyor..." : "Postu Kaydet"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {instaPosts.length === 0 ? (
                <div className="col-span-full rounded-2xl bg-white p-12 text-center text-sm text-gray-500 border border-gray-100">
                  Instagram gönderisi bulunamadı.
                </div>
              ) : (
                instaPosts.map((p) => (
                  <div key={p.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
                    <img src={p.imageUrl} alt={p.caption || "Instagram"} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-3 text-white">
                      <p className="text-xs line-clamp-2">{p.caption}</p>
                      <div className="flex justify-between items-center">
                        <a href={p.postUrl} target="_blank" rel="noreferrer" className="text-[11px] underline">
                          Gönderiye Git
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Silinsin mi?")) {
                              await deleteInstagramPost(p.id);
                              await loadAll();
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-200"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
