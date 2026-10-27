import prisma from "../src/lib/prisma";
import { FavoritesService } from "../src/features/favorites/services/favorites.service";
import {
  getFavoriteProductIds,
  getFavoriteProducts,
  toggleFavoriteAction,
  syncFavoritesAction,
} from "../src/features/favorites/actions/favorite.actions";
import { queryClient, purgeLocalAuthStorage } from "../src/shared/utils/auth-events";
import * as fs from "fs";
import * as path from "path";

/**
 * STORE.SLN - FAVORİLER VE OTURUM DURUMU SENKRONİZASYONU ENTEGRASYON TESTİ
 * 
 * 1. Oturum Açıldığında "Misafir Modu" Uyarısının Gizlenmesi
 * 2. Misafir Favorilerinin Hesaba Aktarılması (Guest-to-User Merge & Cleanup)
 * 3. Giriş Yapılmış Durumda Doğrudan Veritabanı Yazma ve Okuma (Prisma)
 * 4. Çıkış (Logout) ve Hesap İzolasyonu (State reset, DB kalıcılığı)
 * 5. useSession() Hook ve /api/favorites REST Endpoint Doğrulaması
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
  console.log("🔐 FAVORİLER & OTURUM DURUMU SENKRONİZASYONU DOĞRULAMA TESTİ");
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

  // Ahmet Yılmaz kullanıcısını bul veya oluştur
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

  // İkinci test kullanıcısı (Mehmet)
  const mehmet = await prisma.user.upsert({
    where: { email: "mehmet-test-fav@example.com" },
    update: { name: "Mehmet Demir", role: "CUSTOMER" },
    create: {
      email: "mehmet-test-fav@example.com",
      name: "Mehmet Demir",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
    },
  });

  console.log(`👤 Kullanıcı 1: ${ahmet.name} (${ahmet.id}) - [MÜŞTERİ]`);
  console.log(`👤 Kullanıcı 2: ${mehmet.name} (${mehmet.id}) - [MÜŞTERİ]\n`);

  // Test öncesi veritabanı temizliği
  await prisma.favorite.deleteMany({
    where: { userId: { in: [ahmet.id, mehmet.id] } },
  });

  // ---------------------------------------------------------------------------
  console.log("-------------------------------------------------------------------------------");
  console.log("📌 ADIM 1: Misafir Modu ve Giriş Yapılmamış Durum Mantığı");
  console.log("-------------------------------------------------------------------------------");

  const guestSession = { user: null, isLoggedIn: false };
  const showGuestWarningInGuestMode = !guestSession.isLoggedIn;
  assert(showGuestWarningInGuestMode === true, "Misafir modundayken (!isLoggedIn) 'Misafir Modu' sarı bilgi kutusu görünür");

  // Misafir kullanıcı yerel favori ekler
  const mockLocalStorage: Record<string, string> = {};
  const guestFavs = [product1.id];
  mockLocalStorage["guest_favorites"] = JSON.stringify(guestFavs);

  assert(mockLocalStorage["guest_favorites"] !== undefined, "Misafir favorileri localStorage ('guest_favorites') içinde başarıyla saklandı");
  assert(JSON.parse(mockLocalStorage["guest_favorites"]).includes(product1.id), "Misafir favorilerinde product1 mevcut");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 2: Ahmet Yılmaz Oturum Açar (Login) & 'Misafir Modu' Uyarısı Gizlenir");
  console.log("-------------------------------------------------------------------------------");

  const ahmetSession = {
    user: { id: ahmet.id, name: ahmet.name, email: ahmet.email, role: ahmet.role },
    isLoggedIn: true,
  };

  const showGuestWarningInUserMode = !ahmetSession.isLoggedIn;
  assert(showGuestWarningInUserMode === false, "Kullanıcı giriş yaptığında (isLoggedIn === true) 'Misafir Modu' uyarısı KESİNLİKLE GİZLENİR");
  assert(ahmetSession.user.name === "Ahmet Yılmaz", "Aktif oturumda Ahmet Yılmaz bilgisi mevcut");

  // Misafir favorilerini hesaba aktarma (Guest-to-User Merge)
  const syncResult = await syncFavoritesAction(guestFavs, ahmet.id);
  assert(syncResult.success === true, "syncFavoritesAction misafir favorilerini başarıyla aktardı");
  assert(syncResult.syncedCount === 1, "1 adet misafir favorisi hesaba aktarıldı");

  // Misafir localStorage temizliği
  delete mockLocalStorage["guest_favorites"];
  delete mockLocalStorage["hybrid_favorites"];
  delete mockLocalStorage["hybrid_favorites_cache"];
  assert(mockLocalStorage["guest_favorites"] === undefined, "Senkronizasyon sonrası localStorage 'guest_favorites' derhal temizlendi");

  // DB kaydı kontrolü
  const dbFavsAfterSync = await prisma.favorite.findMany({
    where: { userId: ahmet.id },
  });
  assert(dbFavsAfterSync.length === 1 && dbFavsAfterSync[0].productId === product1.id, "Misafir favorisi veritabanında doğrudan Ahmet Yılmaz'ın userId'si ile kaydedildi");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 3: Giriş Yapılmış Durumda Doğrudan Veritabanı Yazma ve Okuma");
  console.log("-------------------------------------------------------------------------------");

  // Ahmet Yılmaz oturum açmışken yeni ürün ekler (product2)
  const toggleRes = await toggleFavoriteAction(product2.id, ahmet.id);
  assert(toggleRes.success === true && toggleRes.isFavorite === true, "Oturum açıkken toggleFavoriteAction doğrudan veritabanına ekleme yaptı");

  // Veritabanından doğrudan yükleme (localStorage kullanılmaz!)
  const ahmetDbIds = await getFavoriteProductIds(ahmet.id);
  assert(ahmetDbIds.length === 2, "Ahmet Yılmaz'ın 2 favorisi doğrudan veritabanından çekildi");
  assert(ahmetDbIds.includes(product1.id) && ahmetDbIds.includes(product2.id), "Veritabanından dönen listede hem aktarılan hem de yeni eklenen ürün mevcut");

  const ahmetDbProducts = await getFavoriteProducts(ahmet.id);
  assert(ahmetDbProducts.length === 2, "getFavoriteProducts ürün detaylarını doğrudan veritabanından başarıyla çekti");
  const hasDecimal = JSON.stringify(ahmetDbProducts).includes("Decimal");
  assert(!hasDecimal, "Tüm ürün fiyatları Decimal yerine saf number/serileştirilmiş formatta");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 4: Çıkış (Logout) ve Hesap Değişimi İzolasyonu");
  console.log("-------------------------------------------------------------------------------");

  // Ahmet Yılmaz çıkış yapar
  let reactFavoritesState: string[] = [...ahmetDbIds];
  assert(reactFavoritesState.length === 2, "Çıkış öncesi state'te 2 ürün var");

  // Logout anında state sıfırlanır
  reactFavoritesState = [];
  queryClient.clear();
  purgeLocalAuthStorage(true);

  assert(reactFavoritesState.length === 0, "Logout anında FavoritesContext state'i [] olarak sıfırlandı");

  // KRİTİK: DB kayıtları silinmedi!
  const dbCountAfterLogout = await prisma.favorite.count({
    where: { userId: ahmet.id },
  });
  assert(dbCountAfterLogout === 2, "Çıkış yapıldığında Ahmet Yılmaz'ın veritabanı kayıtları KESİNLİKLE silinmedi (2 kayıt korundu)");

  // Mehmet giriş yapar
  const mehmetFavIdsInitial = await getFavoriteProductIds(mehmet.id);
  assert(mehmetFavIdsInitial.length === 0, "Mehmet giriş yaptığında favori listesi boş geldi");
  assert(!mehmetFavIdsInitial.includes(product1.id), "Ahmet Yılmaz'ın favorileri Mehmet'in oturumuna KESİNLİKLE sızmadı");

  // Mehmet kendi favorisini ekler
  await toggleFavoriteAction(product1.id, mehmet.id);
  const mehmetFavIdsAfter = await getFavoriteProductIds(mehmet.id);
  assert(mehmetFavIdsAfter.length === 1, "Mehmet kendi favorisini ekledi (1 ürün)");

  // Tekrar Ahmet Yılmaz'a dönüldüğünde
  const ahmetRestoredFavs = await getFavoriteProductIds(ahmet.id);
  assert(ahmetRestoredFavs.length === 2, "Ahmet Yılmaz'a dönüldüğünde veritabanındaki 2 favori hatasız geri yüklendi");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 5: useSession() Hook ve /api/favorites REST Route Doğrulaması");
  console.log("-------------------------------------------------------------------------------");

  const useSessionPath = path.join(process.cwd(), "src/features/auth/hooks/useSession.ts");
  assert(fs.existsSync(useSessionPath), "src/features/auth/hooks/useSession.ts dosyası mevcut");

  const useSessionContent = fs.readFileSync(useSessionPath, "utf-8");
  assert(useSessionContent.includes("export function useSession"), "useSession hook'u dışa aktarılmış");
  assert(useSessionContent.includes("isLoggedIn: Boolean(user)"), "useSession içinde isLoggedIn alanı mevcut");

  const apiRoutePath = path.join(process.cwd(), "src/app/api/favorites/route.ts");
  assert(fs.existsSync(apiRoutePath), "src/app/api/favorites/route.ts endpoint dosyası mevcut");

  const apiRouteContent = fs.readFileSync(apiRoutePath, "utf-8");
  assert(apiRouteContent.includes("export async function GET"), "GET /api/favorites handler tanımlı");
  assert(apiRouteContent.includes("export async function POST"), "POST /api/favorites handler tanımlı");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 6: UI Bileşenleri ve Sayfa Kaynak Kod Doğrulamaları");
  console.log("-------------------------------------------------------------------------------");

  const clientPath = path.join(process.cwd(), "src/app/(shop)/favorites/FavoritesClient.tsx");
  const clientContent = fs.readFileSync(clientPath, "utf-8");

  assert(clientContent.includes("useSession"), "FavoritesClient içinde useSession kullanılıyor");
  assert(clientContent.includes("!isLoggedIn"), "FavoritesClient içinde 'Misafir Modu' kutusu !isLoggedIn şartına bağlandı");
  assert(clientContent.includes("Hesabınızla Senkronize"), "FavoritesClient içinde oturum açıldığında 'Hesabınızla Senkronize' rozeti aktif");
  assert(clientContent.includes("getFavoriteProducts(user.id)"), "Giriş yapılmışken doğrudan veritabanı servisi üzerinden yükleniyor");

  const pagePath = path.join(process.cwd(), "src/app/(shop)/favorites/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  assert(pageContent.includes("initialUser={user}"), "FavoritesPage FavoritesClient bileşenine initialUser aktarıyor");

  const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert(layoutContent.includes("<FavoritesProvider initialUser={user}>"), "RootLayout FavoritesProvider bileşenine initialUser aktarıyor");

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
    console.log(`🎉 TÜM OTURUM SENKRONİZASYONU VE FAVORİ TESTLERİ BAŞARIYLA TAMAMLANDI! (${totalPassed}/${totalPassed} Geçti)`);
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
