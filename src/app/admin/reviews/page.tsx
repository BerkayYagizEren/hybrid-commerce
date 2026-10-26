"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getAdminReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from "@/features/reviews/actions/review.actions";
import { StarRating } from "@/features/reviews/components/StarRating";
import type { ReviewWithProductAndUser, ReviewStatus } from "@/features/reviews/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithProductAndUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await getAdminReviews(statusFilter);
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const handleApprove = (reviewId: string) => {
    startTransition(async () => {
      const res = await approveReview(reviewId, "Yönetici tarafından onaylandı.");
      if (res.success) {
        setActionMessage("✅ Yorum onaylandı ve yayına alındı.");
        loadReviews();
      } else {
        alert(res.error || "Hata oluştu.");
      }
    });
  };

  const handleReject = (reviewId: string) => {
    const reason = prompt("Reddetme gerekçesi belirtin (isteğe bağlı):", "İçerik kurallarına uygun bulunmadı.");
    if (reason === null) return;

    startTransition(async () => {
      const res = await rejectReview(reviewId, reason);
      if (res.success) {
        setActionMessage("❌ Yorum reddedildi ve yayından kaldırıldı.");
        loadReviews();
      } else {
        alert(res.error || "Hata oluştu.");
      }
    });
  };

  const handleDelete = (reviewId: string) => {
    if (!confirm("Bu yorumu kalıcı olarak silmek istediğinizden emin misiniz?")) return;

    startTransition(async () => {
      const res = await deleteReview(reviewId);
      if (res.success) {
        setActionMessage("🗑️ Yorum kalıcı olarak silindi.");
        loadReviews();
      } else {
        alert(res.error || "Hata oluştu.");
      }
    });
  };

  // İstatistikler
  const totalCount = reviews.length;
  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;
  const approvedCount = reviews.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = reviews.filter((r) => r.status === "REJECTED").length;

  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.product.name.toLowerCase().includes(q) ||
      (r.user.name && r.user.name.toLowerCase().includes(q)) ||
      r.user.email.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Üst Navigasyon & Başlık */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
              <Link href="/admin/dashboard" className="hover:text-blue-600 transition">
                Yönetim Paneli
              </Link>
              <span>/</span>
              <span className="text-gray-900">Yorum &amp; Değerlendirme Moderasyonu</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
              ⭐ Yorum Moderasyon Paneli
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Tüm platformdaki müşteri yorumlarını denetleyin, onaylayın veya uygunsuz olanları engelleyin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
            >
              ← Admin Konsolu
            </Link>
          </div>
        </div>

        {/* Aksiyon Bildirimi */}
        {actionMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 font-normal cursor-pointer"
            >
              ✕ Kapat
            </button>
          </div>
        )}

        {/* Metrik Kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-bold text-gray-500 block">Toplam Yorum</span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">{totalCount}</span>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
            <span className="text-xs font-bold text-amber-700 block">⏳ Onay Bekleyen</span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">{pendingCount}</span>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
            <span className="text-xs font-bold text-emerald-700 block">✅ Onaylanan</span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">{approvedCount}</span>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-2xs">
            <span className="text-xs font-bold text-rose-700 block">❌ Reddedilen</span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">{rejectedCount}</span>
          </div>
        </div>

        {/* Filtre ve Arama Barı */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          {/* Durum Sekmeleri */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { label: "Tümü", value: "ALL" },
                { label: "⏳ Onay Bekleyenler", value: "PENDING" },
                { label: "✅ Onaylananlar", value: "APPROVED" },
                { label: "❌ Reddedilenler", value: "REJECTED" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.value
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Arama Inputu */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Ürün, müşteri adı veya yorum ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Yorum Tablosu / Listesi */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-3" />
              <p className="text-xs font-semibold">Yorumlar yükleniyor...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 transition hover:bg-gray-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Sol: Ürün Bilgisi ve Müşteri */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Durum Rozeti */}
                      {rev.status === "PENDING" && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          ⏳ Onay Bekliyor
                        </span>
                      )}
                      {rev.status === "APPROVED" && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          ✅ Onaylandı
                        </span>
                      )}
                      {rev.status === "REJECTED" && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                          ❌ Reddedildi
                        </span>
                      )}

                      {/* Doğrulanmış Alıcı Rozeti */}
                      {rev.isVerified && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          ✓ Doğrulanmış Alıcı
                        </span>
                      )}

                      <span className="text-[11px] text-gray-400">
                        {new Date(rev.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Ürün & Müşteri Satırı */}
                    <div className="flex items-center gap-3">
                      {rev.product.images && rev.product.images[0] && (
                        <img
                          src={rev.product.images[0]}
                          alt={rev.product.name}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                        />
                      )}
                      <div>
                        <Link
                          href={`/products/${rev.product.slug}`}
                          className="font-bold text-xs text-gray-900 hover:text-blue-600 transition line-clamp-1"
                        >
                          📦 {rev.product.name}
                        </Link>
                        <p className="text-[11px] text-gray-500">
                          Müşteri: <strong>{rev.user.name || rev.user.email}</strong> ({rev.user.email})
                        </p>
                      </div>
                    </div>

                    {/* Yıldız & Yorum Metni */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={rev.rating} size="sm" />
                        <span className="text-xs font-bold text-gray-700">({rev.rating} / 5)</span>
                      </div>
                      <p className="text-xs text-gray-800 bg-gray-50/80 p-3 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-line">
                        "{rev.comment}"
                      </p>
                    </div>

                    {/* Moderasyon Notu */}
                    {rev.moderationNote && (
                      <p className="text-[11px] text-gray-400 italic">
                        Not: {rev.moderationNote}
                      </p>
                    )}
                  </div>

                  {/* Sağ: Moderasyon Eylem Butonları */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 lg:pt-0">
                    {rev.status !== "APPROVED" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleApprove(rev.id)}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                        title="Yorumu Onayla ve Yayına Al"
                      >
                        ✅ Onayla
                      </button>
                    )}

                    {rev.status !== "REJECTED" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleReject(rev.id)}
                        className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition cursor-pointer"
                        title="Yorumu Reddet ve Yayından Kaldır"
                      >
                        ❌ Reddet
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(rev.id)}
                      className="rounded-xl border border-gray-200 bg-white p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Kalıcı Olarak Sil"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400">
              <span className="text-4xl block mb-2">⭐</span>
              <p className="text-sm font-bold text-gray-700">Seçili filtrede yorum bulunamadı.</p>
              <p className="text-xs mt-1">Farklı bir durum sekmesi veya arama terimi seçebilirsiniz.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
