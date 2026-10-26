"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth-token";
import type {
  CreateReviewInput,
  ReviewActionResult,
  ProductReviewsData,
  ProductRatingStats,
  ReviewWithProductAndUser,
  ReviewStatus,
} from "../types";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI veya test senaryolarında request context olmadığı durumlar için güvenli pas geçme
  }
}

/**
 * Mevcut oturum açmış kullanıcıyı al
 */
async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Kullanıcının ürünü satın alıp almadığını veya kiralayıp kiralamadığını doğrula (Verified Buyer Check)
 */
export async function checkVerifiedBuyer(userId: string, productId: string): Promise<boolean> {
  try {
    // 1. Satın alma kontrolü: Başarılı siparişlerde (PAID, CONFIRMED, PROCESSING, SHIPPED, DELIVERED) bu ürün var mı?
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: { in: ["PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
      },
    });

    if (orderItem) return true;

    // 2. Kiralama kontrolü: Tamamlanmış veya aktif kiralama kaydı var mı?
    const rental = await prisma.rental.findFirst({
      where: {
        userId,
        productId,
        status: { in: ["ACTIVE", "RETURNED", "RETURN_REQUESTED", "RESERVED"] },
      },
    });

    return Boolean(rental);
  } catch (error) {
    console.error("checkVerifiedBuyer error:", error);
    return false;
  }
}

/**
 * Ürünün ortalama puanını ve yorum sayısını onaylı yorumlar üzerinden yeniden hesapla
 */
export async function recalculateProductRating(productId: string): Promise<{
  averageRating: number;
  reviewCount: number;
}> {
  const approvedReviews = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    select: { rating: true },
  });

  const reviewCount = approvedReviews.length;
  const averageRating =
    reviewCount > 0
      ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
      : 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating,
      reviewCount,
    },
  });

  return { averageRating, reviewCount };
}

/**
 * Ürün detay sayfası için onaylanmış yorumları, dağılımı ve kullanıcının durumunu getir
 */
export async function getProductReviews(productId: string): Promise<ProductReviewsData> {
  try {
    const currentUser = await getCurrentUser();

    // 1. Onaylanmış yorumları çek
    const reviews = await prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Dağılım ve istatistik hesapla
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating] = (counts[r.rating] || 0) + 1;
      }
    });

    const totalReviews = reviews.length;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star] || 0,
      percentage: totalReviews > 0 ? Math.round(((counts[star] || 0) / totalReviews) * 100) : 0,
    }));

    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

    const stats: ProductRatingStats = {
      averageRating,
      totalReviews,
      distribution,
    };

    // 3. Kullanıcıya özel durumlar (Doğrulanmış alıcı mı, yorum yapmış mı?)
    let userReview = null;
    let isVerified = false;

    if (currentUser) {
      isVerified = await checkVerifiedBuyer(currentUser.id, productId);

      // Kullanıcının varsa kendi yorumunu (onay bekliyor olsa bile) bul
      userReview = await prisma.review.findUnique({
        where: {
          userId_productId: {
            userId: currentUser.id,
            productId,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    }

    return {
      stats,
      reviews,
      userReview,
      isVerifiedBuyer: isVerified,
      canReview: Boolean(currentUser && isVerified),
    };
  } catch (error) {
    console.error("getProductReviews error:", error);
    return {
      stats: {
        averageRating: 0,
        totalReviews: 0,
        distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, percentage: 0 })),
      },
      reviews: [],
      userReview: null,
      isVerifiedBuyer: false,
      canReview: false,
    };
  }
}

/**
 * Yorum & Puan Ekle veya Güncelle (Server Action)
 */
export async function createReview(
  data: CreateReviewInput,
  explicitUserId?: string
): Promise<ReviewActionResult> {
  try {
    let userId = explicitUserId;

    if (!userId) {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "Yorum yapabilmek için lütfen önce giriş yapınız.",
        };
      }
      userId = currentUser.id;
    }

    // Puan doğrulaması (1 ile 5 arasında tamsayı)
    const rating = Math.round(Number(data.rating));
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return {
        success: false,
        error: "Lütfen 1 ile 5 arasında geçerli bir puan veriniz.",
      };
    }

    // Yorum metni doğrulaması
    const comment = data.comment?.trim() || "";
    if (comment.length < 5) {
      return {
        success: false,
        error: "Yorumunuz en az 5 karakter uzunluğunda olmalıdır.",
      };
    }

    // Ürün varlık kontrolü
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, slug: true, vendorId: true },
    });

    if (!product) {
      return { success: false, error: "Değerlendirilecek ürün bulunamadı." };
    }

    // Verified Buyer Denetimi
    const isVerified = await checkVerifiedBuyer(userId, data.productId);
    if (!isVerified) {
      return {
        success: false,
        error:
          "Yalnızca bu ürünü satın almış veya kiralamış olan doğrulanmış müşteriler değerlendirme yapabilir.",
      };
    }

    // Durum: Açıkça belirtilmişse onu kullan, yoksa moderasyon için PENDING
    const status: ReviewStatus = data.status || "PENDING";

    // Upsert ile kullanıcının ürün için mevcut yorumunu güncelle veya yeni oluştur
    const review = await prisma.review.upsert({
      where: {
        userId_productId: {
          userId,
          productId: data.productId,
        },
      },
      update: {
        rating,
        comment,
        isVerified: true,
        status,
        updatedAt: new Date(),
      },
      create: {
        userId,
        productId: data.productId,
        rating,
        comment,
        isVerified: true,
        status,
      },
    });

    // Eğer doğrudan APPROVED olarak eklendiyse puanı güncelle
    if (status === "APPROVED") {
      await recalculateProductRating(data.productId);
    }

    safeRevalidate(`/products/${product.slug}`);
    safeRevalidate(`/products`);
    safeRevalidate(`/admin/reviews`);
    safeRevalidate(`/vendor/dashboard`);

    const statusMessage =
      status === "APPROVED"
        ? "Yorumunuz ve puanınız başarıyla yayınlandı!"
        : "Yorumunuz alındı! Moderatör onayından sonra ürün sayfasında yayınlanacaktır.";

    return {
      success: true,
      message: statusMessage,
      review,
    };
  } catch (error) {
    console.error("createReview error:", error);
    const msg = error instanceof Error ? error.message : "Yorum kaydedilirken bir hata oluştu.";
    return { success: false, error: msg };
  }
}

