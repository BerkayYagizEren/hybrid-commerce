"use client";

import { useRole } from "@/shared/providers/RoleContext";
import type { SessionUser } from "@/lib/auth-token";

export interface SessionData {
  user: SessionUser | null;
}

export interface UseSessionReturn {
  data: SessionData | null;
  user: SessionUser | null;
  isLoggedIn: boolean;
  status: "loading" | "authenticated" | "unauthenticated";
}

/**
 * useSession Hook
 * 
 * Aktif oturum durumunu, kullanıcı bilgilerini ve giriş yapılıp yapılmadığını döner.
 * RoleContext ile senkronize çalışır.
 */
export function useSession(): UseSessionReturn {
  const { user, isLoading } = useRole();

  return {
    data: user ? { user } : null,
    user: user ?? null,
    isLoggedIn: Boolean(user),
    status: isLoading ? "loading" : user ? "authenticated" : "unauthenticated",
  };
}
