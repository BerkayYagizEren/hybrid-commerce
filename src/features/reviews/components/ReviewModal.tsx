"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "./StarRating";
import { createReview } from "../actions/review.actions";
import Link from "next/link";

interface ReviewModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  canReview: boolean;
  isLoggedIn: boolean;
  isVerifiedBuyer: boolean;
  existingRating?: number;
  existingComment?: string;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Çok Kötü 😞",
  2: "Kötü 😕",
  3: "Orta / İdare Eder 😐",
  4: "İyi / Başarılı 🙂",
  5: "Mükemmel! Kesinlikle Öneririm 🤩",
};

export function ReviewModal({
  productId,
  productName,
  isOpen,
  onClose,
  canReview,
  isLoggedIn,
  isVerifiedBuyer,
  existingRating = 5,
  existingComment = "",
  onSuccess,
}: ReviewModalProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(existingRating || 5);
  const [comment, setComment] = useState<string>(existingComment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReview) return;

    if (comment.trim().length < 5) {
      setErrorMessage("Yorumunuz en az 5 karakter olmalıdır.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createReview({
        productId,
        rating,
        comment: comment.trim(),
      });

      if (res.success) {
        alert(`✅ ${res.message || "Değerlendirmeniz başarıyla iletildi!"}`);
        onClose();
        onSuccess?.();
        router.refresh();
      } else {
        setErrorMessage(res.error || "Yorum kaydedilirken bir hata oluştu.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Beklenmedik bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
          aria-label="Kapat"
        >
          ✕
        </button>

        {/* Modal Başlığı */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 mb-2">
            ⭐ Ürün Değerlendirmesi
          </div>
          <h3 className="text-xl font-bold text-gray-900 leading-snug">{productName}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Ürün hakkındaki deneyimlerinizi diğer müşterilerle paylaşın.
          </p>
        </div>

        {/* Durum 1: Giriş Yapılmamış */}
        {!isLoggedIn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center space-y-4">
            <span className="text-3xl">🔒</span>
            <h4 className="font-bold text-amber-900 text-sm">Giriş Yapmanız Gerekiyor</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Değerlendirme yapabilmek ve sipariş geçmişinizi doğrulamak için lütfen oturum açın.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Giriş Yap
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Vazgeç
              </button>
            </div>
          </div>
        ) : !isVerifiedBuyer ? (
          /* Durum 2: Giriş Yapılmış ama Ürün Satın Alınmamış / Kiralanmamış (Doğrulanmamış Müşteri) */
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center space-y-4">
            <span className="text-3xl">🛡️</span>
            <h4 className="font-bold text-rose-900 text-sm">Doğrulanmış Alıcı Şartı</h4>
            <p className="text-xs text-rose-800 leading-relaxed">
              Platformumuzda dürüst ve güvenilir değerlendirmeler için <strong>yalnızca bu ürünü satın almış veya kiralamış olan doğrulanmış müşteriler</strong> yorum yapabilir.
            </p>
            <p className="text-[11px] text-gray-500">
              Bu ürün için henüz tamamlanmış bir satın alma veya kiralama kaydınız bulunmuyor.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-gray-800"
              >
                Anladım
              </button>
            </div>
          </div>
        ) : (
          /* Durum 3: Doğrulanmış Müşteri - Form Alanı */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Doğrulanmış Alıcı Rozeti */}
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800">
              <span>✅</span>
              <span>Doğrulanmış Müşteri olarak değerlendirme yapıyorsunuz.</span>
            </div>

            {/* Hata Mesajı */}
            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Yıldız Seçimi */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-center">
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Puanınızı Seçin
              </label>
              <div className="flex justify-center py-1">
                <StarRating
                  rating={rating}
                  interactive={true}
                  size="lg"
                  onChange={(val) => setRating(val)}
                />
              </div>
              <span className="mt-2 block text-xs font-bold text-amber-600 transition-all">
                {RATING_LABELS[rating] || `${rating} Yıldız`}
              </span>
            </div>

            {/* Yorum Metni */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="comment" className="block text-xs font-bold text-gray-700">
                  Deneyiminiz &amp; Yorumunuz
                </label>
                <span className="text-[10px] text-gray-400">
                  {comment.length} karakter (Min. 5)
                </span>
              </div>
              <textarea
                id="comment"
                rows={4}
                required
                minLength={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ürünün malzeme kalitesi, performansı, kiralama deneyimi veya kullanım kolaylığı hakkında detay verin..."
                className="w-full rounded-2xl border border-gray-200 p-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition"
              />
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isSubmitting || comment.trim().length < 5}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <span>Değerlendirmeyi Gönder →</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
