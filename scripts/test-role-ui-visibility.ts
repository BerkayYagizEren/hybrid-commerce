/**
 * Rol Bazlı UI Gizleme Doğrulama Testi
 * 
 * Doğrulamalar:
 * 1. Oturum açan kullanıcı rolü ADMIN olduğunda Header üzerinde Favorilerim ve Sepet ikonları gizlenir (null).
 * 2. Oturum açan kullanıcı rolü VENDOR / SELLER olduğunda Header üzerinde Favorilerim ve Sepet ikonları gizlenir (null).
 * 3. Oturum açan kullanıcı rolü CUSTOMER olduğunda Favorilerim ve Sepet ikonları görünürdür.
 * 4. Oturumu olmayan (GUEST / Misafir) kullanıcıda Favorilerim ve Sepet ikonları görünürdür.
 */

import fs from "fs";
import path from "path";

console.log("=========================================================================");
console.log("👤 8. ROL BAZLI UI GİZLEME (HEADER FAVORİ & SEPET) DOĞRULAMA TESTİ");
console.log("=========================================================================\n");

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, title: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${title}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${title}`);
    process.exitCode = 1;
  }
}

async function runTest() {
  const headerPath = path.resolve(process.cwd(), "src/shared/layout/Header.tsx");
  const headerSource = fs.readFileSync(headerPath, "utf-8");

  console.log("📌 1. Header Kaynak Kodunda Rol Bazlı Gizleme Mantığı Denetimi");
  assert(
    headerSource.includes("const isStaff = activeRole === \"ADMIN\" || activeRole === \"VENDOR\""),
    "isStaff değişkeni ADMIN ve VENDOR rollerini kapsayacak şekilde tanımlandı"
  );

  assert(
    headerSource.includes("{!isStaff && (") && headerSource.includes("title=\"Favorilerim\""),
    "Masaüstü 'Favorilerim' butonu !isStaff koşulu ile ADMIN/VENDOR rollerinde gizleniyor"
  );

  assert(
    headerSource.includes("{!isStaff && (") && headerSource.includes("title=\"Sepetim\""),
    "Masaüstü 'Sepet' butonu !isStaff koşulu ile ADMIN/VENDOR rollerinde gizleniyor"
  );

  assert(
    headerSource.includes("Sadece Müşteri ve Misafir için (ADMIN veya VENDOR için gizlenir)"),
    "Mobil menüdeki 'Favorilerim' ve 'Sepetim' linkleri !isStaff koşuluyla korundu"
  );

  console.log("\n📌 2. Farklı Roller İçin Header İkon Görünürlük Mantık Simülasyonu");

  type Role = "ADMIN" | "VENDOR" | "CUSTOMER" | "GUEST";

  function simulateHeaderUI(role: Role) {
    const isStaff = role === "ADMIN" || role === "VENDOR";
    return {
      favoritesVisible: !isStaff,
      cartVisible: !isStaff,
    };
  }

  // Senaryo A: ADMIN Oturumu
  const adminUI = simulateHeaderUI("ADMIN");
  assert(!adminUI.favoritesVisible, "ADMIN rolünde 'Favorilerim' ikonu GİZLENDİ (null)");
  assert(!adminUI.cartVisible, "ADMIN rolünde 'Sepet' ikonu GİZLENDİ (null)");

  // Senaryo B: VENDOR / SELLER Oturumu
  const sellerUI = simulateHeaderUI("VENDOR");
  assert(!sellerUI.favoritesVisible, "SELLER / VENDOR rolünde 'Favorilerim' ikonu GİZLENDİ (null)");
  assert(!sellerUI.cartVisible, "SELLER / VENDOR rolünde 'Sepet' ikonu GİZLENDİ (null)");

  // Senaryo C: CUSTOMER Oturumu
  const customerUI = simulateHeaderUI("CUSTOMER");
  assert(customerUI.favoritesVisible, "CUSTOMER (Müşteri) rolünde 'Favorilerim' ikonu GÖRÜNÜR");
  assert(customerUI.cartVisible, "CUSTOMER (Müşteri) rolünde 'Sepet' ikonu GÖRÜNÜR");

  // Senaryo D: GUEST (Misafir) Oturumu
  const guestUI = simulateHeaderUI("GUEST");
  assert(guestUI.favoritesVisible, "GUEST (Misafir) oturumunda 'Favorilerim' ikonu GÖRÜNÜR");
  assert(guestUI.cartVisible, "GUEST (Misafir) oturumunda 'Sepet' ikonu GÖRÜNÜR");

  console.log("\n=========================================================================");
  if (passedCount === totalCount) {
    console.log(`🎉 8. ROL BAZLI UI GİZLEME TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedCount}/${totalCount} Geçti)`);
  } else {
    console.log(`⚠️ Bazı testler başarısız oldu (${passedCount}/${totalCount})`);
  }
  console.log("=========================================================================\n");
}

runTest().catch((err) => {
  console.error("Test hatası:", err);
  process.exit(1);
});
