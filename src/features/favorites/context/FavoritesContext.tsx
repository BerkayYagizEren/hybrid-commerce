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
const CACHE_KEY = "hybrid_favorites_cache";

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useRole();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevUserRef = useRef<string | null>(null);

  /**
   * İstemci tarafında ilk mount anında anlık önbellekten oku (Sayfa yenilemede sıfır gecikme)
   */
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavoriteIds(parsed);
        }
      }
    } catch {}
  }, []);

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
          const finalIds = (syncRes.success && syncRes.allFavoriteIds)
            ? syncRes.allFavoriteIds
            : await getFavoriteProductIds(user.id);

          setFavoriteIds(finalIds);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(finalIds));
            localStorage.setItem(`hybrid_user_favs_${user.id}`, JSON.stringify(finalIds));
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          } catch {}
        } else {
          // Misafir favorisi yoksa doğrudan kullanıcının veritabanı favorilerini getir
          const dbIds = await getFavoriteProductIds(user.id);
          setFavoriteIds(dbIds);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(dbIds));
            localStorage.setItem(`hybrid_user_favs_${user.id}`, JSON.stringify(dbIds));
          } catch {}
        }
      } else {
        // Misafir kullanıcı: localStorage'dan oku
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            const ids = Array.isArray(parsed) ? parsed : [];
            setFavoriteIds(ids);
            localStorage.setItem(CACHE_KEY, JSON.stringify(ids));
          } else {
            setFavoriteIds([]);
            localStorage.removeItem(CACHE_KEY);
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

  // Sekmeler arası (Cross-tab) senkronizasyon dinleyicisi
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY || e.key === CACHE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              setFavoriteIds(parsed);
            }
          } catch {}
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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
      const nextIds = willBeFavorite
        ? [...favoriteIds, productId]
        : favoriteIds.filter((id) => id !== productId);

      // 1. ANLIK OPTIMISTIC UI GÜNCELLEMESİ (Anında renk değişimi)
      setFavoriteIds(nextIds);

      // 2. HER İKİ MODDA DA LOCALSTORAGE'A ANINDA YAZ (Sayfa yenilemede anlık kalıcılık)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(nextIds));
        if (!user) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextIds));
        } else {
          localStorage.setItem(`hybrid_user_favs_${user.id}`, JSON.stringify(nextIds));
        }
      } catch (e) {
        console.error("localStorage favorite save error:", e);
      }

      if (!user) {
        // Misafir modu anında tamamlandı
        return willBeFavorite;
      }

      // 3. ÜYE MODU: VERİTABANINA SERVER ACTION KAYDI
      try {
        const res = await toggleFavoriteAction(productId, user.id);
        if (!res.success) {
          // Başarısız olursa eski haline geri döndür (Rollback)
          console.warn("toggleFavoriteAction başarısız, rollback uygulanıyor:", res.error);
          setFavoriteIds(favoriteIds);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(favoriteIds));
            localStorage.setItem(`hybrid_user_favs_${user.id}`, JSON.stringify(favoriteIds));
          } catch {}
          return !willBeFavorite;
        }
        return res.isFavorite;
      } catch (err) {
        console.error("toggleFavorite error, rollback uygulanıyor:", err);
        setFavoriteIds(favoriteIds);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(favoriteIds));
          localStorage.setItem(`hybrid_user_favs_${user.id}`, JSON.stringify(favoriteIds));
        } catch {}
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
