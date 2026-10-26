/**
 * Header Yetkilendirmesi, Misafir Koruması ve Satıcı Stok Güncelleme Testi
 */

import { prisma } from "../src/lib/prisma";
import { updateProductStock } from "../src/features/vendor/actions/vendor.actions";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";

const BASE_URL = "http://localhost:3000";

interface TestReport {
  test: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL";
}

const reports: TestReport[] = [];

function check(test: string, condition: boolean, expected: string, actual: string) {
  const status: "PASS" | "FAIL" = condition ? "PASS" : "FAIL";
  reports.push({ test, expected, actual, status });
  const icon = condition ? "✅" : "❌";
  console.log(`${icon} [${status}] ${test}`);
  console.log(`   └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
}

async function runTests() {
  console.log("\n" + "=".repeat(75));
  console.log("🛡️  HEADER GÜVENLİĞİ VE SATICI STOK GÜNCELLEME TESTİ");
  console.log("=".repeat(75) + "\n");

  // 1. Session Tokenları Üret
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
  // BÖLÜM 1: Header/Navbar Menü Görünürlük ve Yetkilendirme Testi
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 1: Header/Navbar Menü Görünürlük ve Yetkilendirme Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1.1 Misafir (Giriş Yapmamış) Kullanıcı Header'ı
  const guestRes = await fetch(`${BASE_URL}/products`);
  const guestHtml = await guestRes.text();
  const guestHasAdmin = guestHtml.includes("Yönetim Paneli");
  const guestHasVendor = guestHtml.includes("Mağaza Paneli") || guestHtml.includes("Ürünlerim &amp; Stok");
  const guestHasLogin = guestHtml.includes("Giriş Yap") && guestHtml.includes("Kayıt Ol");

  check(
    "1.1 Misafir kullanıcı için Admin ve Vendor butonları gizlenmeli",
    !guestHasAdmin && !guestHasVendor && guestHasLogin,
    "Yönetim ve Mağaza butonları yok, Giriş/Kayıt butonları var",
    `Admin Butonu: ${guestHasAdmin}, Vendor Butonu: ${guestHasVendor}, Giriş/Kayıt: ${guestHasLogin}`
  );

  // 1.2 Müşteri (CUSTOMER) Rolü Header'ı
  const custRes = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
  });
  const custHtml = await custRes.text();
  const custHasAdmin = custHtml.includes("Yönetim Paneli");
  const custHasVendor = custHtml.includes("Mağaza Paneli");
  const custHasOrders = custHtml.includes("Siparişlerim &amp; Kiralar");

  check(
    "1.2 Müşteri kullanıcısı için Yönetim ve Mağaza butonları gizlenmeli, Siparişlerim görünmeli",
    !custHasAdmin && !custHasVendor && custHasOrders,
    "Admin ve Vendor yok, Siparişlerim & Kiralar var",
    `Admin: ${custHasAdmin}, Vendor: ${custHasVendor}, Siparişlerim: ${custHasOrders}`
  );

  // 1.3 Satıcı (VENDOR) Rolü Header'ı
  const vendorRes = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
  });
  const vendorHtml = await vendorRes.text();
  const vendorHasAdmin = vendorHtml.includes("Yönetim Paneli");
  const vendorHasVendor = vendorHtml.includes("Mağaza Paneli");

  check(
    "1.3 Satıcı kullanıcısı için Mağaza Paneli görünmeli, Yönetim Paneli gizlenmeli",
    !vendorHasAdmin && vendorHasVendor,
    "Mağaza Paneli var, Yönetim Paneli yok",
    `Admin: ${vendorHasAdmin}, Mağaza Paneli: ${vendorHasVendor}`
  );

  // 1.4 Yönetici (ADMIN) Rolü Header'ı
  const adminRes = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });
  const adminHtml = await adminRes.text();
  const adminHasAdmin = adminHtml.includes("Yönetim Paneli");

  check(
    "1.4 Yönetici kullanıcısı için Yönetim Paneli menüde görünmeli",
    adminHasAdmin,
    "Yönetim Paneli var",
    `Yönetim Paneli: ${adminHasAdmin}`
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 2: Middleware Misafir Sayfa Koruması
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 2: Middleware Misafir Sayfa Koruması");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const unauthAdmin = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
  const unauthVendor = await fetch(`${BASE_URL}/vendor/dashboard`, { redirect: "manual" });
  const unauthVendorProds = await fetch(`${BASE_URL}/vendor/products`, { redirect: "manual" });

  check(
    "2.1 Misafir kullanıcının /admin/dashboard erişimi 307 ile /login'e yönlendirilmeli",
    unauthAdmin.status === 307 && (unauthAdmin.headers.get("location") || "").includes("/login"),
    "307 Redirect to /login",
    `${unauthAdmin.status} -> ${unauthAdmin.headers.get("location")}`
  );

  check(
    "2.2 Misafir kullanıcının /vendor/dashboard erişimi 307 ile /login'e yönlendirilmeli",
    unauthVendor.status === 307 && (unauthVendor.headers.get("location") || "").includes("/login"),
    "307 Redirect to /login",
    `${unauthVendor.status} -> ${unauthVendor.headers.get("location")}`
  );

  check(
    "2.3 Misafir kullanıcının /vendor/products erişimi 307 ile /login'e yönlendirilmeli",
    unauthVendorProds.status === 307 && (unauthVendorProds.headers.get("location") || "").includes("/login"),
    "307 Redirect to /login",
    `${unauthVendorProds.status} -> ${unauthVendorProds.headers.get("location")}`
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 3: Satıcı Stok Güncelleme Server Action Testi
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 3: Satıcı Stok Güncelleme Server Action (updateProductStock)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Veritabanındaki ilk ürünü bul
  const testProduct = await prisma.product.findFirst({
    include: { inventory: true },
  });

  if (!testProduct) {
    throw new Error("Veritabanında test edilecek ürün bulunamadı!");
  }

  const initialSale = testProduct.inventory?.totalStock || 0;
  const initialRental = testProduct.inventory?.rentalQuantity || 0;
  const newSaleTarget = initialSale + 15;
  const newRentalTarget = initialRental + 4;

  console.log(`🔍 Test Ürünü: "${testProduct.name}" (ID: ${testProduct.id})`);
  console.log(`   Başlangıç Stokları -> Satış: ${initialSale}, Kiralık: ${initialRental}`);

  // 3.1 updateProductStock çağrısı yap
  const updateRes = await updateProductStock({
    productId: testProduct.id,
    totalStock: newSaleTarget,
    rentalQuantity: newRentalTarget,
  });

  check(
    "3.1 updateProductStock Server Action çağrısı başarılı olmalı",
    updateRes.success === true,
    "success: true",
    `success: ${updateRes.success}, message: ${updateRes.message}`
  );

  // 3.2 Veritabanını doğrula
  const updatedInv = await prisma.inventory.findUnique({
    where: { productId: testProduct.id },
  });

  check(
    "3.2 Veritabanında totalStock ve rentalQuantity başarıyla güncellenmiş olmalı",
    updatedInv?.totalStock === newSaleTarget && updatedInv?.rentalQuantity === newRentalTarget,
    `totalStock: ${newSaleTarget}, rentalQuantity: ${newRentalTarget}`,
    `totalStock: ${updatedInv?.totalStock}, rentalQuantity: ${updatedInv?.rentalQuantity}`
  );

  // 3.3 Hatalı productId kontrolü
  const invalidRes = await updateProductStock({
    productId: "",
    totalStock: 10,
    rentalQuantity: 5,
  });

  check(
    "3.3 Boş productId ile güncelleme reddedilmeli",
    invalidRes.success === false,
    "success: false",
    `success: ${invalidRes.success}, error: ${invalidRes.error}`
  );

  // ─────────────────────────────────────────────────────────────
  // ÖZET RAPOR
  // ─────────────────────────────────────────────────────────────
  console.log("=".repeat(75));
  const total = reports.length;
  const passed = reports.filter((r) => r.status === "PASS").length;
  const failed = total - passed;
  console.log(`📊 TEST TAMAMLANDI: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 HEADER GÜVENLİĞİ VE STOK GÜNCELLEME SİSTEMİ %100 DOĞRULANDI!");
  } else {
    console.log("❌ BAZI TESTLER BAŞARISIZ OLDU!");
  }
  console.log("=".repeat(75) + "\n");

  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
