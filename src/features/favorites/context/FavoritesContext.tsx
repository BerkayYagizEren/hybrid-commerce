"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRole } from "@/shared/providers/RoleContext";
import type { SessionUser } from "@/lib/auth-token";
import {
  getFavoriteProductIds,
  toggleFavoriteAction,
  syncFavoritesAction,
} from "../actions/favorite.actions";
import type { FavoritesContextType } from "../types";
import {
  AUTH_STATE_CHANGE_EVENT,
  FAVORITES_STORAGE_KEYS,
  purgeLocalAuthStorage,
  queryClient,
} from "@/shared/utils/auth-events";

export const GUEST_FAVORITES_KEY = "guest_favorites";
export const LEGACY_STORAGE_KEY = "hybrid_favorites";
export const CACHE_KEY = "hybrid_favorites_cache";

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const { user: roleUser } = useRole();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(initialUser);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevUserRef = useRef<string | null>(initialUser ? initialUser.id : null);

  // Rol veya oturum güncellendiğinde aktif kullanıcıyı senkronize et
  useEffect(() => {
    setCurrentUser(roleUser);
  }, [roleUser]);

  const activeUser = currentUser ?? roleUser ?? initialUser ?? null;
  const isLoggedIn = Boolean(activeUser);

  /**
   * İstemci tarafında ilk mount anında yerel depolamadan oku.
   * Yalnızca kullanıcı giriş yapmamışsa (!isLoggedIn) guest_favorites okunur.
   */
  useEffect(() => {
    try {
      if (!isLoggedIn) {
        const stored = localStorage.getItem(GUEST_FAVORITES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavoriteIds(parsed);
          }
        }
      }
    } catch {}
  }, [isLoggedIn]);

  /**
   * Favori ID'lerini yükleme ve senkronizasyon mekanizması
   * Giriş yapılmışken doğrudan Prisma üzerinden veritabanından çeker.
   * Misafir favorisi varsa kullanıcı favorileriyle merge edip localStorage'ı temizler.
   */
  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeUser) {
        // Oturum açan kullanıcı: Eski misafir verisi varsa hesaba aktar (Guest-to-User Merge)
        let guestIds: string[] = [];
        try {
          const stored = localStorage.getItem(GUEST_FAVORITES_KEY);
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
          // Misafir favorilerini veritabanındaki kullanıcı favorileriyle birleştir (Merge)
          const syncRes = await syncFavoritesAction(guestIds, activeUser.id);

          // Hemen ardından misafir localStorage verilerini derhal temizle
          try {
            localStorage.removeItem(GUEST_FAVORITES_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            localStorage.removeItem(CACHE_KEY);
            FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
          } catch {}

          const finalIds =
            syncRes.success && syncRes.allFavoriteIds
              ? syncRes.allFavoriteIds
              : await getFavoriteProductIds(activeUser.id);

          setFavoriteIds(finalIds);
          try {
            localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(finalIds));
          } catch {}
        } else {
          // Doğrudan o kullanıcının veritabanı favorilerini getir (prisma.favorite.findMany)
          const dbIds = await getFavoriteProductIds(activeUser.id);
          setFavoriteIds(dbIds);
          try {
            localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(dbIds));
          } catch {}
        }
      } else {
        // Misafir kullanıcı: localStorage'dan oku
        try {
          const stored = localStorage.getItem(GUEST_FAVORITES_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            const ids = Array.isArray(parsed) ? parsed : [];
            setFavoriteIds(ids);
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
  }, [activeUser]);

  // Oturum durumu değiştiğinde hesap izolasyonu ve favori temizliği
  useEffect(() => {
    const currentUserId = activeUser ? activeUser.id : null;
    const prevUserId = prevUserRef.current;

    // 1. Kullanıcı çıkış yaptı (logout):
    // Veritabanındaki kayıtlar KESİNLİKLE silinmez; yalnızca React state'i ve istemci önbelleği sıfırlanır!
    if (prevUserId && !currentUserId) {
      queryClient.clear();
      setFavoriteIds([]);
      try {
        FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(`hybrid_user_favs_${prevUserId}`);
      } catch {}
    }

    // 2. Farklı bir hesaba geçildi: Yeni oturuma eski favorilerin sızmasını engellemek için cache tam sıfırlanır
    if (prevUserId && currentUserId && prevUserId !== currentUserId) {
      queryClient.clear();
      setFavoriteIds([]);
      try {
        FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }

    loadFavorites();
    prevUserRef.current = currentUserId;
  }, [activeUser, loadFavorites]);

  // Global Auth State Change dinleyicisi
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const action = customEvent.detail?.action;
      const newUser = customEvent.detail?.user;

      // React Query / SWR / In-memory cache temizliği
      queryClient.clear();

      if (action === "LOGOUT") {
        setCurrentUser(null);
        setFavoriteIds([]);
        try {
          FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
        } catch {}
      } else if (action === "ACCOUNT_SWITCH" || action === "LOGIN") {
        if (newUser) {
          setCurrentUser(newUser);
        }
        setFavoriteIds([]);
        try {
          FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
        } catch {}
        loadFavorites();
      }
    };

    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
  }, [loadFavorites]);

  // Sekmeler arası (Cross-tab) senkronizasyon dinleyicisi
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === GUEST_FAVORITES_KEY ||
        e.key === LEGACY_STORAGE_KEY ||
        e.key === CACHE_KEY
      ) {
        if (e.newValue && !isLoggedIn) {
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
  }, [isLoggedIn]);

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
   * Misafir modunda: localStorage ('guest_favorites')
   * Giriş yapmış modda: Doğrudan PostgreSQL (prisma.favorite) + Optimistic UI
   */
  const toggleFavorite = useCallback(
    async (productId: string): Promise<boolean> => {
      const willBeFavorite = !favoriteIds.includes(productId);
      const nextIds = willBeFavorite
        ? [...favoriteIds, productId]
        : favoriteIds.filter((id) => id !== productId);

      // 1. ANLIK OPTIMISTIC UI GÜNCELLEMESİ (Anında renk değişimi)
      setFavoriteIds(nextIds);

      // 2. MODA GÖRE İZOLE LOCALSTORAGE KAYDI
      try {
        if (!activeUser) {
          localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(nextIds));
        } else {
          localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(nextIds));
        }
      } catch (e) {
        console.error("localStorage favorite save error:", e);
      }

      if (!activeUser) {
        // Misafir modu anında tamamlandı
        return willBeFavorite;
      }

      // 3. ÜYE MODU: VERİTABANINA SERVER ACTION KAYDI (prisma.favorite)
      try {
        const res = await toggleFavoriteAction(productId, activeUser.id);
        if (!res.success) {
          // Başarısız olursa eski haline geri döndür (Rollback)
          console.warn("toggleFavoriteAction başarısız, rollback uygulanıyor:", res.error);
          setFavoriteIds(favoriteIds);
          try {
            localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(favoriteIds));
          } catch {}
          return !willBeFavorite;
        }
        return res.isFavorite;
      } catch (err) {
        console.error("toggleFavorite error, rollback uygulanıyor:", err);
        setFavoriteIds(favoriteIds);
        try {
          localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(favoriteIds));
        } catch {}
        return !willBeFavorite;
      }
    },
    [favoriteIds, activeUser]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favorites: favoriteIds,
        setFavorites: setFavoriteIds,
        isLoading,
        isLoggedIn,
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
