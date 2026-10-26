/**
 * E2E Auth, Role-based Middleware & Redirection Verification Suite
 * 
 * Tests:
 * 1. Unauthenticated route protection (/admin/*, /vendor/*, /orders, /checkout -> redirect to /login)
 * 2. Role-based authorization & 403 (/unauthorized) enforcement:
 *    - CUSTOMER blocked from /admin and /vendor
 *    - VENDOR allowed on /vendor and /orders, blocked from /admin
 *    - ADMIN allowed on /admin, /vendor, and /orders
 * 3. Logged-in redirect away from /login & /signup
 * 4. Dynamic post-auth redirection logic in auth.actions
 * 5. /api/auth/me endpoint session reflection
 */

import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";
import { loginAction, signupAction, demoLoginAction } from "../src/features/auth/actions/auth.actions";
import { prisma } from "../src/lib/prisma";

const BASE_URL = "http://localhost:3000";

interface TestResult {
  step: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL";
}

const results: TestResult[] = [];

function assert(step: string, condition: boolean, expected: string, actual: string) {
  const status: "PASS" | "FAIL" = condition ? "PASS" : "FAIL";
  results.push({ step, expected, actual, status });
  const icon = condition ? "✅" : "❌";
  console.log(`${icon} [${status}] ${step} -> Expected: ${expected} | Actual: ${actual}`);
}

