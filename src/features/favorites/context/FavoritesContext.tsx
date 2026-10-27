"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
   * İstemci tarafında mount anı kontrolü:
   * Misafir favori modu kaldırıldı. Kullanıcı giriş yapmamışsa yerel depolamadan favori yüklenmez.
   */
  useEffect(() => {
    try {
      if (!isLoggedIn) {
        setFavoriteIds([]);
        localStorage.removeItem(GUEST_FAVORITES_KEY);
        FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      }
    } catch {}
  }, [isLoggedIn]);

  /**
   * Favori ID'lerini yükleme mekanizması
   * Yalnızca oturum açılmışken doğrudan Prisma üzerinden veritabanından çeker.
   * Giriş yapılmamışsa favoriler listesi her zaman boştur.
   */
  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeUser) {
        // Oturum açan kullanıcının favorilerini doğrudan veritabanından getir
        const dbIds = await getFavoriteProductIds(activeUser.id);
        setFavoriteIds(dbIds);
        try {
          localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(dbIds));
        } catch {}
      } else {
        // Misafir modu kaldırıldı: Oturumu olmayan kullanıcının favori listesi boştur
        setFavoriteIds([]);
        try {
          localStorage.removeItem(GUEST_FAVORITES_KEY);
          FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
        } catch {}
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
   * Misafir modu kaldırıldı: Kullanıcı oturum açmamışsa localStorage'a ekleme, doğrudan login'e yönlendir
   * Giriş yapmış modda: Doğrudan PostgreSQL (prisma.favorite) + Optimistic UI
   */
  const toggleFavorite = useCallback(
    async (productId: string): Promise<boolean> => {
      // 1. Giriş Kontrolü ve Yönlendirme:
      // Kullanıcı oturumu yoksa localStorage'a ekleme yapılmaz, anında giriş sayfasına yönlendirilir
      if (!activeUser) {
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname + window.location.search;
          const redirectUrl =
            currentPath && currentPath !== "/"
              ? `/login?redirect=${encodeURIComponent(currentPath)}`
              : "/login?redirect=/favorites";
          router.push(redirectUrl);
        }
        return false;
      }

      const willBeFavorite = !favoriteIds.includes(productId);
      const nextIds = willBeFavorite
        ? [...favoriteIds, productId]
        : favoriteIds.filter((id) => id !== productId);

      // 2. Anlık Optimistic UI Güncellemesi
      setFavoriteIds(nextIds);

      // 3. Kullanıcıya özel önbellek kaydı
      try {
        localStorage.setItem(`hybrid_user_favs_${activeUser.id}`, JSON.stringify(nextIds));
      } catch (e) {
        console.error("localStorage favorite save error:", e);
      }

      // 4. Doğrudan Prisma Veritabanına (prisma.favorite) Kayıt
      try {
        const res = await toggleFavoriteAction(productId, activeUser.id);
        if (!res.success) {
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
    [favoriteIds, activeUser, router]
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
