"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/features/auth/actions/auth.actions";
import { serializeProduct, type SerializedProduct } from "@/features/products/types";
import { revalidatePath } from "next/cache";
import type { ToggleFavoriteResult, SyncFavoritesResult } from "../types";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI veya test senaryolarında request context olmadığı durumlar için güvenli pas geçme
  }
}

/**
 * Giriş yapmış kullanıcının favori ürün ID'lerinin listesini döner
 */
export async function getFavoriteProductIds(explicitUserId?: string): Promise<string[]> {
  try {
    if (!prisma?.favorite) {
      console.warn("prisma.favorite model is not ready yet.");
      return [];
    }

    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) return [];
      userId = user.id;
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: "desc" },
    });

    return favorites.map((f) => f.productId);
  } catch (error) {
    console.error("getFavoriteProductIds error:", error);
    return [];
  }
}

/**
 * Giriş yapmış kullanıcının tüm favori ürünlerini detaylarıyla ve serileştirilmiş döner
 */
export async function getFavoriteProducts(explicitUserId?: string): Promise<SerializedProduct[]> {
  try {
    if (!prisma?.favorite) {
      console.warn("prisma.favorite model is not ready yet.");
      return [];
    }

    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) return [];
      userId = user.id;
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            subCategory: true,
            inventory: true,
            rentalPricing: true,
            vendor: {
              select: { id: true, name: true },
            },
            reviews: {
              where: { status: "APPROVED" },
              select: { rating: true },
            },
            _count: {
              select: {
                reviews: { where: { status: "APPROVED" } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favorites.map((f) => serializeProduct(f.product));
  } catch (error) {
    console.error("getFavoriteProducts error:", error);
    return [];
  }
}

/**
 * Misafir kullanıcıların localStorage'da tutulan ürün ID'leri için ürün detaylarını döner
 */
export async function getFavoriteProductsByIds(productIds: string[]): Promise<SerializedProduct[]> {
  try {
    if (!productIds || productIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
      include: {
        category: true,
        subCategory: true,
        inventory: true,
        rentalPricing: true,
        vendor: {
          select: { id: true, name: true },
        },
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        _count: {
          select: {
            reviews: { where: { status: "APPROVED" } },
          },
        },
      },
    });

    return products.map((p) => serializeProduct(p));
  } catch (error) {
    console.error("getFavoriteProductsByIds error:", error);
    return [];
  }
}

/**
 * Ürünü favorilere ekler veya favorilerden çıkarır (Toggle)
 */
export async function toggleFavoriteAction(
  productId: string,
  explicitUserId?: string
): Promise<ToggleFavoriteResult> {
  try {
    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) {
        return {
          success: false,
          isFavorite: false,
          error: "Favori işlemleri için giriş yapmalısınız.",
        };
      }
      userId = user.id;
    }

    // Ürün varlık kontrolü
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return {
        success: false,
        isFavorite: false,
        error: "Favorilenmek istenen ürün bulunamadı.",
      };
    }

    if (!prisma?.favorite) {
      return {
        success: false,
        isFavorite: false,
        error: "Favoriler veritabanı servisi hazırlanıyor.",
      };
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      safeRevalidate("/favorites");
      return {
        success: true,
        isFavorite: false,
        message: "Ürün favorilerinizden kaldırıldı.",
      };
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          productId,
        },
      });
      safeRevalidate("/favorites");
      return {
        success: true,
        isFavorite: true,
        message: "Ürün favorilerinize eklendi.",
      };
    }
  } catch (error) {
    console.error("toggleFavoriteAction error:", error);
    return {
      success: false,
      isFavorite: false,
      error: "Favori işlemi sırasında bir hata oluştu.",
    };
  }
}

/**
 * Misafir modundaki localStorage favorilerini oturum açıldığında veritabanına aktarır (Sync)
 */
export async function syncFavoritesAction(
  guestProductIds: string[],
  explicitUserId?: string
): Promise<SyncFavoritesResult> {
  try {
    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, syncedCount: 0, allFavoriteIds: [] };
      }
      userId = user.id;
    }

    if (!guestProductIds || guestProductIds.length === 0) {
      const currentIds = await getFavoriteProductIds(userId);
      return { success: true, syncedCount: 0, allFavoriteIds: currentIds };
    }

    if (!prisma?.favorite) {
      return { success: false, syncedCount: 0, allFavoriteIds: [] };
    }

    // Gerçekte var olan aktif ürünleri filtrele
    const validProducts = await prisma.product.findMany({
      where: {
        id: { in: guestProductIds },
        active: true,
      },
      select: { id: true },
    });

    let syncedCount = 0;
    for (const p of validProducts) {
      try {
        await prisma.favorite.upsert({
          where: {
            userId_productId: {
              userId,
              productId: p.id,
            },
          },
          create: {
            userId,
            productId: p.id,
          },
          update: {},
        });
        syncedCount++;
      } catch {
        // Zaten ekliyse veya benzersizlik hatasında devam et
      }
    }

    const allFavoriteIds = await getFavoriteProductIds(userId);
    safeRevalidate("/favorites");

    return {
      success: true,
      syncedCount,
      allFavoriteIds,
    };
  } catch (error) {
    console.error("syncFavoritesAction error:", error);
    return {
      success: false,
      syncedCount: 0,
      allFavoriteIds: [],
      error: "Favoriler senkronize edilirken bir hata oluştu.",
    };
  }
}
