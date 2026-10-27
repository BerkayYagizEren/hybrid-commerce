"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/features/auth/actions/auth.actions";
import type { SerializedProduct } from "@/features/products/types";
import { revalidatePath } from "next/cache";
import type { ToggleFavoriteResult, SyncFavoritesResult } from "../types";
import { FavoritesService } from "../services/favorites.service";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI veya test senaryolarında request context olmadığı durumlar için güvenli pas geçme
  }
}

/**
 * Giriş yapmış kullanıcının favori ürün ID'lerinin listesini döner.
 * Doğrudan FavoritesService (veritabanı) üzerinden sorgular.
 */
export async function getFavoriteProductIds(explicitUserId?: string): Promise<string[]> {
  try {
    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) return [];
      userId = user.id;
    }

    return await FavoritesService.getFavoriteProductIds(userId);
  } catch (error) {
    console.error("getFavoriteProductIds error:", error);
    return [];
  }
}

/**
 * Giriş yapmış kullanıcının tüm favori ürünlerini detaylarıyla ve serileştirilmiş döner.
 */
export async function getFavoriteProducts(explicitUserId?: string): Promise<SerializedProduct[]> {
  try {
    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) return [];
      userId = user.id;
    }

    return await FavoritesService.getFavoriteProducts(userId);
  } catch (error) {
    console.error("getFavoriteProducts error:", error);
    return [];
  }
}

/**
 * Misafir kullanıcıların localStorage'da tutulan ürün ID'leri için ürün detaylarını döner.
 */
export async function getFavoriteProductsByIds(productIds: string[]): Promise<SerializedProduct[]> {
  try {
    return await FavoritesService.getFavoriteProductsByIds(productIds);
  } catch (error) {
    console.error("getFavoriteProductsByIds error:", error);
    return [];
  }
}

/**
 * Ürünü favorilere ekler veya favorilerden çıkarır (Toggle).
 * Doğrudan veritabanında kullanıcının userId değeri ile ilişkilendirilir.
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

    const result = await FavoritesService.toggleFavorite(userId, productId);
    if (result.success) {
      safeRevalidate("/favorites");
    }
    return result;
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
 * Misafir modundaki localStorage favorilerini oturum açıldığında veritabanına aktarır (Sync).
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

    const result = await FavoritesService.syncFavorites(userId, guestProductIds);
    if (result.success) {
      safeRevalidate("/favorites");
    }
    return result;
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
