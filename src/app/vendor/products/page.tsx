"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/shared/utils/format";
import { getVendorProductsList, updateProductStock } from "@/features/vendor/actions/vendor.actions";

export default function VendorProductsPage() {
  const router = useRouter();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState<any | null>(null);
  const [stockForm, setStockForm] = useState({
    totalStock: "0",
    rentalQuantity: "0",
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const handleOpenStockModal = (p: any) => {
    setStockModalProduct(p);
    setStockForm({
      totalStock: String(p.saleStock || 0),
      rentalQuantity: String(p.rentalUnits || 0),
    });
    setIsStockModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    setIsUpdatingStock(true);
    try {
      const res = await updateProductStock({
        productId: stockModalProduct.id,
        totalStock: Number(stockForm.totalStock),
        rentalQuantity: Number(stockForm.rentalQuantity),
      });

      if (res.success) {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === stockModalProduct.id
              ? {
                  ...item,
                  saleStock: Math.max(0, parseInt(stockForm.totalStock, 10) || 0),
                  rentalUnits: Math.max(0, parseInt(stockForm.rentalQuantity, 10) || 0),
                }
              : item
          )
        );
        setIsStockModalOpen(false);
        router.refresh();
        alert(res.message || "Stok bilgileri başarıyla güncellendi.");
      } else {
        alert("Hata: " + res.error);
      }
    } catch (err: any) {
      alert("Bir hata oluştu: " + err.message);
    } finally {
      setIsUpdatingStock(false);
    }
  };
  const [products, setProducts] = useState<any[]>([
    {
      id: "prod-1",
      name: "4 Mevsim Kamp Çadırı (4 Kişilik)",
      slug: "4-mevsim-cadir",
      categoryName: "Outdoor & Kamp",
      type: "BOTH",
      imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80",
      saleStock: 48,
      reservedStock: 2,
      rentalUnits: 10,
      activeRentals: 7,
      salePrice: 12500,
      dailyPrice: 250,
      status: "YAYINDA",
    },
    {
      id: "prod-2",
      name: "Profesyonel Kamp Ocağı & Pişirme Seti",
      slug: "kamp-ocagi-seti",
      categoryName: "Outdoor & Kamp",
      type: "BOTH",
      imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80",
      saleStock: 30,
      reservedStock: 0,
      rentalUnits: 15,
      activeRentals: 12,
      salePrice: 2800,
      dailyPrice: 90,
      status: "YAYINDA",
    },
    {
      id: "prod-3",
      name: "Karavan Tipi Taşınabilir Güç İstasyonu (1000W)",
      slug: "tasinabilir-guc-istasyonu",
      categoryName: "Elektronik & Enerji",
      type: "RENTAL",
      imageUrl: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=400&q=80",
      saleStock: 0,
      reservedStock: 0,
      rentalUnits: 6,
      activeRentals: 6,
      dailyPrice: 450,
      status: "TÜMÜ KİRADA",
    },
  ]);

  useEffect(() => {
    getVendorProductsList().then((dbList) => {
      if (dbList && dbList.length > 0) {
        setProducts(dbList);
      }
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Üst Kısım */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
              🏪 Satıcı Kataloğu
            </span>
            <span className="text-xs text-gray-400">Kamp Dünyası</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            Ürünlerim ve Envanter Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Platformda listelenen tüm satılık ve kiralık ürünlerinizin stok ve fiyat ayarları.
          </p>
        </div>

        <Link
          href="/vendor/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700"
        >
          📊 Mağaza Paneline Dön
        </Link>
      </div>

      {/* Ürün Listesi Tablosu */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Ürün Bilgisi</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4">Satış Stoku</th>
                <th className="px-6 py-4">Kiralık Birim</th>
                <th className="px-6 py-4">Fiyatlar</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-2xs">
                        {p.imageUrl || (p.images && p.images[0]) ? (
                          <img
                            src={p.imageUrl || p.images?.[0]}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            📷
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{p.name}</p>
                        <Link
                          href={`/products/${p.slug}`}
                          className="mt-0.5 inline-block text-[11px] font-medium text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          Mağazada Gör ↗
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{p.categoryName || p.category || "Genel"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                        p.type === "BOTH"
                          ? "bg-blue-100 text-blue-800"
                          : p.type === "RENTAL"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {p.type === "BOTH" ? "Satılık & Kiralık" : p.type === "RENTAL" ? "Kiralık" : "Satılık"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.type !== "RENTAL" ? (
                      <div>
                        <span className="font-bold text-gray-900">{p.saleStock} adet</span>
                        {p.reservedStock > 0 && (
                          <span className="block text-xs text-amber-600">({p.reservedStock} rezerve)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.type !== "SALE" ? (
                      <div>
                        <span className="font-bold text-purple-700">{p.rentalUnits} birim</span>
                        <span className="block text-xs text-purple-500">
                          ({p.activeRentals} aktif kirada)
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.salePrice && (
                      <p className="text-xs font-bold text-emerald-600">
                        Satış: {formatCurrency(p.salePrice)}
                      </p>
                    )}
                    {(p.dailyRate || p.dailyPrice) && (
                      <p className="text-xs font-bold text-purple-700">
                        Kira: {formatCurrency(p.dailyRate || p.dailyPrice)}/gün
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        p.status === "YAYINDA"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenStockModal(p)}
                      className="rounded-lg border border-purple-200 bg-purple-50/80 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors shadow-2xs cursor-pointer"
                    >
                      📦 Stok Güncelle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          HIZLI STOK GÜNCELLEME MODALI
      ───────────────────────────────────────────── */}
      {isStockModalOpen && stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>📦</span> Stok Güncelle
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium line-clamp-1">
                  {stockModalProduct.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="mt-4 space-y-4">
              <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3 text-xs text-purple-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Ürün Türü:</span>
                  <span className="font-bold rounded-md bg-purple-200/70 px-2 py-0.5 text-[11px] text-purple-800">
                    {stockModalProduct.type === "BOTH"
                      ? "Satılık & Kiralık"
                      : stockModalProduct.type === "RENTAL"
                      ? "Sadece Kiralık"
                      : "Sadece Satılık"}
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 mt-1">
                  Mevcut stok ve kiralık birim sayılarını aşağıdan doğrudan güncelleyebilirsiniz.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Satış Stoğu (Adet)
                </label>
                <input
                  type="number"
                  min="0"
                  required={stockModalProduct.type !== "RENTAL"}
                  disabled={stockModalProduct.type === "RENTAL"}
                  value={stockForm.totalStock}
                  onChange={(e) => setStockForm({ ...stockForm, totalStock: e.target.value })}
                  placeholder="Örn: 25"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                />
                {stockModalProduct.type === "RENTAL" && (
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Bu ürün yalnızca kiralık modele sahiptir.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Kiralık Birim Sayısı (Envanter)
                </label>
                <input
                  type="number"
                  min="0"
                  required={stockModalProduct.type !== "SALE"}
                  disabled={stockModalProduct.type === "SALE"}
                  value={stockForm.rentalQuantity}
                  onChange={(e) => setStockForm({ ...stockForm, rentalQuantity: e.target.value })}
                  placeholder="Örn: 10"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                />
                {stockModalProduct.type === "SALE" && (
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Bu ürün yalnızca satış modeline sahiptir.
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStock}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdatingStock ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
