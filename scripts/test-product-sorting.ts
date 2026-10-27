import prisma from "../src/lib/prisma";
import { ProductService } from "../src/features/products/services/product.service";
import * as fs from "fs";
import * as path from "path";

/**
 * STORE.SLN - ÜRÜN SIRALAMA (SORT OPTIONS) UÇTAN UCA VE API TESTİ
 * 
 * 8 Sıralama Seçeneği Test Edilir:
 * 1. recommended -> Önerilen Sıralama (updatedAt: 'desc')
 * 2. price_asc -> Fiyat: Düşükten Yükseğe (salePrice: 'asc')
 * 3. price_desc -> Fiyat: Yüksekten Düşüğe (salePrice: 'desc')
 * 4. newest -> En Yeniler (createdAt: 'desc')
 * 5. best_seller -> En Çok Satanlar (orderItems: { _count: 'desc' })
 * 6. most_rented -> En Çok Kiralananlar (rentals: { _count: 'desc' })
 * 7. most_favorited -> En Favoriler (favorites: { _count: 'desc' })
 * 8. rating -> En Yüksek Puanlılar (averageRating: 'desc')
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFailed++;
  }
}

async function main() {
  console.log("===============================================================================");
  console.log("🔄 ÜRÜN SIRALAMA (SORT OPTIONS) VE API DOĞRULAMA TESTİ");
  console.log("===============================================================================\n");

  // 1. RECOMMENDED (Önerilen Sıralama)
  console.log("-------------------------------------------------------------------------------");
  console.log("📌 1. 'recommended' -> Önerilen Sıralama (updatedAt: desc)");
  console.log("-------------------------------------------------------------------------------");
  const recRes = await fetch(`${BASE_URL}/api/products?sortBy=recommended&limit=6`);
  assert(recRes.status === 200, "GET /api/products?sortBy=recommended HTTP 200 OK döndü");
  const recData = await recRes.json();
  assert(Array.isArray(recData.products) && recData.products.length > 0, `recommended sorgusunda ${recData.products?.length} ürün döndü`);
  
  let recSorted = true;
  for (let i = 0; i < recData.products.length - 1; i++) {
    const t1 = new Date(recData.products[i].updatedAt).getTime();
    const t2 = new Date(recData.products[i + 1].updatedAt).getTime();
    if (t1 < t2) {
      recSorted = false;
      break;
    }
  }
  assert(recSorted, "Ürünler updatedAt tarihine göre azalan (desc) sırada listelendi");

  // 2. PRICE_ASC (Fiyat: Düşükten Yükseğe)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 2. 'price_asc' -> Fiyat: Düşükten Yükseğe (salePrice: asc)");
  console.log("-------------------------------------------------------------------------------");
  const priceAscRes = await fetch(`${BASE_URL}/api/products?sortBy=price_asc&limit=10`);
  assert(priceAscRes.status === 200, "GET /api/products?sortBy=price_asc HTTP 200 OK döndü");
  const priceAscData = await priceAscRes.json();
  const pricedAsc = priceAscData.products.filter((p: any) => p.salePrice !== null && p.salePrice !== undefined);
  assert(pricedAsc.length > 0, `price_asc sorgusunda fiyatı olan ${pricedAsc.length} ürün bulundu`);
  
  let priceAscSorted = true;
  for (let i = 0; i < pricedAsc.length - 1; i++) {
    if (pricedAsc[i].salePrice > pricedAsc[i + 1].salePrice) {
      priceAscSorted = false;
      break;
    }
  }
  assert(priceAscSorted, `Fiyatlar düşükten yükseğe sıralandı (${pricedAsc[0]?.salePrice} ₺ <= ${pricedAsc[pricedAsc.length - 1]?.salePrice} ₺)`);

  // 3. PRICE_DESC (Fiyat: Yüksekten Düşüğe)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 3. 'price_desc' -> Fiyat: Yüksekten Düşüğe (salePrice: desc)");
  console.log("-------------------------------------------------------------------------------");
  const priceDescRes = await fetch(`${BASE_URL}/api/products?sortBy=price_desc&limit=10`);
  assert(priceDescRes.status === 200, "GET /api/products?sortBy=price_desc HTTP 200 OK döndü");
  const priceDescData = await priceDescRes.json();
  const pricedDesc = priceDescData.products.filter((p: any) => p.salePrice !== null && p.salePrice !== undefined);
  assert(pricedDesc.length > 0, `price_desc sorgusunda fiyatı olan ${pricedDesc.length} ürün bulundu`);
  
  let priceDescSorted = true;
  for (let i = 0; i < pricedDesc.length - 1; i++) {
    if (pricedDesc[i].salePrice < pricedDesc[i + 1].salePrice) {
      priceDescSorted = false;
      break;
    }
  }
  assert(priceDescSorted, `Fiyatlar yüksekten düşüğe sıralandı (${pricedDesc[0]?.salePrice} ₺ >= ${pricedDesc[pricedDesc.length - 1]?.salePrice} ₺)`);

  // 4. NEWEST (En Yeniler)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 4. 'newest' -> En Yeniler (createdAt: desc)");
  console.log("-------------------------------------------------------------------------------");
  const newestRes = await fetch(`${BASE_URL}/api/products?sortBy=newest&limit=6`);
  assert(newestRes.status === 200, "GET /api/products?sortBy=newest HTTP 200 OK döndü");
  const newestData = await newestRes.json();
  
  let newestSorted = true;
  for (let i = 0; i < newestData.products.length - 1; i++) {
    const t1 = new Date(newestData.products[i].createdAt).getTime();
    const t2 = new Date(newestData.products[i + 1].createdAt).getTime();
    if (t1 < t2) {
      newestSorted = false;
      break;
    }
  }
  assert(newestSorted, "Ürünler oluşturulma tarihine göre en yeniden eskiye (createdAt: desc) sıralandı");

  // 5. BEST_SELLER (En Çok Satanlar)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 5. 'best_seller' -> En Çok Satanlar (orderItems: { _count: 'desc' })");
  console.log("-------------------------------------------------------------------------------");
  const bestSellerRes = await fetch(`${BASE_URL}/api/products?sortBy=best_seller&limit=6`);
  assert(bestSellerRes.status === 200, "GET /api/products?sortBy=best_seller HTTP 200 OK döndü");
  const bestSellerData = await bestSellerRes.json();
  
  let bestSellerSorted = true;
  for (let i = 0; i < bestSellerData.products.length - 1; i++) {
    const c1 = bestSellerData.products[i]._count?.orderItems ?? 0;
    const c2 = bestSellerData.products[i + 1]._count?.orderItems ?? 0;
    if (c1 < c2) {
      bestSellerSorted = false;
      break;
    }
  }
  assert(bestSellerSorted, `Ürünler sipariş kalem miktarına göre çoktan aza sıralandı (${bestSellerData.products[0]?._count?.orderItems ?? 0} >= ${bestSellerData.products[bestSellerData.products.length - 1]?._count?.orderItems ?? 0})`);

  // 6. MOST_RENTED (En Çok Kiralananlar)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 6. 'most_rented' -> En Çok Kiralananlar (rentals: { _count: 'desc' })");
  console.log("-------------------------------------------------------------------------------");
  const mostRentedRes = await fetch(`${BASE_URL}/api/products?sortBy=most_rented&limit=6`);
  assert(mostRentedRes.status === 200, "GET /api/products?sortBy=most_rented HTTP 200 OK döndü");
  const mostRentedData = await mostRentedRes.json();
  
  let mostRentedSorted = true;
  for (let i = 0; i < mostRentedData.products.length - 1; i++) {
    const r1 = mostRentedData.products[i]._count?.rentals ?? 0;
    const r2 = mostRentedData.products[i + 1]._count?.rentals ?? 0;
    if (r1 < r2) {
      mostRentedSorted = false;
      break;
    }
  }
  assert(mostRentedSorted, `Ürünler kiralama işlem miktarına göre çoktan aza sıralandı (${mostRentedData.products[0]?._count?.rentals ?? 0} >= ${mostRentedData.products[mostRentedData.products.length - 1]?._count?.rentals ?? 0})`);

  // 7. MOST_FAVORITED (En Favoriler)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 7. 'most_favorited' -> En Favoriler (favorites: { _count: 'desc' })");
  console.log("-------------------------------------------------------------------------------");
  const mostFavRes = await fetch(`${BASE_URL}/api/products?sortBy=most_favorited&limit=6`);
  assert(mostFavRes.status === 200, "GET /api/products?sortBy=most_favorited HTTP 200 OK döndü");
  const mostFavData = await mostFavRes.json();
  
  let mostFavSorted = true;
  for (let i = 0; i < mostFavData.products.length - 1; i++) {
    const f1 = mostFavData.products[i]._count?.favorites ?? 0;
    const f2 = mostFavData.products[i + 1]._count?.favorites ?? 0;
    if (f1 < f2) {
      mostFavSorted = false;
      break;
    }
  }
  assert(mostFavSorted, `Ürünler favorilenme adedine göre çoktan aza sıralandı (${mostFavData.products[0]?._count?.favorites ?? 0} >= ${mostFavData.products[mostFavData.products.length - 1]?._count?.favorites ?? 0})`);

  // 8. RATING (En Yüksek Puanlılar)
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 8. 'rating' -> En Yüksek Puanlılar (averageRating: 'desc')");
  console.log("-------------------------------------------------------------------------------");
  const ratingRes = await fetch(`${BASE_URL}/api/products?sortBy=rating&limit=6`);
  assert(ratingRes.status === 200, "GET /api/products?sortBy=rating HTTP 200 OK döndü");
  const ratingData = await ratingRes.json();
  
  let ratingSorted = true;
  for (let i = 0; i < ratingData.products.length - 1; i++) {
    const rat1 = ratingData.products[i].averageRating ?? 0;
    const rat2 = ratingData.products[i + 1].averageRating ?? 0;
    if (rat1 < rat2) {
      ratingSorted = false;
      break;
    }
  }
  assert(ratingSorted, `Ürünler ortalama puanına göre yüksekten düşüğe sıralandı (${ratingData.products[0]?.averageRating ?? 0} >= ${ratingData.products[ratingData.products.length - 1]?.averageRating ?? 0})`);

  // 9. UI BİLEŞENİ VE SAYFA KOD DOĞRULAMASI
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 9. UI Bileşeni (ProductSortSelect.tsx) ve Sayfa Entegrasyonu");
  console.log("-------------------------------------------------------------------------------");

  const selectComponentPath = path.join(process.cwd(), "src/features/products/components/ProductSortSelect.tsx");
  assert(fs.existsSync(selectComponentPath), "src/features/products/components/ProductSortSelect.tsx bileşeni mevcut");

  const selectContent = fs.readFileSync(selectComponentPath, "utf-8");
  assert(selectContent.includes('"recommended"'), "ProductSortSelect 'recommended' opsiyonunu içeriyor");
  assert(selectContent.includes('"price_asc"'), "ProductSortSelect 'price_asc' opsiyonunu içeriyor");
  assert(selectContent.includes('"price_desc"'), "ProductSortSelect 'price_desc' opsiyonunu içeriyor");
  assert(selectContent.includes('"newest"'), "ProductSortSelect 'newest' opsiyonunu içeriyor");
  assert(selectContent.includes('"best_seller"'), "ProductSortSelect 'best_seller' opsiyonunu içeriyor");
  assert(selectContent.includes('"most_rented"'), "ProductSortSelect 'most_rented' opsiyonunu içeriyor");
  assert(selectContent.includes('"most_favorited"'), "ProductSortSelect 'most_favorited' opsiyonunu içeriyor");
  assert(selectContent.includes('"rating"'), "ProductSortSelect 'rating' opsiyonunu içeriyor");
  assert(selectContent.includes("params.set(\"sortBy\", newSort)"), "ProductSortSelect searchParams'a sortBy ekliyor");

  const pagePath = path.join(process.cwd(), "src/app/(shop)/products/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  assert(pageContent.includes("ProductSortSelect"), "Ürün listeleme sayfasında (page.tsx) ProductSortSelect bileşeni import ve render ediliyor");
  assert(pageContent.includes("sortBy"), "Ürün listeleme sayfası URL'den gelen sortBy parametresini ProductService.list'e aktarıyor");

  // Sayfa HTML erişimi
  const pageHttpRes = await fetch(`${BASE_URL}/products?sortBy=price_asc`);
  assert(pageHttpRes.status === 200, "HTTP GET /products?sortBy=price_asc başarıyla 200 OK döndü");

  console.log("\n===============================================================================");
  if (totalFailed === 0) {
    console.log(`🎉 TÜM 8 SIRALAMA OPSİYONU VE UI ENTEGRASYONU TESTLERİ BAŞARIYLA TAMAMLANDI! (${totalPassed}/${totalPassed} Geçti)`);
  } else {
    console.error(`⚠️ TEST BAŞARISIZ! Geçen: ${totalPassed}, Kalan: ${totalFailed}`);
    process.exit(1);
  }
  console.log("===============================================================================\n");
}

main()
  .catch((e) => {
    console.error("Test sırasında beklenmeyen hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
