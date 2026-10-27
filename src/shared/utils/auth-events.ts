/**
 * Auth State Change ve Oturum İzolasyon Olay Yöneticisi
 * 
 * Login, Logout veya Account Switching anında istemci tarafındaki
 * Sepet, Favoriler ve Rol state/cache'lerinin sıfırlanmasını tetikler.
 */

export type AuthStateAction = "LOGIN" | "LOGOUT" | "ACCOUNT_SWITCH";

export interface AuthStateChangeDetail {
  action: AuthStateAction;
  user: { id: string; email?: string; role?: string } | null;
  timestamp: number;
}

export const AUTH_STATE_CHANGE_EVENT = "hybrid:auth-state-changed";

export const CART_STORAGE_KEYS = [
  "cart_id",
  "guest_cart",
  "hybrid_cart",
  "hybrid_cart_id",
  "hybrid_cart_cache",
  "hybrid_cart_summary",
];

export const FAVORITES_STORAGE_KEYS = [
  "guest_favorites",
  "hybrid_favorites",
  "hybrid_favorites_cache",
];

/**
 * React Query / SWR / In-Memory Cache Reset Mekanizması
 * Hesap değişimlerinde (Account Switching) veya oturum kapatıldığında tüm önbelleği temizler.
 */
export const queryClient = {
  clear: () => {
    if (typeof window !== "undefined") {
      try {
        (window as any).__QUERY_CACHE__ = {};
        if (
          typeof (window as any).queryClient?.clear === "function" &&
          (window as any).queryClient !== queryClient
        ) {
          (window as any).queryClient.clear();
        }
        if (typeof (window as any).__SWR_CACHE__?.clear === "function") {
          (window as any).__SWR_CACHE__.clear();
        }
      } catch (err) {
        console.warn("queryClient.clear error:", err);
      }
    }
  },
};

// Global window üzerine queryClient kaydı
if (typeof window !== "undefined") {
  (window as any).queryClient = (window as any).queryClient || queryClient;
}

/**
 * İstemci tarafında tüm oturum ve kullanıcı önbelleklerini derhal temizler.
 */
export function purgeLocalAuthStorage(clearUserSpecificFavs: boolean = true) {
  if (typeof window === "undefined") return;

  try {
    // Sepet verilerini sıfırla
    CART_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));

    // Favori verilerini sıfırla
    FAVORITES_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));

    // Oturum anahtarını sıfırla
    localStorage.removeItem("hybrid_commerce_role");

    // Kullanıcıya özel favori anahtarlarını temizle (hybrid_user_favs_*)
    if (clearUserSpecificFavs) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("hybrid_user_favs_")) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (err) {
    console.warn("Local storage purge error:", err);
  }
}

/**
 * Oturum durumu değişimini tüm istemci bileşenlerine (CartContext, FavoritesContext, vb.) duyurur.
 * React Query / SWR cache'ini tam sıfırlar (queryClient.clear()).
 */
export function notifyAuthStateChange(
  action: AuthStateAction,
  user: { id: string; email?: string; role?: string } | null = null
) {
  if (typeof window === "undefined") return;

  // React Query / SWR önbelleğini tamamen sıfırla
  queryClient.clear();

  if (action === "LOGOUT" || action === "ACCOUNT_SWITCH") {
    purgeLocalAuthStorage(action === "LOGOUT");
  }

  const detail: AuthStateChangeDetail = {
    action,
    user,
    timestamp: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent(AUTH_STATE_CHANGE_EVENT, { detail })
  );
}
