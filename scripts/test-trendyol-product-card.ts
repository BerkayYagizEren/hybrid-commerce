import prisma from "../src/lib/prisma";
import { ProductService } from "../src/features/products/services/product.service";
import fs from "fs";
import path from "path";

async function runTrendyolProductCardTests() {
  console.log("===============================================================================");
  console.log("🛍️ TRENDYOL STANDARTLARINDA ÜRÜN KARTI & YILDIZ DEĞERLENDİRME DOĞRULAMA TESTİ");
  console.log("===============================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Veritabanı Entegrasyonu & Dinamik Puan/Yorum Hesaplaması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 1: ProductService.list ile Veritabanı ve Yorum Entegrasyonu");

    const listResult = await ProductService.list({ limit: 50 });
    assert(listResult.products.length > 0, `Ürünler başarıyla listelendi (${listResult.products.length} ürün)`);

    // Yorumu olan ürünleri bul
    const productWithReviews = listResult.products.find(
      (p) => p.reviewCount && p.reviewCount > 0
    );

    assert(
      Boolean(productWithReviews),
      `En az bir ürünün onaylanmış yorumları ve puanı mevcut: "${productWithReviews?.name}" (${productWithReviews?.reviewCount} yorum, ${productWithReviews?.averageRating} ⭐)`
    );

    // Ürün ilişkilerinde vendor ve reviews alanlarının geldiğini doğrula
    assert(
      productWithReviews?.reviews !== undefined && Array.isArray(productWithReviews.reviews),
      "ProductService.list sorgusunda 'reviews' ilişkisi başarıyla include edildi"
    );
    assert(
      productWithReviews?._count?.reviews !== undefined,
      "ProductService.list sorgusunda '_count.reviews' sayısı başarıyla include edildi"
    );

    // Slug ile tekil ürün getirmede de rating kontrolü
    const singleProduct = await ProductService.getBySlug(productWithReviews!.slug);
    assert(
      singleProduct?.averageRating === productWithReviews?.averageRating &&
        singleProduct?.reviewCount === productWithReviews?.reviewCount,
      "ProductService.getBySlug ile çağrılan üründe de puan ve yorum sayısı eksiksiz döndü"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: ProductCard Bileşeni ve Dosya Yolları
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 2: ProductCard Bileşeni ve Modül Erişimi");

    const mainCardPath = path.join(process.cwd(), "src/features/products/components/ProductCard.tsx");
    const reexportCardPath = path.join(process.cwd(), "src/components/ProductCard.tsx");

    assert(fs.existsSync(mainCardPath), "src/features/products/components/ProductCard.tsx dosyası mevcut");
    assert(fs.existsSync(reexportCardPath), "src/components/ProductCard.tsx re-export dosyası mevcut");

    const cardContent = fs.readFileSync(mainCardPath, "utf-8");

    // 2.1 Yıldız ve puan elementleri (Gerekli temel alanlar)
    assert(cardContent.includes("MiniStars"), "5'li sarı yıldız ikon grubu (MiniStars) kart bileşeninde mevcut");
    assert(cardContent.includes("rating.toFixed(1)"), "Ortalama puan formatlanmış şekilde (örn: 4.1 / 4.8) gösteriliyor");
    assert(cardContent.includes("({reviewCount})"), "Toplam yorum sayısı parantez içinde (örn: (11)) gösteriliyor");
    assert(cardContent.includes("Henüz değerlendirilmedi"), "Yorumsuz ürünler için zarif 'Henüz değerlendirilmedi' alternatifi mevcut");
    assert(cardContent.includes("product.name"), "Ürün başlığı kartta mevcut");
    assert(cardContent.includes("formatCurrency"), "Ürün fiyatı kartta gösteriliyor");

    // 2.2 Kaldırılan Rozetlerin Temizlik Doğrulaması (Kullanıcı İsteği: Sadeleştirme)
    assert(!cardContent.includes("Çok Al Az Öde"), "'Çok Al Az Öde' pazarlama rozeti karttan başarıyla kaldırıldı");
    assert(!cardContent.includes("isFavorite"), "Favori kalp butonu ve state'i karttan tamamen temizlendi");
    assert(!cardContent.includes("showBadges"), "Gereksiz showBadges prop'u temizlendi");
    assert(!cardContent.includes("Çok Satan"), "'Çok Satan' rozeti temizlendi");

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: HTTP Sayfa Render ve Ürün Kartı Görünürlüğü
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 3: HTTP /products Sayfası ve Kartların Render Edilmesi");

    const res = await fetch("http://localhost:3000/products");
    assert(res.status === 200, `/products sayfası HTTP ${res.status} OK ile başarıyla yanıt verdi`);

    const html = await res.text();
    assert(html.includes("Ürünler"), "Ürün listeleme sayfası HTML içeriği yüklendi");

    console.log("\n===============================================================================");
    console.log(`🎉 TÜM TRENDYOL ÜRÜN KARTI TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("❌ Test sırasında kritik hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTrendyolProductCardTests();
