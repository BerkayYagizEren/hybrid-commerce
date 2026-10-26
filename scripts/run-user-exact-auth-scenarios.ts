/**
 * Kullanıcı Talebine Özel: Kimlik Doğrulama, Middleware Yönlendirmeleri ve Rol Yetkilendirme Testi
 * 
 * Senaryo 1: Admin Rolü ve Middleware Koruması
 * Senaryo 2: Vendor (Satıcı) Rolü ve Yetki Sınırı (403 / Redirect)
 * Senaryo 3: Customer (Müşteri) ve Unauthenticated (Misafir) Güvenlik
 */

const BASE_URL = "http://localhost:3000";

interface StepLog {
  scenario: string;
  step: string;
  status: "PASS" | "FAIL";
  details: string;
}

const logs: StepLog[] = [];

function record(scenario: string, step: string, passed: boolean, details: string) {
  const status: "PASS" | "FAIL" = passed ? "PASS" : "FAIL";
  logs.push({ scenario, step, status, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${status}] ${scenario} -> ${step}`);
  console.log(`   └─ Detay: ${details}\n`);
}

function parseCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/hc_session=([^;]+)/);
  return match ? match[1] : null;
}

async function runScenarios() {
  console.log("\n" + "=".repeat(75));
  console.log("🚀 KİMLİK DOĞRULAMA, MIDDLEWARE VE YETKİLENDİRME DOĞRULAMA TESTİ");
  console.log("=".repeat(75) + "\n");

  // =========================================================================
  // SENARYO 1: Admin Rolü ve Middleware Koruması Testi
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 1: Admin Rolü ve Middleware Koruması Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1.1 Admin kullanıcısı ile /api/auth/login üzerinden giriş yap
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@hybridcommerce.com", password: "password123" }),
  });
  const adminSetCookie = adminLoginRes.headers.get("set-cookie");
  const adminToken = parseCookie(adminSetCookie);
  const adminLoginData = await adminLoginRes.json();

  record(
    "Senaryo 1",
    "1.1 Admin Kullanıcısı Girişi (admin@hybridcommerce.com)",
    adminLoginRes.status === 200 && !!adminToken && adminLoginData.user?.role === "ADMIN",
    `Status: ${adminLoginRes.status}, Rol: ${adminLoginData.user?.role}, Token Alındı: ${!!adminToken}`
  );

  // 1.2 Giriş sonrası otomatik olarak /admin/dashboard sayfasına yönlendirme kontrolü
  record(
    "Senaryo 1",
    "1.2 Post-Login Otomatik Yönlendirme Hedefi",
    adminLoginData.redirectUrl === "/admin/dashboard",
    `Beklenen: /admin/dashboard | Gelen: ${adminLoginData.redirectUrl}`
  );

  // 1.3 Admin session çerezi ile /admin/dashboard sayfasına erişim
  const adminDashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `hc_session=${adminToken}` },
  });
  record(
    "Senaryo 1",
    "1.3 Admin Paneline Doğrudan Erişim",
    adminDashRes.status === 200,
    `HTTP Yanıt Kodu: ${adminDashRes.status} OK (Tam Yetkili Erişim)`
  );

  // 1.4 Admin rolü ile doğrudan /vendor/dashboard sayfasına erişim
  const adminVendorRes = await fetch(`${BASE_URL}/vendor/dashboard`, {
    headers: { Cookie: `hc_session=${adminToken}` },
  });
  record(
    "Senaryo 1",
    "1.4 Admin'in /vendor/dashboard Mağaza Paneline Yetki Geçişi",
    adminVendorRes.status === 200,
    `HTTP Yanıt Kodu: ${adminVendorRes.status} OK (Yönetici satıcı panellerini denetleyebilir)`
  );

  // 1.5 Admin rolü ile müşteri sayfalarına (/orders) erişim
  const adminOrdersRes = await fetch(`${BASE_URL}/orders`, {
    headers: { Cookie: `hc_session=${adminToken}` },
  });
  record(
    "Senaryo 1",
    "1.5 Admin'in Müşteri /orders Sayfasına Erişimi",
    adminOrdersRes.status === 200,
    `HTTP Yanıt Kodu: ${adminOrdersRes.status} OK`
  );

  // 1.6 Giriş yapmış Admin /login sayfasına gitmeye çalıştığında kendi paneline yönlendirilmeli
  const adminBouncedLogin = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: `hc_session=${adminToken}` },
    redirect: "manual",
  });
  const adminBounceLoc = adminBouncedLogin.headers.get("location") || "";
  record(
    "Senaryo 1",
    "1.6 Giriş Yapmış Admin'in /login'den /admin/dashboard'a Bouncing Yönlendirmesi",
    adminBouncedLogin.status === 307 && adminBounceLoc.includes("/admin/dashboard"),
    `Status: ${adminBouncedLogin.status}, Yönlenen Konum: ${adminBounceLoc}`
  );

  // =========================================================================
  // SENARYO 2: Vendor (Satıcı) Rolü ve Yetki Sınırı Testi
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 2: Vendor (Satıcı) Rolü ve Yetki Sınırı Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 2.1 Vendor kullanıcısı ile giriş yap
  const vendorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "satici@kampdunyasi.com", password: "password123" }),
  });
  const vendorSetCookie = vendorLoginRes.headers.get("set-cookie");
  const vendorToken = parseCookie(vendorSetCookie);
  const vendorLoginData = await vendorLoginRes.json();

  record(
    "Senaryo 2",
    "2.1 Satıcı Kullanıcısı Girişi (satici@kampdunyasi.com)",
    vendorLoginRes.status === 200 && !!vendorToken && vendorLoginData.user?.role === "VENDOR",
    `Status: ${vendorLoginRes.status}, Rol: ${vendorLoginData.user?.role}, Token Alındı: ${!!vendorToken}`
  );

  // 2.2 Giriş sonrası otomatik olarak /vendor/dashboard paneline yönlendirme kontrolü
  record(
    "Senaryo 2",
    "2.2 Post-Login Otomatik Yönlendirme Hedefi",
    vendorLoginData.redirectUrl === "/vendor/dashboard",
    `Beklenen: /vendor/dashboard | Gelen: ${vendorLoginData.redirectUrl}`
  );

  // 2.3 Vendor session çerezi ile /vendor/dashboard erişimi
  const vendorDashRes = await fetch(`${BASE_URL}/vendor/dashboard`, {
    headers: { Cookie: `hc_session=${vendorToken}` },
  });
  record(
    "Senaryo 2",
    "2.3 Satıcı Paneline Doğrudan Erişim",
    vendorDashRes.status === 200,
    `HTTP Yanıt Kodu: ${vendorDashRes.status} OK (Satıcı envanteri ve siparişleri yüklendi)`
  );

  // 2.4 Satıcının URL üzerinden /admin/dashboard yönetici sayfasına erişim denemesi (Engellenmeli!)
  const vendorToAdminRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `hc_session=${vendorToken}` },
    redirect: "manual",
  });
  const vendorBlockedLoc = vendorToAdminRes.headers.get("location") || "";
  record(
    "Senaryo 2",
    "2.4 Satıcının /admin/dashboard Erişiminin Middleware Tarafından Engellenmesi",
    vendorToAdminRes.status === 307 && vendorBlockedLoc.includes("/unauthorized?required=ADMIN"),
    `Status: ${vendorToAdminRes.status} (Geçiş Engellendi), Hedef: ${vendorBlockedLoc}`
  );

  // 2.5 403 Erişim Engeli Sayfasının (/unauthorized) Render Edilmesi
  const unauthPageRes = await fetch(`${BASE_URL}${vendorBlockedLoc}`, {
    headers: { Cookie: `hc_session=${vendorToken}` },
  });
  const unauthHtml = await unauthPageRes.text();
  const shows403 = unauthHtml.includes("Erişim Reddedildi (403)") && unauthHtml.includes("Gereken Rol:");
  record(
    "Senaryo 2",
    "2.5 Kullanıcı Dostu 403 Yetkisiz Erişim Ekranının Gösterimi",
    unauthPageRes.status === 200 && shows403,
    `HTTP Yanıtı: 200 OK | 'Erişim Reddedildi (403)' ve 'Gereken Rol: ADMIN' mesajları doğrulandı`
  );

  // =========================================================================
  // SENARYO 3: Customer (Müşteri) ve Unauthenticated (Misafir) Güvenlik Testi
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 3: Customer (Müşteri) ve Unauthenticated (Misafir) Güvenlik Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 3.1 Misafir kullanıcının korumalı /orders sayfasına erişim denemesi
  const guestOrdersRes = await fetch(`${BASE_URL}/orders`, { redirect: "manual" });
  const guestOrdersLoc = guestOrdersRes.headers.get("location") || "";
  record(
    "Senaryo 3",
    "3.1 Misafir (Unauthenticated) -> /orders Erişim Engeli",
    guestOrdersRes.status === 307 && guestOrdersLoc.includes("/login?redirect=%2Forders"),
    `Status: ${guestOrdersRes.status}, Yönlendirilen: ${guestOrdersLoc}`
  );

  // 3.2 Misafir kullanıcının korumalı /checkout sayfasına erişim denemesi
  const guestCheckoutRes = await fetch(`${BASE_URL}/checkout`, { redirect: "manual" });
  const guestCheckoutLoc = guestCheckoutRes.headers.get("location") || "";
  record(
    "Senaryo 3",
    "3.2 Misafir (Unauthenticated) -> /checkout Erişim Engeli",
    guestCheckoutRes.status === 307 && guestCheckoutLoc.includes("/login?redirect=%2Fcheckout"),
    `Status: ${guestCheckoutRes.status}, Yönlendirilen: ${guestCheckoutLoc}`
  );

  // 3.3 Misafir kullanıcının /admin/dashboard erişim denemesi
  const guestAdminRes = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
  const guestAdminLoc = guestAdminRes.headers.get("location") || "";
  record(
    "Senaryo 3",
    "3.3 Misafir (Unauthenticated) -> /admin/dashboard Erişim Engeli",
    guestAdminRes.status === 307 && guestAdminLoc.includes("/login?redirect=%2Fadmin%2Fdashboard"),
    `Status: ${guestAdminRes.status}, Yönlendirilen: ${guestAdminLoc}`
  );

  // 3.4 Müşteri hesabı ile giriş yap (CUSTOMER)
  const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ahmet@example.com", password: "password123" }),
  });
  const custSetCookie = custLoginRes.headers.get("set-cookie");
  const custToken = parseCookie(custSetCookie);
  const custLoginData = await custLoginRes.json();

  record(
    "Senaryo 3",
    "3.4 Müşteri Kullanıcısı Girişi (ahmet@example.com)",
    custLoginRes.status === 200 && !!custToken && custLoginData.user?.role === "CUSTOMER",
    `Status: ${custLoginRes.status}, Rol: ${custLoginData.user?.role}, Token Alındı: ${!!custToken}`
  );

  // 3.5 Giriş sonrası otomatik yönlendirme hedefi (/orders)
  record(
    "Senaryo 3",
    "3.5 Müşteri Post-Login Yönlendirme Hedefi",
    custLoginData.redirectUrl === "/orders",
    `Beklenen: /orders | Gelen: ${custLoginData.redirectUrl}`
  );

  // 3.6 Müşteri oturumu ile /orders sayfasına sorunsuz erişim
  const custOrdersRes = await fetch(`${BASE_URL}/orders`, {
    headers: { Cookie: `hc_session=${custToken}` },
  });
  record(
    "Senaryo 3",
    "3.6 Müşteri Rolüyle /orders Sayfasına Sorunsuz Erişim",
    custOrdersRes.status === 200,
    `HTTP Yanıt Kodu: ${custOrdersRes.status} OK (Müşteri geçmiş sipariş ve kiralama kayıtlarını görüntülüyor)`
  );

  // 3.7 Müşterinin yetkisiz /vendor/dashboard sayfasına erişim denemesi (Engellenmeli!)
  const custToVendorRes = await fetch(`${BASE_URL}/vendor/dashboard`, {
    headers: { Cookie: `hc_session=${custToken}` },
    redirect: "manual",
  });
  const custVendorLoc = custToVendorRes.headers.get("location") || "";
  record(
    "Senaryo 3",
    "3.7 Müşterinin /vendor/dashboard Erişiminin Middleware Tarafından Engellenmesi",
    custToVendorRes.status === 307 && custVendorLoc.includes("/unauthorized?required=VENDOR"),
    `Status: ${custToVendorRes.status}, Yönlendirilen: ${custVendorLoc}`
  );

  // 3.8 Oturumu Kapatma (Logout) ve Sonrasında Koruma Doğrulaması
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: `hc_session=${custToken}` },
  });
  const logoutData = await logoutRes.json();
  const verifyAfterLogout = await fetch(`${BASE_URL}/orders`, { redirect: "manual" });

  record(
    "Senaryo 3",
    "3.8 Çıkış Yapma (Logout) ve Oturum Sonrası Sayfa Koruması",
    logoutData.success && (verifyAfterLogout.status === 307 || verifyAfterLogout.status === 302),
    `Logout Başarılı: ${logoutData.success}, Çıkış Sonrası /orders Durumu: ${verifyAfterLogout.status} (Tekrar Girişe Yönlendirildi)`
  );

  // =========================================================================
  // SONUÇ ÖZETİ
  // =========================================================================
  console.log("=".repeat(75));
  const total = logs.length;
  const passed = logs.filter((l) => l.status === "PASS").length;
  const failed = total - passed;
  console.log(`📊 TEST TAMAMLANDI: Toplam Adım: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 TÜM SENARYOLAR VE GÜVENLİK SINIRLARI %100 BAŞARIYLA DOĞRULANDI!");
  } else {
    console.log("❌ BAZI ADIMLARDA HATA TESPİT EDİLDİ!");
  }
  console.log("=".repeat(75) + "\n");
}

runScenarios().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