async function runAuthMiddlewareTests() {
  console.log("\n=======================================================");
  console.log("🛡️  HIBURT COMMERCE: AUTH & MIDDLEWARE TEST SUITE");
  console.log("=======================================================\n");

  // 1. Generate Tokens for Customer, Vendor, and Admin
  const customerToken = await createSessionToken({
    id: "cmvpkvzz30000ruuo3c65jrw2",
    email: "ahmet@example.com",
    name: "Ahmet Yılmaz",
    role: "CUSTOMER",
    roles: ["CUSTOMER"],
  });

  const vendorToken = await createSessionToken({
    id: "cmvplw0v40001rub40qh31bhs",
    email: "satici@kampdunyasi.com",
    name: "Kamp Dünyası Mağazası",
    role: "VENDOR",
    roles: ["VENDOR", "CUSTOMER"],
  });

  const adminToken = await createSessionToken({
    id: "cmvplw0v00000rub4byw1trhd",
    email: "admin@hybridcommerce.com",
    name: "Sistem Yöneticisi",
    role: "ADMIN",
    roles: ["ADMIN"],
  });

  // ─────────────────────────────────────────────────────────────
  // GRUP 1: Unauthenticated Koruma Testleri
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 1: Giriş Yapmamış (Unauthenticated) Kullanıcı Koruması ---");

  // 1.1 /admin/dashboard
  const resAdminUnauth = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
  const locAdmin = resAdminUnauth.headers.get("location") || "";
  assert(
    "Unauthenticated -> /admin/dashboard erişim engeli",
    resAdminUnauth.status === 307 || resAdminUnauth.status === 302,
    "307/302 Redirect to /login",
    `${resAdminUnauth.status} Location: ${locAdmin}`
  );
  assert(
    "/admin/dashboard -> /login redirect parametresi içeriyor",
    locAdmin.includes("/login") && locAdmin.includes("redirect=%2Fadmin%2Fdashboard"),
    "Hedef /login?redirect=%2Fadmin%2Fdashboard",
    locAdmin
  );

  // 1.2 /vendor/dashboard
  const resVendorUnauth = await fetch(`${BASE_URL}/vendor/dashboard`, { redirect: "manual" });
  const locVendor = resVendorUnauth.headers.get("location") || "";
  assert(
    "Unauthenticated -> /vendor/dashboard erişim engeli",
    resVendorUnauth.status === 307 || resVendorUnauth.status === 302,
    "307/302 Redirect to /login",
    `${resVendorUnauth.status} Location: ${locVendor}`
  );

  // 1.3 /orders
  const resOrdersUnauth = await fetch(`${BASE_URL}/orders`, { redirect: "manual" });
  const locOrders = resOrdersUnauth.headers.get("location") || "";
  assert(
    "Unauthenticated -> /orders erişim engeli",
    resOrdersUnauth.status === 307 || resOrdersUnauth.status === 302,
    "307/302 Redirect to /login",
    `${resOrdersUnauth.status} Location: ${locOrders}`
  );

  // 1.4 /checkout
  const resCheckoutUnauth = await fetch(`${BASE_URL}/checkout`, { redirect: "manual" });
  const locCheckout = resCheckoutUnauth.headers.get("location") || "";
  assert(
    "Unauthenticated -> /checkout erişim engeli",
    resCheckoutUnauth.status === 307 || resCheckoutUnauth.status === 302,
    "307/302 Redirect to /login",
    `${resCheckoutUnauth.status} Location: ${locCheckout}`
  );

  // ─────────────────────────────────────────────────────────────
  // GRUP 2: Rol Bazlı Yetkilendirme (Customer Rolü)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 2: Müşteri (CUSTOMER) Rolü Yetkilendirmesi ---");

  // 2.1 Customer trying /admin/dashboard -> 403 /unauthorized
  const resCustToAdmin = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
    redirect: "manual",
  });
  const locCustToAdmin = resCustToAdmin.headers.get("location") || "";
  assert(
    "CUSTOMER -> /admin/dashboard erişimi engellenmeli (/unauthorized)",
    resCustToAdmin.status === 307 && locCustToAdmin.includes("/unauthorized?required=ADMIN"),
    "Redirect to /unauthorized?required=ADMIN",
    `${resCustToAdmin.status} Location: ${locCustToAdmin}`
  );

  // 2.2 Customer trying /vendor/dashboard -> /unauthorized
  const resCustToVendor = await fetch(`${BASE_URL}/vendor/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
    redirect: "manual",
  });
  const locCustToVendor = resCustToVendor.headers.get("location") || "";
  assert(
    "CUSTOMER -> /vendor/dashboard erişimi engellenmeli (/unauthorized)",
    resCustToVendor.status === 307 && locCustToVendor.includes("/unauthorized?required=VENDOR"),
    "Redirect to /unauthorized?required=VENDOR",
    `${resCustToVendor.status} Location: ${locCustToVendor}`
  );

  // 2.3 Customer accessing /orders -> 200 OK
  const resCustOrders = await fetch(`${BASE_URL}/orders`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
  });
  assert(
    "CUSTOMER -> /orders sayfasına erişebilmeli",
    resCustOrders.status === 200,
    "200 OK",
    `${resCustOrders.status}`
  );

  // ─────────────────────────────────────────────────────────────
  // GRUP 3: Rol Bazlı Yetkilendirme (Vendor Rolü)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 3: Satıcı (VENDOR) Rolü Yetkilendirmesi ---");

  // 3.1 Vendor accessing /vendor/dashboard -> 200 OK
  const resVendorDash = await fetch(`${BASE_URL}/vendor/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
  });
  assert(
    "VENDOR -> /vendor/dashboard sayfasına erişebilmeli",
    resVendorDash.status === 200,
    "200 OK",
    `${resVendorDash.status}`
  );

  // 3.2 Vendor trying /admin/dashboard -> /unauthorized
  const resVendorToAdmin = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
    redirect: "manual",
  });
  const locVendorToAdmin = resVendorToAdmin.headers.get("location") || "";
  assert(
    "VENDOR -> /admin/dashboard erişimi engellenmeli (/unauthorized)",
    resVendorToAdmin.status === 307 && locVendorToAdmin.includes("/unauthorized?required=ADMIN"),
    "Redirect to /unauthorized?required=ADMIN",
    `${resVendorToAdmin.status} Location: ${locVendorToAdmin}`
  );

  // 3.3 Vendor accessing /orders -> 200 OK
  const resVendorOrders = await fetch(`${BASE_URL}/orders`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
  });
  assert(
    "VENDOR -> /orders sayfasına erişebilmeli",
    resVendorOrders.status === 200,
    "200 OK",
    `${resVendorOrders.status}`
  );

  // ─────────────────────────────────────────────────────────────
  // GRUP 4: Rol Bazlı Yetkilendirme (Admin Rolü)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 4: Yönetici (ADMIN) Rolü Yetkilendirmesi ---");

  // 4.1 Admin accessing /admin/dashboard -> 200 OK
  const resAdminDash = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });
  assert(
    "ADMIN -> /admin/dashboard sayfasına tam erişim",
    resAdminDash.status === 200,
    "200 OK",
    `${resAdminDash.status}`
  );

  // 4.2 Admin accessing /vendor/dashboard -> 200 OK (Admin satıcı panellerini denetleyebilir)
  const resAdminToVendor = await fetch(`${BASE_URL}/vendor/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });
  assert(
    "ADMIN -> /vendor/dashboard sayfasına erişebilmeli",
    resAdminToVendor.status === 200,
    "200 OK",
    `${resAdminToVendor.status}`
  );

  // ─────────────────────────────────────────────────────────────
  // GRUP 5: Giriş Yapmış Kullanıcı /login & /signup Yönlendirmesi
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 5: Zaten Oturum Açmış Kullanıcının /login Yönlendirmesi ---");

  const resAdminLoginRedirect = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
    redirect: "manual",
  });
  const locAdminLogin = resAdminLoginRedirect.headers.get("location") || "";
  assert(
    "Giriş yapmış ADMIN /login'e gittiğinde /admin/dashboard'a yönlenir",
    resAdminLoginRedirect.status === 307 && locAdminLogin.includes("/admin/dashboard"),
    "Redirect to /admin/dashboard",
    `${resAdminLoginRedirect.status} -> ${locAdminLogin}`
  );

  const resCustLoginRedirect = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
    redirect: "manual",
  });
  const locCustLogin = resCustLoginRedirect.headers.get("location") || "";
  assert(
    "Giriş yapmış CUSTOMER /login'e gittiğinde /orders'a yönlenir",
    resCustLoginRedirect.status === 307 && locCustLogin.includes("/orders"),
    "Redirect to /orders",
    `${resCustLoginRedirect.status} -> ${locCustLogin}`
  );

  // ─────────────────────────────────────────────────────────────
  // GRUP 6: Dinamik Post-Auth Redirection Mantığı
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 6: Dinamik Giriş & Kayıt Yönlendirmeleri (Server Actions) ---");

  // 6.1 Admin Login
  const adminLoginRes = await loginAction({ email: "admin@hybridcommerce.com", password: "password123" });
  assert(
    "Admin girişi redirectUrl'i /admin/dashboard olmalı",
    adminLoginRes.success && adminLoginRes.redirectUrl === "/admin/dashboard",
    "/admin/dashboard",
    `${adminLoginRes.redirectUrl}`
  );

  // 6.2 Vendor Login
  const vendorLoginRes = await loginAction({ email: "satici@kampdunyasi.com", password: "password123" });
  assert(
    "Vendor girişi redirectUrl'i /vendor/dashboard olmalı",
    vendorLoginRes.success && vendorLoginRes.redirectUrl === "/vendor/dashboard",
    "/vendor/dashboard",
    `${vendorLoginRes.redirectUrl}`
  );

  // 6.3 Customer Login
  const custLoginRes = await loginAction({ email: "ahmet@example.com", password: "password123" });
  assert(
    "Customer girişi redirectUrl'i /orders olmalı",
    custLoginRes.success && custLoginRes.redirectUrl === "/orders",
    "/orders",
    `${custLoginRes.redirectUrl}`
  );

  // 6.4 Sign-up New Customer
  const testEmail = `newcust_${Date.now()}@test.dev`;
  const signupRes = await signupAction({
    name: "Yeni Müşteri Test",
    email: testEmail,
    password: "secure_pass_123",
    role: "CUSTOMER",
  });
  assert(
    "Yeni Müşteri kaydı sonrası dinamik yönlendirme /orders olmalı",
    signupRes.success && signupRes.redirectUrl === "/orders",
    "/orders",
    `${signupRes.redirectUrl}`
  );

  // 6.5 Sign-up New Vendor
  const testVendorEmail = `newvendor_${Date.now()}@test.dev`;
  const signupVendorRes = await signupAction({
    name: "Yeni Butik Mağaza",
    email: testVendorEmail,
    password: "secure_pass_123",
    role: "VENDOR",
  });
  assert(
    "Yeni Satıcı kaydı sonrası dinamik yönlendirme /vendor/dashboard olmalı",
    signupVendorRes.success && signupVendorRes.redirectUrl === "/vendor/dashboard",
    "/vendor/dashboard",
    `${signupVendorRes.redirectUrl}`
  );

  // ─────────────────────────────────────────────────────────────
  // GRUP 7: /api/auth/me Oturum Uç Noktası
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- GRUP 7: /api/auth/me Oturum Senkronizasyon Uç Noktası ---");

  const meUnauth = await (await fetch(`${BASE_URL}/api/auth/me`)).json();
  assert(
    "/api/auth/me oturumsuz istekte user: null dönmeli",
    meUnauth.user === null,
    "user: null",
    JSON.stringify(meUnauth)
  );

  const meAuth = await (
    await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
    })
  ).json();
  assert(
    "/api/auth/me geçerli token ile oturum sahibini dönmeli",
    meAuth.user?.role === "ADMIN" && meAuth.user?.email === "admin@hybridcommerce.com",
    "role: ADMIN, email: admin@hybridcommerce.com",
    JSON.stringify(meAuth.user)
  );

  // ─────────────────────────────────────────────────────────────
  // ÖZET RAPOR
  // ─────────────────────────────────────────────────────────────
  console.log("\n=======================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = total - passed;
  console.log(`📊 TEST SONUÇLARI: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 TÜM AUTH VE MIDDLEWARE KORUMA TESTLERİ EKSİKSİZ GEÇTİ!");
  } else {
    console.error("❌ BAZI TESTLER BAŞARISIZ OLDU!");
  }
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

runAuthMiddlewareTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
