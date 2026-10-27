"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRole } from "@/shared/providers/RoleContext";
import {
  getFavoriteProductIds,
  toggleFavoriteAction,
  syncFavoritesAction,
} from "../actions/favorite.actions";
import type { FavoritesContextType } from "../types";

const LOCAL_STORAGE_KEY = "hybrid_favorites";

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useRole();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevUserRef = useRef<string | null>(null);

  /**
   * Favori ID'lerini yükleme ve senkronizasyon mekanizması
   */
  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Kullanıcı oturum açmış: localStorage'daki misafir favorileri kontrol et
        let guestIds: string[] = [];
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              guestIds = parsed;
            }
          }
        } catch {
          guestIds = [];
        }

        if (guestIds.length > 0) {
          // Misafir favorilerini veritabanına senkronize et
          const syncRes = await syncFavoritesAction(guestIds, user.id);
          if (syncRes.success && syncRes.allFavoriteIds) {
            setFavoriteIds(syncRes.allFavoriteIds);
          } else {
            const dbIds = await getFavoriteProductIds(user.id);
            setFavoriteIds(dbIds);
          }
          // Başarılı senkronizasyon sonrası localStorage'ı temizle
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } else {
          // Misafir favorisi yoksa doğrudan kullanıcının veritabanı favorilerini getir
          const dbIds = await getFavoriteProductIds(user.id);
          setFavoriteIds(dbIds);
        }
      } else {
        // Misafir kullanıcı: localStorage'dan oku
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setFavoriteIds(Array.isArray(parsed) ? parsed : []);
          } else {
            setFavoriteIds([]);
          }
        } catch {
          setFavoriteIds([]);
        }
      }
    } catch (error) {
      console.error("loadFavorites error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Oturum durumu değiştiğinde favorileri yenile/senkronize et
  useEffect(() => {
    const currentUserId = user ? user.id : null;
    loadFavorites();
    prevUserRef.current = currentUserId;
  }, [user, loadFavorites]);

  /**
   * Verilen ürün ID'sinin favorilerde olup olmadığını kontrol eder
   */
  const isFavorite = useCallback(
    (productId: string) => {
      return favoriteIds.includes(productId);
    },
    [favoriteIds]
  );

  /**
   * Favori Durumunu Değiştir (Toggle)
   * Misafir modunda: localStorage
   * Giriş yapmış modda: DB Server Action + Optimistic UI
   */
  const toggleFavorite = useCallback(
    async (productId: string): Promise<boolean> => {
      const willBeFavorite = !favoriteIds.includes(productId);

      if (!user) {
        // ── Misafir Modu (LocalStorage) ──
        const nextIds = willBeFavorite
          ? [...favoriteIds, productId]
          : favoriteIds.filter((id) => id !== productId);

        setFavoriteIds(nextIds);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextIds));
        } catch (e) {
          console.error("localStorage favorite save error:", e);
        }
        return willBeFavorite;
      }

      // ── Giriş Yapmış Kullanıcı Modu (DB + Optimistic) ──
      // 1. Optimistic UI güncellemesi
      const prevIds = [...favoriteIds];
      const optimisticIds = willBeFavorite
        ? [...favoriteIds, productId]
        : favoriteIds.filter((id) => id !== productId);

      setFavoriteIds(optimisticIds);

      // 2. Server Action çağrısı
      try {
        const res = await toggleFavoriteAction(productId, user.id);
        if (!res.success) {
          // Başarısız olursa eski haline geri döndür (Rollback)
          setFavoriteIds(prevIds);
          return !willBeFavorite;
        }
        return res.isFavorite;
      } catch (err) {
        console.error("toggleFavorite error:", err);
        setFavoriteIds(prevIds);
        return !willBeFavorite;
      }
    },
    [favoriteIds, user]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isLoading,
        isFavorite,
        toggleFavorite,
        favoriteCount: favoriteIds.length,
        refreshFavorites: loadFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
