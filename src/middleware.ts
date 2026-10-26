import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Oturum çerezini oku ve doğrula
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(sessionCookie);

  // 2. Kullanıcı zaten giriş yapmışsa ve /login veya /signup sayfasına gitmek istiyorsa paneline yönlendir
  if (user && (pathname === "/login" || pathname === "/signup")) {
    let target = "/orders";
    if (user.role === "ADMIN") target = "/admin/dashboard";
    else if (user.role === "VENDOR") target = "/vendor/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 3. /admin rotası koruması (Sadece ADMIN erişebilir)
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname + search);
      loginUrl.searchParams.set("reason", "auth_required");
      return NextResponse.redirect(loginUrl);
    }

    if (user.role !== "ADMIN") {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("required", "ADMIN");
      unauthorizedUrl.searchParams.set("current", user.role);
      unauthorizedUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 4. /vendor rotası koruması (VENDOR veya ADMIN erişebilir)
  if (pathname.startsWith("/vendor")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname + search);
      loginUrl.searchParams.set("reason", "auth_required");
      return NextResponse.redirect(loginUrl);
    }

    if (user.role !== "VENDOR" && user.role !== "ADMIN") {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("required", "VENDOR");
      unauthorizedUrl.searchParams.set("current", user.role);
      unauthorizedUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 5. Müşteri korumalı sayfalar: /orders ve /checkout (Giriş yapılmış olmalıdır)
  if (pathname.startsWith("/orders") || pathname.startsWith("/checkout")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname + search);
      loginUrl.searchParams.set("reason", "auth_required");
      return NextResponse.redirect(loginUrl);
    }
  }

  // İzin verilen istekler devam eder
  const response = NextResponse.next();

  // Kullanıcı bilgisi varsa istek başlığına da iliştirebiliriz
  if (user) {
    response.headers.set("x-user-id", user.id);
    response.headers.set("x-user-role", user.role);
  }

  return response;
}

// Yalnızca korumalı veya auth ile ilgili rotalarda middleware çalıştır
export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/vendor",
    "/vendor/:path*",
    "/orders",
    "/orders/:path*",
    "/checkout",
    "/checkout/:path*",
    "/login",
    "/signup",
  ],
};
