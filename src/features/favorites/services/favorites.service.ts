import prisma from "@/lib/prisma";
import { serializeProduct, type SerializedProduct } from "@/features/products/types";
import type { ToggleFavoriteResult, SyncFavoritesResult } from "../types";

/**
 * Favoriler Servisi (FavoritesService)
 * 
 * Veritabanı tabanlı, kullanıcıya sıkı sıkıya bağlı ve hesap bazlı izole favori yönetimi.
 * Tüm okuma ve yazma işlemleri doğrudan PostgreSQL (prisma.favorite) üzerinde çalışır.
 * Kullanıcı çıkış yaptığında (logout) veritabanındaki kayıtlar ASLA silinmez;
 * yalnızca oturum / istemci state'i sıfırlanır.
 */
export class FavoritesService {
  /**
   * Aktif kullanıcının veritabanındaki tüm favori ürün ID'lerini döner.
   * prisma.favorite.findMany({ where: { userId } }) sorgusunu kullanır.
   */
  static async getFavoriteProductIds(userId: string): Promise<string[]> {
    if (!userId) return [];
    if (!prisma?.favorite) {
      console.warn("prisma.favorite modeli henüz hazır değil.");
      return [];
    }

    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        select: { productId: true },
        orderBy: { createdAt: "desc" },
      });

      return favorites.map((f) => f.productId);
    } catch (error) {
      console.error("FavoritesService.getFavoriteProductIds error:", error);
      return [];
    }
  }

  /**
   * Aktif kullanıcının favorilerini serileştirilmiş ürün detayları ile döner.
   */
  static async getFavoriteProducts(userId: string): Promise<SerializedProduct[]> {
    if (!userId) return [];
    if (!prisma?.favorite) {
      console.warn("prisma.favorite modeli henüz hazır değil.");
      return [];
    }

    try {
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
      console.error("FavoritesService.getFavoriteProducts error:", error);
      return [];
    }
  }

  /**
   * Misafir veya belirli ID listesi için ürünleri döner.
   */
  static async getFavoriteProductsByIds(productIds: string[]): Promise<SerializedProduct[]> {
    if (!productIds || productIds.length === 0) return [];

    try {
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
      console.error("FavoritesService.getFavoriteProductsByIds error:", error);
      return [];
    }
  }

  /**
   * Kullanıcının favori durumunu toggle eder (ekler / kaldırır).
   * Doğrudan prisma.favorite üzerinde çalışır.
   */
  static async toggleFavorite(userId: string, productId: string): Promise<ToggleFavoriteResult> {
    if (!userId) {
      return {
        success: false,
        isFavorite: false,
        error: "Favori işlemleri için giriş yapmalısınız (userId gereklidir).",
      };
    }

    if (!prisma?.favorite) {
      return {
        success: false,
        isFavorite: false,
        error: "Favoriler veritabanı servisi hazırlanıyor.",
      };
    }

    try {
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
        return {
          success: true,
          isFavorite: true,
          message: "Ürün favorilerinize eklendi.",
        };
      }
    } catch (error) {
      console.error("FavoritesService.toggleFavorite error:", error);
      return {
        success: false,
        isFavorite: false,
        error: "Favori işlemi sırasında bir hata oluştu.",
      };
    }
  }

  /**
   * Belirli bir ürünün kullanıcının favorilerinde olup olmadığını doğrular.
   */
  static async isFavorite(userId: string, productId: string): Promise<boolean> {
    if (!userId || !productId || !prisma?.favorite) return false;
    try {
      const count = await prisma.favorite.count({
        where: { userId, productId },
      });
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Misafir favorilerini kullanıcı hesabına aktarır (Sync).
   */
  static async syncFavorites(userId: string, guestProductIds: string[]): Promise<SyncFavoritesResult> {
    if (!userId) {
      return { success: false, syncedCount: 0, allFavoriteIds: [] };
    }

    if (!guestProductIds || guestProductIds.length === 0) {
      const currentIds = await this.getFavoriteProductIds(userId);
      return { success: true, syncedCount: 0, allFavoriteIds: currentIds };
    }

    if (!prisma?.favorite) {
      return { success: false, syncedCount: 0, allFavoriteIds: [] };
    }

    try {
      const validProducts = await prisma.product.findMany({
        where: { id: { in: guestProductIds }, active: true },
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
            update: {},
            create: {
              userId,
              productId: p.id,
            },
          });
          syncedCount++;
        } catch {
          // Unique kısıtı veya çakışma durumunda devam et
        }
      }

      const allFavoriteIds = await this.getFavoriteProductIds(userId);
      return {
        success: true,
        syncedCount,
        allFavoriteIds,
      };
    } catch (error) {
      console.error("FavoritesService.syncFavorites error:", error);
      return {
        success: false,
        syncedCount: 0,
        allFavoriteIds: [],
        error: "Favori senkronizasyonu başarısız oldu.",
      };
    }
  }
}
