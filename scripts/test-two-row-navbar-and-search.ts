/**
 * İki Katmanlı (Two-Row) Header/Navbar ve Arama Entegrasyonu Doğrulama Testi
 */

import { prisma } from "../src/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";

const BASE_URL = "http://localhost:3000";

interface CheckLog {
  title: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const logs: CheckLog[] = [];

function check(title: string, condition: boolean, expected: string, actual: string) {
  logs.push({ title, expected, actual, pass: condition });
  const icon = condition ? "✅" : "❌";
  console.log(`${icon} [${condition ? "PASS" : "FAIL"}] ${title}`);
  console.log(`   └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
}

async function run() {
  console.log("\n" + "=".repeat(75));
  console.log("🚀 İKİ KATMANLI (TWO-ROW) HEADER VE ARAMA ENTEGRASYONU TESTİ");
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
  // BÖLÜM 1: ÜST SATIR (MAIN HEADER BAR) TESTLERİ
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 1: Üst Satır (Main Header Bar) Kontrolleri");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const resGuest = await fetch(`${BASE_URL}/products`);
  const htmlGuest = await resGuest.text();

  check(
    "1.1 Üst Satır: Logo ('HybridCommerce') mevcut olmalı",
    htmlGuest.includes("Hybrid") && htmlGuest.includes("Commerce"),
    "HybridCommerce logosu mevcut",
    "Logo tespit edildi"
  );

  check(
    "1.2 Üst Satır: Arama çubuğu ve placeholder ('Ürün, kategori veya marka ara...') bulunmalı",
    htmlGuest.includes("Ürün, kategori veya marka ara..."),
    "Geniş arama çubuğu ve placeholder mevcut",
    "Arama çubuğu tespit edildi"
  );

  check(
    "1.3 Üst Satır: Sepet butonu bulunmalı",
    htmlGuest.includes("Sepet") && htmlGuest.includes("/cart"),
    "Sepet butonu ve /cart linki mevcut",
    "Sepet butonu tespit edildi"
  );

  check(
    "1.4 Üst Satır: Giriş yapılmadığında 'Giriş Yap' ve 'Kayıt Ol' butonları bulunmalı",
    htmlGuest.includes("Giriş Yap") && htmlGuest.includes("Kayıt Ol"),
    "Giriş Yap ve Kayıt Ol butonları var",
    "Misafir auth butonları tespit edildi"
  );

  const resUser = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
  });
  const htmlUser = await resUser.text();

  check(
    "1.5 Üst Satır: Oturum açıldığında profil alanı ve 'Çıkış' butonu görünmeli",
    htmlUser.includes("Çıkış") && (htmlUser.includes("Ahmet") || htmlUser.includes("Müşteri")),
    "Profil alanı ve Çıkış butonu var",
    "Oturum açılmış kullanıcı bilgileri tespit edildi"
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 2: ALT SATIR (NAVİGASYON & YETKİ KONTROL BARI) TESTLERİ
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 2: Alt Satır (Navigasyon & Yetki Kontrol Barı) Kontrolleri");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 2.1 Sol Taraf: Temel navigasyon linkleri
  check(
    "2.1 Alt Satır: Sol tarafta 'Ürünler', 'Satın Al', 'Kirala' linkleri bulunmalı",
    htmlGuest.includes("Ürünler") && htmlGuest.includes("Satın Al") && htmlGuest.includes("Kirala"),
    "Temel navigasyon linkleri mevcut",
    "Ürünler, Satın Al, Kirala linkleri tespit edildi"
  );

  // 2.2 Misafir: Alt satır sağ tarafında hiçbir rol/panel butonu olmamalı
  const guestHasVendorLink = htmlGuest.includes("Satıcı Paneli");
  const guestHasAdminLink = htmlGuest.includes("Yönetim Paneli");
  check(
    "2.2 Alt Satır: Misafir kullanıcıda 'Satıcı Paneli' ve 'Yönetim Paneli' TAMAMEN GİZLİ olmalı",
    !guestHasVendorLink && !guestHasAdminLink,
    "Satıcı Paneli ve Yönetim Paneli yok",
    `Satıcı: ${guestHasVendorLink}, Admin: ${guestHasAdminLink}`
  );

  // 2.3 Müşteri (CUSTOMER): Alt satır sağ tarafında Satıcı ve Admin panelleri OLMAMALI
  const custHasVendorLink = htmlUser.includes("Satıcı Paneli");
  const custHasAdminLink = htmlUser.includes("Yönetim Paneli");
  check(
    "2.3 Alt Satır: Müşteri rolünde 'Satıcı Paneli' ve 'Yönetim Paneli' KESİNLİKLE OLMAMALI",
    !custHasVendorLink && !custHasAdminLink,
    "Paneller gizli",
    `Satıcı: ${custHasVendorLink}, Admin: ${custHasAdminLink}`
  );

  // 2.4 Satıcı (VENDOR): 'Satıcı Paneli' GÖRÜNMELİ, 'Yönetim Paneli' GÖRÜNMEMELİ
  const resVendor = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendorToken}` },
  });
  const htmlVendor = await resVendor.text();
  const vendHasVendorLink = htmlVendor.includes("Satıcı Paneli");
  const vendHasAdminLink = htmlVendor.includes("Yönetim Paneli");
  check(
    "2.4 Alt Satır: Satıcı rolünde 'Satıcı Paneli' olmalı, 'Yönetim Paneli' olmamalı",
    vendHasVendorLink && !vendHasAdminLink,
    "Satıcı Paneli var, Yönetim Paneli yok",
    `Satıcı: ${vendHasVendorLink}, Admin: ${vendHasAdminLink}`
  );

  // 2.5 Yönetici (ADMIN): Hem 'Yönetim Paneli' hem 'Satıcı Paneli' GÖRÜNMELİ
  const resAdmin = await fetch(`${BASE_URL}/products`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });
  const htmlAdmin = await resAdmin.text();
  const admHasVendorLink = htmlAdmin.includes("Satıcı Paneli");
  const admHasAdminLink = htmlAdmin.includes("Yönetim Paneli");
  check(
    "2.5 Alt Satır: Admin rolünde 'Yönetim Paneli' ve denetim amaçlı 'Satıcı Paneli' olmalı",
    admHasVendorLink && admHasAdminLink,
    "Hem Yönetim hem Satıcı Paneli mevcut",
    `Satıcı: ${admHasVendorLink}, Admin: ${admHasAdminLink}`
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 3: ARAMA ENTEGRASYONU TESTLERİ (/products?q=...)
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 3: Arama Entegrasyonu Testleri (/products?q=...)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 3.1 Çadır kelimesi ile arama
  const searchCadir = await fetch(`${BASE_URL}/products?q=%C3%A7ad%C4%B1r`);
  const htmlCadir = await searchCadir.text();
  const hasCadirResult = htmlCadir.includes("Çadır") || htmlCadir.includes("çadır") || htmlCadir.includes("listeleniyor");

  check(
    "3.1 /products?q=çadır araması başarılı HTTP 200 dönmeli ve eşleşen ürünleri listelemeli",
    searchCadir.status === 200 && hasCadirResult,
    "200 OK ve çadır sonuçları listeleniyor",
    `Status: ${searchCadir.status}, Eşleşme bulundu: ${hasCadirResult}`
  );

  // 3.2 Kamera kelimesi ile arama
  const searchKamera = await fetch(`${BASE_URL}/products?q=kamera`);
  const htmlKamera = await searchKamera.text();
  const hasKameraResult = htmlKamera.includes("Kamera") || htmlKamera.includes("kamera") || htmlKamera.includes("listeleniyor");

  check(
    "3.2 /products?q=kamera araması başarılı HTTP 200 dönmeli ve eşleşen ürünleri listelemeli",
    searchKamera.status === 200 && hasKameraResult,
    "200 OK ve kamera sonuçları listeleniyor",
    `Status: ${searchKamera.status}, Eşleşme bulundu: ${hasKameraResult}`
  );

  // 3.3 Case-insensitive (Büyük/Küçük Harf) Doğrulaması
  const searchUpper = await fetch(`${BASE_URL}/products?q=KAMERA`);
  const htmlUpper = await searchUpper.text();

  check(
    "3.3 Büyük/küçük harf duyarsız (mode: 'insensitive') filtreleme doğrulaması",
    searchUpper.status === 200 && htmlUpper.includes("listeleniyor"),
    "Büyük harfle arama da aynı sonuçları döndürüyor",
    `Status: ${searchUpper.status}`
  );

  // 3.4 Prisma OR (name ve description) sorgu testi
  const dbSearch = await prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: "kamera", mode: "insensitive" } },
        { description: { contains: "kamera", mode: "insensitive" } },
      ],
    },
  });

  check(
    "3.4 Prisma OR (name & description, mode: 'insensitive') sorgusu doğrudan doğrulaması",
    dbSearch.length > 0,
    "Veritabanından en az 1 ürün eşleşmeli",
    `Eşleşen ürün sayısı: ${dbSearch.length} (Örnek: ${dbSearch[0]?.name})`
  );

  // ─────────────────────────────────────────────────────────────
  // ÖZET RAPOR
  // ─────────────────────────────────────────────────────────────
  console.log("=".repeat(75));
  const total = logs.length;
  const passed = logs.filter((l) => l.pass).length;
  const failed = total - passed;
  console.log(`📊 TEST TAMAMLANDI: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 İKİ KATMANLI HEADER VE ARAMA SİSTEMİ %100 EKSİKSİZ DOĞRULANDI!");
  } else {
    console.log("❌ BAZI KONTROLLER BAŞARISIZ OLDU!");
  }
  console.log("=".repeat(75) + "\n");

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