/**
 * Admin Moderasyonu: Tüm yorumları listele
 */
export async function getAdminReviews(
  statusFilter?: ReviewStatus | "ALL"
): Promise<ReviewWithProductAndUser[]> {
  try {
    const where: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        product: {
          select: { id: true, name: true, slug: true, images: true, vendorId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reviews as unknown as ReviewWithProductAndUser[];
  } catch (error) {
    console.error("getAdminReviews error:", error);
    return [];
  }
}

/**
 * Satıcı Moderasyonu: Satıcının kendi ürünlerine ait yorumları listele
 */
export async function getVendorReviews(
  vendorId?: string,
  statusFilter?: ReviewStatus | "ALL"
): Promise<ReviewWithProductAndUser[]> {
  try {
    let effectiveVendorId = vendorId;

    if (!effectiveVendorId) {
      const currentUser = await getCurrentUser();
      if (!currentUser) return [];
      effectiveVendorId = currentUser.id;
    }

    const where: any = {
      product: {
        vendorId: effectiveVendorId,
      },
    };

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        product: {
          select: { id: true, name: true, slug: true, images: true, vendorId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reviews as unknown as ReviewWithProductAndUser[];
  } catch (error) {
    console.error("getVendorReviews error:", error);
    return [];
  }
}

/**
 * Yorumu Onayla (Moderasyon Eylemi: APPROVED)
 */
export async function approveReview(
  reviewId: string,
  moderationNote?: string
): Promise<ReviewActionResult> {
  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { slug: true } } },
    });

    if (!existing) {
      return { success: false, error: "Yorum bulunamadı." };
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "APPROVED",
        moderationNote: moderationNote || "Yönetici tarafından onaylandı.",
      },
    });

    // Ürün ortalama puanını ve yorum sayısını güncelle
    await recalculateProductRating(existing.productId);

    safeRevalidate(`/products/${existing.product.slug}`);
    safeRevalidate(`/products`);
    safeRevalidate(`/admin/reviews`);
    safeRevalidate(`/vendor/dashboard`);

    return {
      success: true,
      message: "Yorum başarıyla onaylandı ve ürün sayfasında yayına alındı.",
      review: updated,
    };
  } catch (error) {
    console.error("approveReview error:", error);
    const msg = error instanceof Error ? error.message : "Yorum onaylanamadı.";
    return { success: false, error: msg };
  }
}

/**
 * Yorumu Reddet (Moderasyon Eylemi: REJECTED)
 */
export async function rejectReview(
  reviewId: string,
  moderationNote?: string
): Promise<ReviewActionResult> {
  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { slug: true } } },
    });

    if (!existing) {
      return { success: false, error: "Yorum bulunamadı." };
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "REJECTED",
        moderationNote: moderationNote || "İçerik kurallarına uygun bulunmadı.",
      },
    });

    // Puanı yeniden hesapla
    await recalculateProductRating(existing.productId);

    safeRevalidate(`/products/${existing.product.slug}`);
    safeRevalidate(`/products`);
    safeRevalidate(`/admin/reviews`);
    safeRevalidate(`/vendor/dashboard`);

    return {
      success: true,
      message: "Yorum reddedildi ve yayından kaldırıldı.",
      review: updated,
    };
  } catch (error) {
    console.error("rejectReview error:", error);
    const msg = error instanceof Error ? error.message : "Yorum reddedilemedi.";
    return { success: false, error: msg };
  }
}

/**
 * Yorumu Kalıcı Olarak Sil
 */
export async function deleteReview(reviewId: string): Promise<ReviewActionResult> {
  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { slug: true } } },
    });

    if (!existing) {
      return { success: false, error: "Silinecek yorum bulunamadı." };
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Puanı güncelle
    await recalculateProductRating(existing.productId);

    safeRevalidate(`/products/${existing.product.slug}`);
    safeRevalidate(`/products`);
    safeRevalidate(`/admin/reviews`);
    safeRevalidate(`/vendor/dashboard`);

    return {
      success: true,
      message: "Yorum veritabanından kalıcı olarak silindi.",
    };
  } catch (error) {
    console.error("deleteReview error:", error);
    const msg = error instanceof Error ? error.message : "Yorum silinemedi.";
    return { success: false, error: msg };
  }
}
