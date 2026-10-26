"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signupAction } from "@/features/auth/actions/auth.actions";
import { useRole } from "@/shared/providers/RoleContext";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setRole } = useRole();

  const redirectParam = searchParams.get("redirect") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"CUSTOMER" | "VENDOR">("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await signupAction({
        name,
        email,
        password,
        role: accountType,
        redirect: redirectParam,
      });

      if (!res.success) {
        setError(res.error || "Hesap oluşturulamadı.");
        return;
      }

      setSuccessMsg(res.message || "Hesabınız başarıyla oluşturuldu!");
      if (res.user?.role) {
        setRole(res.user.role);
      }

      // Dinamik yönlendirme
      const target = res.redirectUrl || (accountType === "VENDOR" ? "/vendor/dashboard" : "/orders");
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
            Yeni Hesap Oluşturun
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Satın al, kirala veya kendi mağazanı açarak ürün listele!
          </p>
        </div>

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

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Hesap Türü Seçimi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Hesap Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("CUSTOMER")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-bold transition ${
                  accountType === "CUSTOMER"
                    ? "border-blue-500 bg-blue-50/80 text-blue-800 shadow-sm ring-1 ring-blue-400"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">👤</span>
                <span>Müşteri</span>
                <span className="text-[10px] font-normal text-gray-400">Satın Al &amp; Kirala</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("VENDOR")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-bold transition ${
                  accountType === "VENDOR"
                    ? "border-purple-500 bg-purple-50/80 text-purple-800 shadow-sm ring-1 ring-purple-400"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">🏪</span>
                <span>Satıcı / Mağaza</span>
                <span className="text-[10px] font-normal text-gray-400">Ürün Listele &amp; Yönet</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Ad Soyad / Mağaza Adı
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Caner Erkin veya Doğa Sporları LTD"
              className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              E-posta Adresi
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caner@example.com"
              className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Şifre
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {isPending
              ? "Hesap Oluşturuluyor..."
              : accountType === "VENDOR"
              ? "Mağaza Hesabı Oluştur"
              : "Kayıt Ol ve Başla"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Zaten bir hesabınız var mı?{" "}
          <Link
            href={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
            className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Yükleniyor...</div>}>
      <SignupForm />
    </Suspense>
  );
}
