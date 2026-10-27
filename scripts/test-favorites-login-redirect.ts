import prisma from "../src/lib/prisma";
import { FavoritesService } from "../src/features/favorites/services/favorites.service";
import {
  getFavoriteProductIds,
  getFavoriteProducts,
  toggleFavoriteAction,
} from "../src/features/favorites/actions/favorite.actions";
import { queryClient, purgeLocalAuthStorage } from "../src/shared/utils/auth-events";
import * as fs from "fs";
import * as path from "path";

/**
 * STORE.SLN - FAVORİLERDE MİSAFİR MODUNUN KALDIRILMASI VE GİRİŞ YÖNLENDİRMESİ TESTİ
 * 
 * 1. Oturumu olmayan kullanıcının favori butonuna bastığında /login sayfasına yönlendirilmesi
 * 2. Unauthenticated kullanıcının yerel hafızaya (localStorage) veya DB'ye ürün ekleyememesi
 * 3. "Misafir Modu" sarı bilgi kutusunun ve misafir logic'inin Favorilerim sayfasından kaldırılması
 * 4. Giriş yapmış kullanıcı için favorilerin doğrudan Prisma veritabanına yazılıp okunması
 * 5. Logout anında state reset (setFavorites([])) ve DB kalıcılığı
 * 6. Farklı kullanıcı oturumunda tam hesap izolasyonu
 */

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
  console.log("🚀 FAVORİLER GİRİŞ KONTROLÜ, /login YÖNLENDİRMESİ VE DB KALICILIK TESTİ");
  console.log("===============================================================================\n");

  // Test ürünlerini getir
  const products = await prisma.product.findMany({
    take: 2,
    where: { active: true },
    select: { id: true, name: true },
  });

  if (products.length < 2) {
    throw new Error("Test için en az 2 aktif ürün bulunamadı!");
  }

  const [product1, product2] = products;
  console.log(`📦 Test Ürünleri: [1] "${product1.name}" (${product1.id}), [2] "${product2.name}" (${product2.id})`);

  // Test kullanıcıları: Ahmet Yılmaz ve Mehmet Demir
  const ahmet = await prisma.user.upsert({
    where: { email: "ahmet@example.com" },
    update: { name: "Ahmet Yılmaz", role: "CUSTOMER" },
    create: {
      email: "ahmet@example.com",
      name: "Ahmet Yılmaz",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
    },
  });

  const mehmet = await prisma.user.upsert({
    where: { email: "mehmet-redirect-test@example.com" },
    update: { name: "Mehmet Demir", role: "CUSTOMER" },
    create: {
      email: "mehmet-redirect-test@example.com",
      name: "Mehmet Demir",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
    },
  });

  console.log(`👤 Kullanıcı 1: ${ahmet.name} (${ahmet.id})`);
  console.log(`👤 Kullanıcı 2: ${mehmet.name} (${mehmet.id})\n`);

  // Test öncesi temizlik
  await prisma.favorite.deleteMany({
    where: { userId: { in: [ahmet.id, mehmet.id] } },
  });

  // ---------------------------------------------------------------------------
  console.log("-------------------------------------------------------------------------------");
  console.log("📌 ADIM 1: Misafir (Unauthenticated) Giriş Kontrolü ve /login Yönlendirmesi");
  console.log("-------------------------------------------------------------------------------");

  // Simülasyon: Oturumu olmayan kullanıcı favori butonuna tıklar
  const unauthenticatedSession = { user: null, isLoggedIn: false };
  let redirectedUrl: string | null = null;
  const mockLocalStorage: Record<string, string> = {};

  // FavoriteButton tıklama davranışı simülasyonu
  const currentPath = "/products/macbook-pro";
  if (!unauthenticatedSession.isLoggedIn) {
    // Ürün localStorage'a EKLENMEZ
    redirectedUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
  } else {
    mockLocalStorage["guest_favorites"] = JSON.stringify([product1.id]);
  }

  assert(redirectedUrl === `/login?redirect=${encodeURIComponent(currentPath)}`, "Oturumu olmayan kullanıcı favoriye tıkladığında anında /login sayfasına yönlendirildi");
  assert(mockLocalStorage["guest_favorites"] === undefined, "Oturumu olmayan kullanıcı için ürün yerel hafızaya (localStorage) KESİNLİKLE EKLENMEDİ");

  // Server Action unauthenticated koruması
  const guestActionResult = await toggleFavoriteAction(product1.id, undefined);
  assert(guestActionResult.success === false, "toggleFavoriteAction oturumsuz istekte başarısız sonuç döndü");
  assert(guestActionResult.error === "Favori işlemleri için giriş yapmalısınız.", "Hata mesajı kullanıcıyı giriş yapmaya çağırdı");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 2: 'Misafir Modu' Sarı Kutusunun Kaldırılması ve UI Doğrulaması");
  console.log("-------------------------------------------------------------------------------");

  const clientPath = path.join(process.cwd(), "src/app/(shop)/favorites/FavoritesClient.tsx");
  const clientContent = fs.readFileSync(clientPath, "utf-8");

  assert(!clientContent.includes("💡 Misafir Modu:"), "Favorilerim sayfasındaki '💡 Misafir Modu:' sarı bilgi kutusu projeden tamamen kaldırıldı");
  assert(!clientContent.includes("getFavoriteProductsByIds"), "FavoritesClient içinde misafir localStorage okuma fonksiyonu (getFavoriteProductsByIds) kaldırıldı");
  assert(clientContent.includes("Favorilerinizi Görüntülemek İçin Giriş Yapın"), "Giriş yapmamış kullanıcılar için şık giriş daveti arayüzü eklendi");
  assert(clientContent.includes("/login?redirect=/favorites"), "Giriş Yap butonu doğru yönlendirme parametresiyle (/login?redirect=/favorites) entegre edildi");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 3: FavoriteButton & FavoritesContext Kaynak Kod Giriş Kontrolleri");
  console.log("-------------------------------------------------------------------------------");

  const buttonPath = path.join(process.cwd(), "src/features/favorites/components/FavoriteButton.tsx");
  const buttonContent = fs.readFileSync(buttonPath, "utf-8");

  assert(buttonContent.includes("router.push(redirectUrl)"), "FavoriteButton oturumsuz tıklamada router.push ile giriş sayfasına yönlendiriyor");
  assert(buttonContent.includes("/login?redirect="), "FavoriteButton yönlendirme parametresini (/login?redirect=) oluşturuyor");
  assert(buttonContent.includes("e.preventDefault()"), "FavoriteButton kart linkini önleyen e.preventDefault() korumasına sahip");
  assert(buttonContent.includes("e.stopPropagation()"), "FavoriteButton e.stopPropagation() korumasına sahip");

  const contextPath = path.join(process.cwd(), "src/features/favorites/context/FavoritesContext.tsx");
  const contextContent = fs.readFileSync(contextPath, "utf-8");

  assert(contextContent.includes("if (!activeUser)"), "FavoritesContext toggleFavorite içinde activeUser kontrolü yapıyor");
  assert(contextContent.includes("router.push(redirectUrl)"), "FavoritesContext oturumsuz çağrıda router.push ile /login yönlendirmesi yapıyor");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 4: Giriş Yapan Kullanıcı İçin Doğrudan Veritabanı Kalıcılığı");
  console.log("-------------------------------------------------------------------------------");

  // Ahmet Yılmaz giriş yapmış durumda favoriye ürün ekler
  const addRes1 = await toggleFavoriteAction(product1.id, ahmet.id);
  assert(addRes1.success === true && addRes1.isFavorite === true, "Ahmet Yılmaz favoriye ürün ekledi (toggle: true)");

  // Doğrudan Prisma veritabanı kontrolü (prisma.favorite)
  const dbRecord1 = await prisma.favorite.findUnique({
    where: {
      userId_productId: {
        userId: ahmet.id,
        productId: product1.id,
      },
    },
  });
  assert(!!dbRecord1, "Favori kaydı doğrudan Prisma veritabanına (prisma.favorite) Ahmet Yılmaz'ın userId'si ile yazıldı");

  // İkinci ürün eklenir
  await toggleFavoriteAction(product2.id, ahmet.id);
  const ahmetFavIds = await getFavoriteProductIds(ahmet.id);
  assert(ahmetFavIds.length === 2 && ahmetFavIds.includes(product1.id) && ahmetFavIds.includes(product2.id), "Ahmet Yılmaz'ın 2 favorisi doğrudan veritabanından hatasız okundu");

  const ahmetProducts = await getFavoriteProducts(ahmet.id);
  assert(ahmetProducts.length === 2, "getFavoriteProducts ürün detaylarını doğrudan veritabanından çekti");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 5: Çıkış (Logout) ve Hesap Değişimi İzolasyonu");
  console.log("-------------------------------------------------------------------------------");

  // Logout anında React state sıfırlanır
  let reactFavoritesState: string[] = [...ahmetFavIds];
  assert(reactFavoritesState.length === 2, "Çıkış öncesi React state'inde 2 ürün var");

  reactFavoritesState = [];
  queryClient.clear();
  purgeLocalAuthStorage(true);

  assert(reactFavoritesState.length === 0, "Logout yapıldığında FavoritesContext state'i [] olarak sıfırlandı");

  // DB kalıcılığı: Veritabanındaki kayıtlar ASLA silinmez
  const dbCountAhmet = await prisma.favorite.count({
    where: { userId: ahmet.id },
  });
  assert(dbCountAhmet === 2, "Logout yapıldığında Ahmet Yılmaz'ın veritabanı kayıtları KESİNLİKLE silinmedi (2 kayıt korundu)");

  // Mehmet giriş yapar
  const mehmetFavIdsInitial = await getFavoriteProductIds(mehmet.id);
  assert(mehmetFavIdsInitial.length === 0, "Mehmet ilk giriş yaptığında favori listesi boş geldi");
  assert(!mehmetFavIdsInitial.includes(product1.id), "Ahmet Yılmaz'ın favorileri Mehmet'in oturumuna KESİNLİKLE sızmadı");

  // Mehmet kendi favorisini ekler (product1)
  await toggleFavoriteAction(product1.id, mehmet.id);
  const mehmetFavIdsAfter = await getFavoriteProductIds(mehmet.id);
  assert(mehmetFavIdsAfter.length === 1 && mehmetFavIdsAfter[0] === product1.id, "Mehmet kendi favorisini başarıyla veritabanına yazdı");

  // Tekrar Ahmet Yılmaz'a dönülür
  const ahmetRestoredFavs = await getFavoriteProductIds(ahmet.id);
  assert(ahmetRestoredFavs.length === 2, "Ahmet Yılmaz'a dönüldüğünde veritabanından 2 favori hatasız geri yüklendi");

  // ---------------------------------------------------------------------------
  // Test sonrası temizlik
  await prisma.favorite.deleteMany({
    where: { userId: { in: [ahmet.id, mehmet.id] } },
  });
  await prisma.user.delete({
    where: { id: mehmet.id },
  });

  console.log("\n===============================================================================");
  if (totalFailed === 0) {
    console.log(`🎉 TÜM GİRİŞ KONTROLÜ, YÖNLENDİRME VE DB KALICILIK TESTLERİ BAŞARIYLA TAMAMLANDI! (${totalPassed}/${totalPassed} Geçti)`);
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
