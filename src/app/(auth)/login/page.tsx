"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, demoLoginAction } from "@/features/auth/actions/auth.actions";
import { useRole } from "@/shared/providers/RoleContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setRole } = useRole();

  const redirectParam = searchParams.get("redirect") || "";
  const reasonParam = searchParams.get("reason") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await loginAction({
        email,
        password,
        redirect: redirectParam,
      });

      if (!res.success) {
        setError(res.error || "Giriş başarısız oldu.");
        return;
      }

      setSuccessMsg(res.message || "Giriş başarılı!");
      if (res.user?.role) {
        setRole(res.user.role);
      }

      // Dinamik post-auth yönlendirmesi
      const target = res.redirectUrl || "/orders";
      router.push(target);
      router.refresh();
    });
  };

  const handleQuickDemo = (role: "ADMIN" | "VENDOR" | "CUSTOMER") => {
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await demoLoginAction(role, redirectParam);

      if (!res.success) {
        setError(res.error || "Demo girişi başarısız.");
        return;
      }

      setSuccessMsg(`${role} girişi başarılı! Yönlendiriliyorsunuz...`);
      setRole(role);

      const target = res.redirectUrl || "/orders";
      router.push(target);
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-gray-200/80 bg-white p-8 shadow-2xl shadow-blue-500/5">
        {/* Başlık ve Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
            <span className="text-lg font-black text-white">HC</span>
          </div>
          <h2 className="mt-4 text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
            Hesabınıza Giriş Yapın
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Hibrit E-Ticaret ve Kiralama Platformu
          </p>
        </div>

        {/* Bilgilendirme ve Hata Uyarıları */}
        {reasonParam === "auth_required" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
            ⚠️ Bu sayfaya erişebilmek için lütfen önce giriş yapın.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            ❌ {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            ✅ {successMsg}
          </div>
        )}

        {/* Hızlı Demo Girişi (Tek Tıkla Doğrulama) */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="mb-2 text-center text-xs font-bold text-blue-900 uppercase tracking-wider">
            ⚡ Tek Tıkla Rol Bazlı Demo Giriş
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleQuickDemo("ADMIN")}
              className="group flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-white p-2.5 shadow-sm transition hover:border-amber-400 hover:bg-amber-50/60 active:scale-95 disabled:opacity-50"
            >
              <span className="text-lg">🛡️</span>
              <span className="mt-1 text-xs font-bold text-amber-900">Admin</span>
              <span className="text-[10px] text-gray-400">Yönetim</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleQuickDemo("VENDOR")}
              className="group flex flex-col items-center justify-center rounded-xl border border-purple-200 bg-white p-2.5 shadow-sm transition hover:border-purple-400 hover:bg-purple-50/60 active:scale-95 disabled:opacity-50"
            >
              <span className="text-lg">🏪</span>
              <span className="mt-1 text-xs font-bold text-purple-900">Satıcı</span>
              <span className="text-[10px] text-gray-400">Mağaza</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleQuickDemo("CUSTOMER")}
              className="group flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-white p-2.5 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/60 active:scale-95 disabled:opacity-50"
            >
              <span className="text-lg">👤</span>
              <span className="mt-1 text-xs font-bold text-blue-900">Müşteri</span>
              <span className="text-[10px] text-gray-400">Alışveriş</span>
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-gray-200" />
          <span className="absolute bg-white px-3 text-xs text-gray-400">veya e-posta ile</span>
        </div>

        {/* Standart Giriş Formu */}
        <form onSubmit={handleStandardLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              E-posta Adresi
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@hybridcommerce.com"
              className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Şifre
              </label>
              <span className="text-[11px] text-gray-400">Demo şifre: 123456 / admin123</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Hesabınız yok mu?{" "}
          <Link
            href={`/signup${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
            className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Yeni Hesap Oluştur
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Yükleniyor...</div>}>
      <LoginForm />
    </Suspense>
  );
}
