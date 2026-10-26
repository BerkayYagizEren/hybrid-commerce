import Link from "next/link";
import { getCurrentUser } from "@/features/auth/actions/auth.actions";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string; current?: string; from?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const requiredRole = params.required || "Yönetici";
  const currentRole = params.current || user?.role || "Giriş Yapılmamış";
  const fromPath = params.from || "bu sayfaya";

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 ring-8 ring-red-50">
          <span className="text-3xl">🚫</span>
        </div>

        <h1 className="mt-5 text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
          Erişim Reddedildi (403)
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-800">{fromPath}</code> sayfasına
          erişmek için yetkiniz bulunmuyor.
        </p>

        <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-left">
          <div className="flex items-center justify-between py-1 text-xs text-gray-600">
            <span>Gereken Rol:</span>
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
              {requiredRole}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 text-xs text-gray-600">
            <span>Mevcut Rolünüz:</span>
            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800">
              {currentRole}
            </span>
          </div>
          {user && (
            <div className="flex items-center justify-between border-t border-gray-200/60 pt-2 mt-2 text-xs text-gray-600">
              <span>Giriş Yapılan Hesap:</span>
              <span className="font-semibold text-gray-900">{user.email}</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Farklı Hesapla Giriş Yap
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
