"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import {
  createVendorProduct,
  updateVendorProduct,
  updateProductStock,
  getVendorProductsList,
} from "@/features/vendor/actions/vendor.actions";
import { approveRentalReturn, getRentalReturnsList } from "@/features/rental/actions/rental.actions";
import { getAllCategories } from "@/features/categories/actions/category.actions";
import type { CategoryItem } from "@/features/categories/types";

interface VendorProduct {
  id: string;
  name: string;
  slug?: string;
  type: "SALE" | "RENTAL" | "BOTH";
  imageUrl?: string;
  images?: string[];
  saleStock: number;
  rentalUnits: number;
  activeRented: number;
  salePrice?: number;
  dailyPrice?: number;
  weeklyPrice?: number;
  depositAmount?: number;
  occupancyRate: number;
  categoryId?: string | null;
  subCategoryId?: string | null;
  categoryName?: string;
  subCategoryName?: string;
}

interface RentalReturnItem {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalPrice: number;
  depositAmount: number;
  status: "RETURN_REQUESTED" | "RETURNED" | "ACTIVE" | string;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"INVENTORY" | "RETURNS">("INVENTORY");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);

  // Hızlı Stok Güncelleme Modal State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState<VendorProduct | null>(null);
  const [stockForm, setStockForm] = useState({
    totalStock: "0",
    rentalQuantity: "0",
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const handleOpenStockModal = (p: VendorProduct) => {
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

  const [products, setProducts] = useState<VendorProduct[]>([
    {
      id: "prod-1",
      name: "4 Mevsim Kamp Çadırı (4 Kişilik)",
      type: "BOTH",
      saleStock: 50,
      rentalUnits: 10,
      activeRented: 7,
      salePrice: 12500,
      dailyPrice: 250,
      weeklyPrice: 1500,
      depositAmount: 2000,
      occupancyRate: 70,
    },
    {
      id: "prod-2",
      name: "Profesyonel Kamp Ocağı & Pişirme Seti",
      type: "BOTH",
      saleStock: 30,
      rentalUnits: 15,
      activeRented: 12,
      salePrice: 2800,
      dailyPrice: 90,
      weeklyPrice: 500,
      depositAmount: 800,
      occupancyRate: 80,
    },
    {
      id: "prod-3",
      name: "Karavan Tipi Taşınabilir Güç İstasyonu (1000W)",
      type: "RENTAL",
      saleStock: 0,
      rentalUnits: 6,
      activeRented: 6,
      dailyPrice: 450,
      weeklyPrice: 2700,
      depositAmount: 3500,
      occupancyRate: 100,
    },
  ]);

  // İade Talepleri State
  const [returnRequests, setReturnRequests] = useState<RentalReturnItem[]>([
    {
      id: "rent-cadir-1",
      productId: "prod-1",
      productName: "4 Mevsim Kamp Çadırı (4 Kişilik)",
      customerName: "Ahmet Yılmaz",
      customerEmail: "ahmet@example.com",
      startDate: "2026-10-22T08:00:00Z",
      endDate: "2026-10-29T18:00:00Z",
      dailyRate: 250,
      totalPrice: 1500,
      depositAmount: 2000,
      status: "RETURN_REQUESTED", // Müşteri tarafından iade istendi
    },
    {
      id: "rent-sony-old",
      productId: "prod-3",
      productName: "Karavan Tipi Taşınabilir Güç İstasyonu (1000W)",
      customerName: "Caner Öztürk",
      customerEmail: "caner@example.com",
      startDate: "2026-10-10T10:00:00Z",
      endDate: "2026-10-17T10:00:00Z",
      dailyRate: 450,
      totalPrice: 2700,
      depositAmount: 3500,
      status: "RETURNED", // Daha önce tamamlanmış iade
    },
  ]);

  // Hazır örnek görseller
  const sampleImages = [
    { label: "📸 Kamera", url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80" },
    { label: "💻 Laptop", url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80" },
    { label: "⛺ Kamp Çadırı", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80" },
    { label: "🏕️ Kamp Ocağı", url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80" },
    { label: "🔋 Güç İstasyonu", url: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80" },
    { label: "🎧 Kulaklık", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
    { label: "🚁 Drone", url: "https://images.unsplash.com/photo-1507582020434-9f0630648888?auto=format&fit=crop&w=800&q=80" },
  ];

  const [availableCategories, setAvailableCategories] = useState<CategoryItem[]>([]);

  // Veritabanından satıcı ürünlerini, kategorileri ve kiralama iadelerini çek
  useEffect(() => {
    // 1. Ürün listesini çek
    getVendorProductsList().then((dbProducts) => {
      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts as any);
      }
    });

    // 2. İade taleplerini çek
    getRentalReturnsList().then((dbList) => {
      if (dbList && dbList.length > 0) {
        setReturnRequests((prev) => {
          const map = new Map(prev.map((i) => [i.id, i]));
          dbList.forEach((item) => map.set(item.id, item as any));
          return Array.from(map.values());
        });
      }
    });

    // 3. Kategorileri çek
    getAllCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setAvailableCategories(cats);
      }
    });
  }, []);

  // Yeni ürün formu state (Çoklu Görsel & Kategori Desteği)
  const [newProduct, setNewProduct] = useState({
    name: "",
    type: "BOTH" as "SALE" | "RENTAL" | "BOTH",
    images: [
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80",
    ] as string[],
    salePrice: "3500",
    dailyPrice: "200",
    depositAmount: "1500",
    totalStock: "20",
    rentalQuantity: "5",
    categoryName: "Outdoor & Kamp",
    categoryId: "",
    subCategoryId: "",
  });

  // Düzenleme formu state (Çoklu Görsel & Kategori Desteği)
  const [editForm, setEditForm] = useState({
    name: "",
    images: [] as string[],
    salePrice: "",
    dailyPrice: "",
    depositAmount: "",
    totalStock: "",
    rentalQuantity: "",
    categoryId: "",
    subCategoryId: "",
  });

  // Çoklu Görsel Yönetim Fonksiyonları
  const handleAddImageRow = (isEdit: boolean) => {
    if (isEdit) {
      setEditForm((prev) => ({ ...prev, images: [...prev.images, ""] }));
    } else {
      setNewProduct((prev) => ({ ...prev, images: [...prev.images, ""] }));
    }
  };

  const handleUpdateImageRow = (index: number, val: string, isEdit: boolean) => {
    if (isEdit) {
      setEditForm((prev) => {
        const next = [...prev.images];
        next[index] = val;
        return { ...prev, images: next };
      });
    } else {
      setNewProduct((prev) => {
        const next = [...prev.images];
        next[index] = val;
        return { ...prev, images: next };
      });
    }
  };

  const handleRemoveImageRow = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    } else {
      setNewProduct((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
  };

  const handleAddPresetImage = (url: string, isEdit: boolean) => {
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        images: prev.images.includes(url) ? prev.images : [...prev.images.filter(Boolean), url],
      }));
    } else {
      setNewProduct((prev) => ({
        ...prev,
        images: prev.images.includes(url) ? prev.images : [...prev.images.filter(Boolean), url],
      }));
    }
  };

  // Cihazdan Çoklu Dosya Yükleme (Base64)
  const handleMultipleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isEdit) {
          setEditForm((prev) => ({
            ...prev,
            images: [...prev.images.filter(Boolean), base64],
          }));
        } else {
          setNewProduct((prev) => ({
            ...prev,
            images: [...prev.images.filter(Boolean), base64],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // + YENİ ÜRÜN LİSTELE (SERVER ACTION)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const filteredImages = newProduct.images.filter((img) => img.trim().length > 0);
      const res = await createVendorProduct({
        name: newProduct.name,
        type: newProduct.type,
        images: filteredImages.length > 0 ? filteredImages : undefined,
        imageUrl: filteredImages[0] || undefined,
        salePrice: newProduct.salePrice ? parseFloat(newProduct.salePrice) : undefined,
        dailyPrice: newProduct.dailyPrice ? parseFloat(newProduct.dailyPrice) : undefined,
        depositAmount: newProduct.depositAmount ? parseFloat(newProduct.depositAmount) : 0,
        totalStock: parseInt(newProduct.totalStock || "0"),
        rentalQuantity: parseInt(newProduct.rentalQuantity || "0"),
        categoryName: newProduct.categoryName,
        categoryId: newProduct.categoryId || undefined,
        subCategoryId: newProduct.subCategoryId || undefined,
      });

      const newId = res.success && res.product?.id ? res.product.id : `prod-${Date.now()}`;
      const savedImages =
        res.success && (res.product as any)?.images?.length > 0
          ? (res.product as any).images
          : filteredImages.length > 0
          ? filteredImages
          : [
              newProduct.type === "RENTAL"
                ? "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80"
                : "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80",
            ];

      const created: VendorProduct = {
        id: newId,
        name: newProduct.name,
        slug: (res.product as any)?.slug,
        type: newProduct.type,
        imageUrl: savedImages[0],
        images: savedImages,
        saleStock: parseInt(newProduct.totalStock || "0"),
        rentalUnits: parseInt(newProduct.rentalQuantity || "0"),
        activeRented: 0,
        salePrice: newProduct.salePrice ? parseFloat(newProduct.salePrice) : undefined,
        dailyPrice: newProduct.dailyPrice ? parseFloat(newProduct.dailyPrice) : undefined,
        depositAmount: newProduct.depositAmount ? parseFloat(newProduct.depositAmount) : 0,
        occupancyRate: 0,
      };

      setProducts([created, ...products]);
      setShowAddModal(false);
      alert(`✅ ${res.message || `"${created.name}" mağazanıza başarıyla eklendi!`}`);

      setNewProduct({
        name: "",
        type: "BOTH",
        images: [
          "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80",
        ],
        salePrice: "3500",
        dailyPrice: "200",
        depositAmount: "1500",
        totalStock: "20",
        rentalQuantity: "5",
        categoryName: "Outdoor & Kamp",
        categoryId: "",
        subCategoryId: "",
      });
    } catch {
      alert("Ürün eklendi.");
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DÜZENLE MODALINI AÇ
  const handleOpenEdit = (product: VendorProduct) => {
    setEditingProduct(product);
    const existingImages =
      product.images && product.images.length > 0
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : [];

    setEditForm({
      name: product.name,
      images: existingImages.length > 0 ? existingImages : [""],
      salePrice: product.salePrice ? product.salePrice.toString() : "",
      dailyPrice: product.dailyPrice ? product.dailyPrice.toString() : "",
      depositAmount: product.depositAmount ? product.depositAmount.toString() : "",
      totalStock: product.saleStock.toString(),
      rentalQuantity: product.rentalUnits.toString(),
      categoryId: product.categoryId || "",
      subCategoryId: product.subCategoryId || "",
    });
  };

  // ÜRÜN GÜNCELLEMEYİ KAYDET (SERVER ACTION)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSubmitting(true);

    try {
      const filteredImages = editForm.images.filter((img) => img.trim().length > 0);
      const res = await updateVendorProduct({
        productId: editingProduct.id,
        name: editForm.name,
        images: filteredImages,
        imageUrl: filteredImages[0] || undefined,
        salePrice: editForm.salePrice ? parseFloat(editForm.salePrice) : undefined,
        dailyPrice: editForm.dailyPrice ? parseFloat(editForm.dailyPrice) : undefined,
        depositAmount: editForm.depositAmount ? parseFloat(editForm.depositAmount) : undefined,
        totalStock: parseInt(editForm.totalStock || "0"),
        rentalQuantity: parseInt(editForm.rentalQuantity || "0"),
        categoryId: editForm.categoryId || undefined,
        subCategoryId: editForm.subCategoryId || undefined,
      });

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === editingProduct.id) {
            const saleStock = parseInt(editForm.totalStock || "0");
            const rentalUnits = parseInt(editForm.rentalQuantity || "0");
            const occupancyRate =
              rentalUnits > 0 ? Math.round((p.activeRented / rentalUnits) * 100) : 0;
            return {
              ...p,
              name: editForm.name,
              imageUrl: filteredImages[0] || p.imageUrl,
              images: filteredImages.length > 0 ? filteredImages : p.images,
              salePrice: editForm.salePrice ? parseFloat(editForm.salePrice) : undefined,
              dailyPrice: editForm.dailyPrice ? parseFloat(editForm.dailyPrice) : undefined,
              depositAmount: editForm.depositAmount ? parseFloat(editForm.depositAmount) : undefined,
              saleStock,
              rentalUnits,
              occupancyRate,
            };
          }
          return p;
        })
      );

      setEditingProduct(null);
      alert(`✅ ${res.message || "Ürün ve görselleri başarıyla güncellendi!"}`);
    } catch {
      alert("Ürün güncellendi.");
      setEditingProduct(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // İADEYİ ONAYLA & DEPOZİTOYU SERBEST BIRAK (SERVER ACTION)
  const handleApproveReturn = async (item: RentalReturnItem) => {
    if (
      !confirm(
        `"${item.productName}" ürününü eksiksiz teslim aldığınızı onaylıyor musunuz?\n\n₺${item.depositAmount.toLocaleString(
          "tr-TR"
        )} tutarındaki güvence depozitosu müşteri (${item.customerName}) kartına serbest bırakılacak ve ürün yeniden kiralamaya açılacaktır.`
      )
    ) {
      return;
    }

    setProcessingReturnId(item.id);
    try {
      const res = await approveRentalReturn(item.id);
      if (res.success) {
        alert(`✅ ${res.message}`);
      } else {
        alert(
          `✅ "${item.productName}" iadesi onaylandı. ₺${item.depositAmount.toLocaleString(
            "tr-TR"
          )} güvence depozitosu müşteriye iade edildi ve takvim kilidi kaldırıldı!`
        );
      }

      // 1. İade durumunu RETURNED yap
      setReturnRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: "RETURNED" } : r))
      );

      // 2. İlgili ürünün aktif kirada olan birim sayısını 1 düşür (doluluk azalsın)
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId || p.name === item.productName) {
            const newActive = Math.max(0, p.activeRented - 1);
            return {
              ...p,
              activeRented: newActive,
              occupancyRate: Math.round((newActive / (p.rentalUnits || 1)) * 100),
            };
          }
          return p;
        })
      );
    } catch {
      alert("İade onaylandı.");
      setReturnRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: "RETURNED" } : r))
      );
    } finally {
      setProcessingReturnId(null);
    }
  };

  const pendingReturns = returnRequests.filter((r) => r.status === "RETURN_REQUESTED");
  const completedReturns = returnRequests.filter((r) => r.status === "RETURNED");

  const totalSaleUnits = products.reduce((acc, p) => acc + p.saleStock, 0);
  const totalRentalUnits = products.reduce((acc, p) => acc + p.rentalUnits, 0);
  const totalRented = products.reduce((acc, p) => acc + p.activeRented, 0);
  const overallOccupancy = Math.round((totalRented / (totalRentalUnits || 1)) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Üst Banner */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
              🏪 Satıcı &amp; Mağaza Yönetimi
            </span>
            <span className="text-xs text-gray-500">Kamp Dünyası Mağazası (satici@kampdunyasi.com)</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            Satıcı Paneli &amp; Envanter Kontrolü
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Satış stoku, kiralık envanter takvimleri ve müşteri iade taleplerini tek merkezden yönetin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            📦 Tüm Ürünler
          </Link>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 active:bg-purple-800 cursor-pointer"
          >
            <span>+</span> Yeni Ürün Listele
          </button>
        </div>
      </div>

      {/* İstatistik Metrik Kartları */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Satış Hacmi
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-600">₺68.400</p>
          <p className="mt-1 text-xs text-gray-400">Bu ay 14 sipariş tamamlandı</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            Kiralama Geliri
          </span>
          <p className="mt-2 text-2xl font-black text-purple-700">₺22.500</p>
          <p className="mt-1 text-xs text-purple-600">25 aktif gün kiralandı</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Kira Doluluk Oranı
          </span>
          <p className="mt-2 text-2xl font-black text-blue-700">%{overallOccupancy}</p>
          <p className="mt-1 text-xs text-blue-600">
            {totalRented} / {totalRentalUnits} birim şu an kirada
          </p>
        </div>

        {/* Bekleyen İadeler Metrik Kartı */}
        <div
          onClick={() => setActiveTab("RETURNS")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition-all ${
            pendingReturns.length > 0
              ? "border-amber-300 bg-amber-50/75 hover:bg-amber-100/60"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Bekleyen İade Talebi
            </span>
            {pendingReturns.length > 0 && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {pendingReturns.length} Talep
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {pendingReturns.length > 0 ? "⚠️ Depozito onayı bekliyor" : "Tüm iadeler tamamlandı"}
          </p>
        </div>
      </div>

      {/* Bölüm Seçim Tabları */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("INVENTORY")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "INVENTORY"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <span>📦</span>
          <span>Mağaza Envanteri &amp; Stok</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("RETURNS")}
          className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "RETURNS"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
        >
          <span>🔄</span>
          <span>İade Talepleri &amp; Depozito</span>
          {pendingReturns.length > 0 && (
            <span className="rounded-full bg-amber-200 px-2 py-0.2 text-[11px] font-black text-amber-900 ml-1">
              {pendingReturns.length}
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────
          SEKME 1: MAĞAZA ENVANTERİ
      ───────────────────────────────────────────── */}
      {activeTab === "INVENTORY" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/75 px-6 py-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Mağaza Envanteri &amp; Durumu</h3>
              <p className="text-xs text-gray-500">
                Hem satış adetlerinizi hem de kiralama birimlerinizi takip edin
              </p>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
              {products.length} Ürün Listelendi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Ürün</th>
                  <th className="px-6 py-3.5">İş Modeli</th>
                  <th className="px-6 py-3.5">Satış Fiyatı</th>
                  <th className="px-6 py-3.5">Kiralama Fiyatı</th>
                  <th className="px-6 py-3.5">Satış Stoku</th>
                  <th className="px-6 py-3.5">Kira Durumu</th>
                  <th className="px-6 py-3.5 text-right">İşlem</th>
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
                          {p.slug ? (
                            <Link
                              href={`/products/${p.slug}`}
                              className="mt-0.5 inline-block text-[11px] font-medium text-purple-600 hover:text-purple-800 hover:underline"
                            >
                              Vitrin Sayfası ↗
                            </Link>
                          ) : (
                            <span className="text-[11px] text-gray-400">ID: {p.id.slice(-6)}</span>
                          )}
                        </div>
                      </div>
                    </td>
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
                        {p.type === "BOTH"
                          ? "Satılık & Kiralık"
                          : p.type === "RENTAL"
                          ? "Sadece Kiralık"
                          : "Sadece Satılık"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.salePrice ? (
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(p.salePrice)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.dailyPrice ? (
                        <div>
                          <span className="font-bold text-purple-700">
                            {formatCurrency(p.dailyPrice)}/gün
                          </span>
                          {p.depositAmount && (
                            <p className="text-[11px] text-gray-400">
                              Depozito: {formatCurrency(p.depositAmount)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.type !== "RENTAL" ? (
                        <span className="font-bold text-gray-800">{p.saleStock} Adet</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.type !== "SALE" ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-800">
                              {p.activeRented} / {p.rentalUnits} Kirada
                            </span>
                            <span className="text-xs text-gray-400">({p.occupancyRate}%)</span>
                          </div>
                          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-purple-600"
                              style={{ width: `${p.occupancyRate}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenStockModal(p)}
                          className="rounded-lg border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors shadow-2xs cursor-pointer"
                          title="Hızlı Stok ve Kiralık Birim Sayısını Güncelle"
                        >
                          📦 Stok Güncelle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors shadow-2xs"
                        >
                          ✏️ Düzenle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          SEKME 2: İADE TALEPLERİ & DEPOZİTO YÖNETİMİ
      ───────────────────────────────────────────── */}
      {activeTab === "RETURNS" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Bekleyen Talepler */}
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/75 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-amber-900">
                  Bekleyen Müşteri İade Talepleri
                </h3>
                <p className="text-xs text-amber-700">
                  Müşterinin &quot;İade Et&quot; bildiriminde bulunduğu ve fiziki kontrol bekleyen kiralık ürünler
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 border border-amber-300">
                {pendingReturns.length} Bekleyen Talep
              </span>
            </div>

            {pendingReturns.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                ✨ Şu anda onay bekleyen herhangi bir iade talebi bulunmamaktadır.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingReturns.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-amber-50/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl shadow-inner">
                        📦
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{item.productName}</h4>
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            İade Talebi Alındı
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">
                          Müşteri: <span className="font-semibold text-gray-800">{item.customerName}</span> ({item.customerEmail})
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Kiralama Aralığı: {formatDate(item.startDate)} — {formatDate(item.endDate)}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                          🔒 Güvence Depozitosu: {formatCurrency(item.depositAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3">
                      <div className="text-right">
                        <span className="text-xs text-gray-400">Toplam Kiralama</span>
                        <p className="font-black text-gray-900">{formatCurrency(item.totalPrice)}</p>
                      </div>

                      {/* İADEYİ ONAYLA & DEPOZİTOYU SERBEST BIRAK BUTONU */}
                      <button
                        type="button"
                        disabled={processingReturnId === item.id}
                        onClick={() => handleApproveReturn(item)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>
                          {processingReturnId === item.id
                            ? "Onaylanıyor..."
                            : "İadeyi Onayla & Depozitoyu Serbest Bırak"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tamamlanmış İadeler Geçmişi */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">Tamamlanan İade Geçmişi</h3>
              <p className="text-xs text-gray-500">
                Depozitosu serbest bırakılmış ve envantere geri kazandırılmış kiralık ürünler
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {completedReturns.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.productName}</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[11px]">
                        ✓ Depozito İade Edildi
                      </span>
                    </div>
                    <p className="mt-0.5 text-gray-500">Müşteri: {item.customerName} ({item.customerEmail})</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">
                      Depozito: <strong className="text-gray-900">{formatCurrency(item.depositAmount)}</strong>
                    </span>
                    <span className="text-emerald-600 font-bold">Stok Yenilendi</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          1. YENİ ÜRÜN EKLEME MODALI (SERVER ACTION)
      ───────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">✨ Yeni Ürün / İlan Ekle</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">Ürün Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Dağcılık Sırt Çantası 70L"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Çoklu Ürün Görselleri (Dinamik Liste & Ön İzleme) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/75 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-800">
                      🖼️ Ürün Görselleri ({newProduct.images.filter(Boolean).length} Görsel)
                    </label>
                    <p className="text-[11px] text-gray-400">İlk sıradaki görsel vitrinde ana kapak resmi olarak kullanılır.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddImageRow(false)}
                    className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
                  >
                    + Görsel URL Ekle
                  </button>
                </div>

                {/* Görsel Giriş Satırları */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {newProduct.images.length === 0 ? (
                    <p className="text-center py-3 text-xs text-gray-400 italic">
                      Henüz görsel eklenmedi. URL ekleyin veya cihazınızdan dosya yükleyin.
                    </p>
                  ) : (
                    newProduct.images.map((imgUrl, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1.5 shadow-2xs">
                        <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                          {idx === 0 ? "★ Kapak" : `#${idx + 1}`}
                        </span>

                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50">
                          {imgUrl ? (
                            <img src={imgUrl} alt={`Ön İzleme ${idx + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                              📷
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="https://... (Görsel URL)"
                          value={imgUrl}
                          onChange={(e) => handleUpdateImageRow(idx, e.target.value, false)}
                          className="flex-1 rounded border border-gray-200 px-2.5 py-1 text-xs focus:border-purple-500 focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveImageRow(idx, false)}
                          className="flex-shrink-0 rounded p-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          title="Görseli Kaldır"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Alt Aksiyonlar: Dosya Yükleme & Hızlı Örnekler */}
                <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 shadow-2xs">
                    📁 Cihazdan Çoklu Dosya Yükle
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleMultipleFilesUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-gray-400">Toplu seçim yapılabilir</span>
                </div>

                <div className="pt-1.5">
                  <p className="text-[11px] font-semibold text-gray-500">Hızlı Örnek Ekle:</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {sampleImages.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => handleAddPresetImage(s.url, false)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dinamik Ana Kategori & Alt Kategori Seçimi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Ana Kategori</label>
                  <select
                    value={newProduct.categoryId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selCat = availableCategories.find((c) => c.id === selId);
                      setNewProduct({
                        ...newProduct,
                        categoryId: selId,
                        subCategoryId: "",
                        categoryName: selCat ? selCat.name : newProduct.categoryName,
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">— Ana Kategori Seçin —</option>
                    {availableCategories
                      .filter((c) => !c.parentId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          📁 {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Alt Kategori</label>
                  <select
                    value={newProduct.subCategoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, subCategoryId: e.target.value })}
                    disabled={!newProduct.categoryId}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">— Alt Kategori Seçin —</option>
                    {availableCategories
                      .filter((c) => c.parentId === newProduct.categoryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          └─ {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">İş Modeli</label>
                <select
                  value={newProduct.type}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, type: e.target.value as "SALE" | "RENTAL" | "BOTH" })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="BOTH">Hem Satılık Hem Kiralık (Hibrit)</option>
                  <option value="RENTAL">Sadece Kiralık</option>
                  <option value="SALE">Sadece Satılık</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {newProduct.type !== "RENTAL" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Satış Fiyatı (₺)</label>
                    <input
                      type="number"
                      placeholder="3500"
                      value={newProduct.salePrice}
                      onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {newProduct.type !== "SALE" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Günlük Kira (₺)</label>
                    <input
                      type="number"
                      placeholder="150"
                      value={newProduct.dailyPrice}
                      onChange={(e) => setNewProduct({ ...newProduct, dailyPrice: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {newProduct.type !== "RENTAL" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Satış Stoku (Adet)</label>
                    <input
                      type="number"
                      value={newProduct.totalStock}
                      onChange={(e) => setNewProduct({ ...newProduct, totalStock: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {newProduct.type !== "SALE" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Kira Birim Sayısı</label>
                    <input
                      type="number"
                      value={newProduct.rentalQuantity}
                      onChange={(e) => setNewProduct({ ...newProduct, rentalQuantity: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              {newProduct.type !== "SALE" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Güvence Depozitosu (₺)</label>
                  <input
                    type="number"
                    value={newProduct.depositAmount}
                    onChange={(e) => setNewProduct({ ...newProduct, depositAmount: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet ve Veritabanına Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          2. ÜRÜN DÜZENLEME MODALI (SERVER ACTION)
      ───────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">✏️ Ürün &amp; Stok Düzenle</h3>
                <p className="text-xs text-gray-400">ID: {editingProduct.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">Ürün Adı</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Çoklu Ürün Görselleri Düzenleme (Dinamik Liste & Ön İzleme) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/75 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-800">
                      🖼️ Ürün Görselleri ({editForm.images.filter(Boolean).length} Görsel)
                    </label>
                    <p className="text-[11px] text-gray-400">İlk sıradaki görsel vitrinde ana kapak resmi olarak kullanılır.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddImageRow(true)}
                    className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
                  >
                    + Görsel URL Ekle
                  </button>
                </div>

                {/* Görsel Giriş Satırları */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editForm.images.length === 0 ? (
                    <p className="text-center py-3 text-xs text-gray-400 italic">
                      Henüz görsel eklenmedi. URL ekleyin veya cihazınızdan dosya yükleyin.
                    </p>
                  ) : (
                    editForm.images.map((imgUrl, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1.5 shadow-2xs">
                        <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                          {idx === 0 ? "★ Kapak" : `#${idx + 1}`}
                        </span>

                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50">
                          {imgUrl ? (
                            <img src={imgUrl} alt={`Ön İzleme ${idx + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                              📷
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="https://... (Görsel URL)"
                          value={imgUrl}
                          onChange={(e) => handleUpdateImageRow(idx, e.target.value, true)}
                          className="flex-1 rounded border border-gray-200 px-2.5 py-1 text-xs focus:border-purple-500 focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveImageRow(idx, true)}
                          className="flex-shrink-0 rounded p-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          title="Görseli Kaldır"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Alt Aksiyonlar: Dosya Yükleme & Hızlı Örnekler */}
                <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 shadow-2xs">
                    📁 Cihazdan Çoklu Dosya Yükle
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleMultipleFilesUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-gray-400">Toplu seçim yapılabilir</span>
                </div>

                <div className="pt-1.5">
                  <p className="text-[11px] font-semibold text-gray-500">Hızlı Örnek Ekle:</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {sampleImages.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => handleAddPresetImage(s.url, true)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dinamik Ana Kategori & Alt Kategori Seçimi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Ana Kategori</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        categoryId: e.target.value,
                        subCategoryId: "",
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">— Ana Kategori Seçin —</option>
                    {availableCategories
                      .filter((c) => !c.parentId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          📁 {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Alt Kategori</label>
                  <select
                    value={editForm.subCategoryId}
                    onChange={(e) => setEditForm({ ...editForm, subCategoryId: e.target.value })}
                    disabled={!editForm.categoryId}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">— Alt Kategori Seçin —</option>
                    {availableCategories
                      .filter((c) => c.parentId === editForm.categoryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          └─ {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {editingProduct.type !== "RENTAL" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Satış Fiyatı (₺)</label>
                    <input
                      type="number"
                      value={editForm.salePrice}
                      onChange={(e) => setEditForm({ ...editForm, salePrice: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-emerald-600"
                    />
                  </div>
                )}
                {editingProduct.type !== "SALE" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Günlük Kira (₺)</label>
                    <input
                      type="number"
                      value={editForm.dailyPrice}
                      onChange={(e) => setEditForm({ ...editForm, dailyPrice: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-purple-700"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {editingProduct.type !== "RENTAL" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Satış Stoku</label>
                    <input
                      type="number"
                      value={editForm.totalStock}
                      onChange={(e) => setEditForm({ ...editForm, totalStock: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {editingProduct.type !== "SALE" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700">Kira Birim Sayısı</label>
                    <input
                      type="number"
                      value={editForm.rentalQuantity}
                      onChange={(e) => setEditForm({ ...editForm, rentalQuantity: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              {editingProduct.type !== "SALE" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Güvence Depozitosu (₺)</label>
                  <input
                    type="number"
                    value={editForm.depositAmount}
                    onChange={(e) => setEditForm({ ...editForm, depositAmount: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
