/**
 * Test: Header Rol Görünürlüğü ve Strict Middleware Koruması
 */

import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";

const BASE_URL = "http://localhost:3000";

interface CheckItem {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const checks: CheckItem[] = [];

function assert(name: string, condition: boolean, expected: string, actual: string) {
  checks.push({ name, expected, actual, pass: condition });
  const icon = condition ? "✅" : "❌";
  console.log(`${icon} [${condition ? "PASS" : "FAIL"}] ${name}`);
  console.log(`   └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
}

async function run() {
  console.log("\n" + "=".repeat(75));
  console.log("🛡️  STRICT HEADER GÖRÜNÜRLÜK VE ROTA KORUMASI DOĞRULAMA TESTİ");
  console.log("=".repeat(75) + "\n");

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
  // SENARYO 1: Giriş Yapılmamış (Misafir) Header Görünümü
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 1: Giriş Yapılmamış (Misafir) Header Görünümü");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const guestRes = await fetch(`${BASE_URL}/products`);
  const guestHtml = await guestRes.text();

  assert(
    "1.1 Misafirde 'Yönetim Paneli' / Admin linki olmamalı",
    !guestHtml.includes("Yönetim Paneli"),
    "Yönetim Paneli yok",
    `Var mı: ${guestHtml.includes("Yönetim Paneli")}`
  );

  assert(
    "1.2 Misafirde 'Satıcı Paneli' linki olmamalı",
    !guestHtml.includes("Satıcı Paneli") && !guestHtml.includes("Mağaza Paneli"),
    "Satıcı Paneli yok",
    `Var mı: ${guestHtml.includes("Satıcı Paneli")}`
  );

  assert(
    "1.3 Misafirde 'Hızlı Rol' veya 'Rol Değiştir' kutusu olmamalı",
    !guestHtml.includes("Rol Değiştir") && !guestHtml.includes("Hızlı Rol"),
    "Hızlı Rol / Rol Değiştir kutusu yok",
    `Var mı: ${guestHtml.includes("Rol Değiştir") || guestHtml.includes("Hızlı Rol")}`
  );

  assert(
    "1.4 Misafirde 'Giriş Yap', 'Kayıt Ol', 'Ürünler' ve 'Sepet' butonları olmalı",
    guestHtml.includes("Giriş Yap") && guestHtml.includes("Kayıt Ol") && guestHtml.includes("Ürünler") && guestHtml.includes("Sepet"),
    "Giriş Yap, Kayıt Ol, Ürünler, Sepet mevcut",
    "Tüm genel butonlar mevcut"
  );

  // ─────────────────────────────────────────────────────────────
  // SENARYO 2: Müşteri (CUSTOMER) Header Görünümü
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 2: Müşteri (CUSTOMER) Header Görünümü");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const custRes = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
  });
  const custHtml = await custRes.text();

  assert(
    "2.1 Müşteride 'Yönetim Paneli' / Admin butonu kesinlikle olmamalı",
    !custHtml.includes("Yönetim Paneli"),
    "Yönetim Paneli yok",
    `Var mı: ${custHtml.includes("Yönetim Paneli")}`
  );

  assert(
    "2.2 Müşteride 'Satıcı Paneli' / Satıcı butonu kesinlikle olmamalı",
    !custHtml.includes("Satıcı Paneli") && !custHtml.includes("Mağaza Paneli"),
    "Satıcı Paneli yok",
    `Var mı: ${custHtml.includes("Satıcı Paneli")}`
  );

  assert(
    "2.3 Müşteride Hızlı Rol Değiştirici kutusu olmamalı",
    !custHtml.includes("Rol Değiştir") && !custHtml.includes("Hızlı Rol"),
    "Rol switcher yok",
    `Var mı: ${custHtml.includes("Rol Değiştir") || custHtml.includes("Hızlı Rol")}`
  );

  assert(
    "2.4 Müşteride 'Siparişlerim' ve 'Çıkış' butonu olmalı",
    custHtml.includes("Siparişlerim") && custHtml.includes("Çıkış"),
    "Siparişlerim ve Çıkış mevcut",
    "Müşteri menüsü doğru render edildi"
  );

  // ─────────────────────────────────────────────────────────────
  // SENARYO 3: Satıcı (VENDOR) Header Görünümü
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 3: Satıcı (VENDOR) Header Görünümü");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const vendorRes = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
  });
  const vendorHtml = await vendorRes.text();

  assert(
    "3.1 Satıcıda 'Yönetim Paneli' / Admin butonu kesinlikle olmamalı",
    !vendorHtml.includes("Yönetim Paneli"),
    "Yönetim Paneli yok",
    `Var mı: ${vendorHtml.includes("Yönetim Paneli")}`
  );

  assert(
    "3.2 Satıcıda 'Satıcı Paneli' butonu olmalı",
    vendorHtml.includes("Satıcı Paneli"),
    "Satıcı Paneli var",
    "Satıcı menüsü doğru render edildi"
  );

  assert(
    "3.3 Satıcıda Hızlı Rol Switcher olmamalı",
    !vendorHtml.includes("Rol Değiştir") && !vendorHtml.includes("Hızlı Rol"),
    "Rol switcher yok",
    `Var mı: ${vendorHtml.includes("Rol Değiştir") || vendorHtml.includes("Hızlı Rol")}`
  );

  // ─────────────────────────────────────────────────────────────
  // SENARYO 4: Yönetici (ADMIN) Header Görünümü
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 4: Yönetici (ADMIN) Header Görünümü");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const adminRes = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });
  const adminHtml = await adminRes.text();

  assert(
    "4.1 Yöneticide 'Yönetim Paneli' butonu görünmeli",
    adminHtml.includes("Yönetim Paneli"),
    "Yönetim Paneli var",
    "Admin menüsü doğru render edildi"
  );

  assert(
    "4.2 Yöneticide 'Satıcı Paneli' denetim butonu görünmeli",
    adminHtml.includes("Satıcı Paneli"),
    "Satıcı Paneli var",
    "Admin satıcı panellerini görebilir"
  );

  // ─────────────────────────────────────────────────────────────
  // SENARYO 5: Strict Route Koruması (Middleware ile /admin Engeli)
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 5: Strict Route Koruması (Middleware)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 5.1 Misafir /admin ve /admin/dashboard erişimi
  const unauthAdmin1 = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
  const unauthAdmin2 = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });

  assert(
    "5.1 Misafir /admin -> /login yönlendirmesi",
    unauthAdmin1.status === 307 && (unauthAdmin1.headers.get("location") || "").includes("/login"),
    "307 Redirect to /login",
    `${unauthAdmin1.status} -> ${unauthAdmin1.headers.get("location")}`
  );

  assert(
    "5.2 Misafir /admin/dashboard -> /login yönlendirmesi",
    unauthAdmin2.status === 307 && (unauthAdmin2.headers.get("location") || "").includes("/login"),
    "307 Redirect to /login",
    `${unauthAdmin2.status} -> ${unauthAdmin2.headers.get("location")}`
  );

  // 5.3 Müşteri /admin ve /admin/dashboard erişimi (403 /unauthorized)
  const custAdmin1 = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
    redirect: "manual",
  });
  const custAdmin2 = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
    redirect: "manual",
  });

  assert(
    "5.3 Müşteri /admin -> 403 /unauthorized engellemesi",
    custAdmin1.status === 307 && (custAdmin1.headers.get("location") || "").includes("/unauthorized?required=ADMIN"),
    "307 to /unauthorized?required=ADMIN",
    `${custAdmin1.status} -> ${custAdmin1.headers.get("location")}`
  );

  assert(
    "5.4 Müşteri /admin/dashboard -> 403 /unauthorized engellemesi",
    custAdmin2.status === 307 && (custAdmin2.headers.get("location") || "").includes("/unauthorized?required=ADMIN"),
    "307 to /unauthorized?required=ADMIN",
    `${custAdmin2.status} -> ${custAdmin2.headers.get("location")}`
  );

  // 5.5 Satıcı /admin ve /admin/dashboard erişimi (403 /unauthorized)
  const vendorAdmin1 = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
    redirect: "manual",
  });
  const vendorAdmin2 = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
    redirect: "manual",
  });

  assert(
    "5.5 Satıcı /admin -> 403 /unauthorized engellemesi",
    vendorAdmin1.status === 307 && (vendorAdmin1.headers.get("location") || "").includes("/unauthorized?required=ADMIN"),
    "307 to /unauthorized?required=ADMIN",
    `${vendorAdmin1.status} -> ${vendorAdmin1.headers.get("location")}`
  );

  assert(
    "5.6 Satıcı /admin/dashboard -> 403 /unauthorized engellemesi",
    vendorAdmin2.status === 307 && (vendorAdmin2.headers.get("location") || "").includes("/unauthorized?required=ADMIN"),
    "307 to /unauthorized?required=ADMIN",
    `${vendorAdmin2.status} -> ${vendorAdmin2.headers.get("location")}`
  );

  // 5.7 Admin /admin/dashboard erişimi (200 OK)
  const adminDash = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });

  assert(
    "5.7 Admin /admin/dashboard tam erişim (200 OK)",
    adminDash.status === 200,
    "200 OK",
    `${adminDash.status}`
  );

  // ─────────────────────────────────────────────────────────────
  // ÖZET RAPOR
  // ─────────────────────────────────────────────────────────────
  console.log("=".repeat(75));
  const total = checks.length;
  const passed = checks.filter((c) => c.pass).length;
  const failed = total - passed;
  console.log(`📊 TEST TAMAMLANDI: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 HEADER ROL GÖRÜNÜRLÜĞÜ VE STRICT ROUTE KORUMASI %100 GEÇTİ!");
  } else {
    console.log("❌ BAZI KONTROLLER BAŞARISIZ OLDU!");
  }
  console.log("=".repeat(75) + "\n");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
