"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logoutAction, demoLoginAction } from "@/features/auth/actions/auth.actions";
import type { SessionUser } from "@/lib/auth-token";
import { notifyAuthStateChange, purgeLocalAuthStorage, queryClient } from "@/shared/utils/auth-events";

export type UserRoleType = "CUSTOMER" | "VENDOR" | "ADMIN";

interface RoleContextType {
  role: UserRoleType;
  user: SessionUser | null;
  isLoading: boolean;
  setRole: (role: UserRoleType) => void;
  switchDemoRole: (role: UserRoleType) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const [role, setRoleState] = useState<UserRoleType>(initialUser?.role || "CUSTOMER");
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setRoleState(data.user.role);
          localStorage.setItem("hybrid_commerce_role", data.user.role);
          return;
        }
      }
      setUser(null);
      const saved = localStorage.getItem("hybrid_commerce_role") as UserRoleType | null;
      if (saved && (saved === "CUSTOMER" || saved === "VENDOR" || saved === "ADMIN")) {
        setRoleState(saved);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const setRole = (newRole: UserRoleType) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("hybrid_commerce_role", newRole);
    }
  };

  const switchDemoRole = async (targetRole: UserRoleType) => {
    setIsLoading(true);
    try {
      const res = await demoLoginAction(targetRole);
      if (res.success && res.user) {
        queryClient.clear();
        setUser(res.user);
        setRoleState(res.user.role);
        localStorage.setItem("hybrid_commerce_role", res.user.role);
        notifyAuthStateChange("ACCOUNT_SWITCH", res.user);
        if (res.redirectUrl) {
          router.push(res.redirectUrl);
          router.refresh();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      queryClient.clear();
      await logoutAction();
      setUser(null);
      setRoleState("CUSTOMER");
      if (typeof window !== "undefined") {
        localStorage.removeItem("hybrid_commerce_role");
        localStorage.removeItem("guest_favorites");
        localStorage.removeItem("hybrid_favorites");
        localStorage.removeItem("hybrid_favorites_cache");
        purgeLocalAuthStorage();
      }
      notifyAuthStateChange("LOGOUT");
      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        user,
        isLoading,
        setRole,
        switchDemoRole,
        logout,
        refreshUser,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

export function useSession() {
  const { user, isLoading } = useRole();
  return {
    data: user ? { user } : null,
    user: user ?? null,
    isLoggedIn: Boolean(user),
    status: isLoading ? "loading" : user ? "authenticated" : "unauthenticated",
  };
}
