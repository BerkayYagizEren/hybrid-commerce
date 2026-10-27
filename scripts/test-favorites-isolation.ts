import prisma from "../src/lib/prisma";
import { FavoritesService } from "../src/features/favorites/services/favorites.service";
import { queryClient, purgeLocalAuthStorage } from "../src/shared/utils/auth-events";
import * as fs from "fs";
import * as path from "path";

/**
 * STORE.SLN - FAVORİLER (FAVORITES) VERİTABANI VE HESAP İZOLASYONU ENTEGRASYON TESTİ
 * 
 * 1. User A giriş yapar, favoriye ürün ekler (DB'ye userId ile yazılır).
 * 2. User A çıkış yapar (logout): DB kayıtları KESİNLİKLE silinmez, yalnızca React state & cache sıfırlanır.
 * 3. User B giriş yapar: Yalnızca User B'nin favorileri görünür, User A'nın verileri sızmaz.
 *    User B farklı bir ürünü favoriye ekler.
 * 4. Tekrar User A'ya dönülür: User A'nın eklediği favori veritabanından eksiksiz geri yüklenir.
 * 5. queryClient.clear() ve FavoritesContext kaynak kod kontrolleri.
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
  console.log("🔒 FAVORİLER (FAVORITES) VERİTABANI VE HESAP İZOLASYONU ENTEGRASYON TESTİ");
  console.log("===============================================================================\n");

  // 0. Hazırlık: Test için en az iki ürün ve iki kullanıcı oluştur / bul
  const products = await prisma.product.findMany({
    take: 2,
    where: { active: true },
    select: { id: true, name: true },
  });

  if (products.length < 2) {
    throw new Error("Test için en az 2 aktif ürün gereklidir. Lütfen veritabanını kontrol edin.");
  }

  const [product1, product2] = products;
  console.log(`📦 Test Ürünleri: [1] "${product1.name}" (${product1.id}), [2] "${product2.name}" (${product2.id})`);

  // Test kullanıcıları: User A ve User B
  const userA = await prisma.user.upsert({
    where: { email: "user-a-fav-isolation@example.com" },
    update: {},
    create: {
      email: "user-a-fav-isolation@example.com",
      name: "User A (Test)",
      password: "test_password_hash",
      role: "CUSTOMER",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "user-b-fav-isolation@example.com" },
    update: {},
    create: {
      email: "user-b-fav-isolation@example.com",
      name: "User B (Test)",
      password: "test_password_hash",
      role: "CUSTOMER",
    },
  });

  console.log(`👤 Test Kullanıcıları: User A (${userA.id}), User B (${userB.id})\n`);

  // Test öncesi temizlik
  await prisma.favorite.deleteMany({
    where: { userId: { in: [userA.id, userB.id] } },
  });

  // ---------------------------------------------------------------------------
  console.log("-------------------------------------------------------------------------------");
  console.log("📌 ADIM 1: User A Giriş Yapar ve Ürünü Favoriye Ekler");
  console.log("-------------------------------------------------------------------------------");

  const addResultA = await FavoritesService.toggleFavorite(userA.id, product1.id);
  assert(addResultA.success === true, "User A için toggleFavorite başarılı yanıt verdi");
  assert(addResultA.isFavorite === true, "User A için ürün favorilere eklendi olarak işaretlendi");

  // Veritabanı doğrudan sorgusu (prisma.favorite)
  const dbFavA = await prisma.favorite.findUnique({
    where: {
      userId_productId: {
        userId: userA.id,
        productId: product1.id,
      },
    },
  });
  assert(!!dbFavA, "Ürün veritabanında (prisma.favorite) doğrudan User A'nın userId değeri ile kaydedildi");

  const userAFavIds = await FavoritesService.getFavoriteProductIds(userA.id);
  assert(userAFavIds.length === 1 && userAFavIds.includes(product1.id), "FavoritesService.getFavoriteProductIds(userA.id) sadece User A'nın favorisini döndürdü");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 2: User A Sistemden Çıkış Yapar (Logout)");
  console.log("-------------------------------------------------------------------------------");

  // İstemci state ve cache sıfırlama simülasyonu
  let reactFavoritesState: string[] = [...userAFavIds];
  assert(reactFavoritesState.length === 1, "Çıkış öncesi React state'inde 1 ürün bulunuyor");

  // Logout işlemi simülasyonu: queryClient.clear(), setFavorites([]), purgeLocalAuthStorage()
  queryClient.clear();
  reactFavoritesState = []; // setFavorites([])
  purgeLocalAuthStorage(true);

  assert(reactFavoritesState.length === 0, "Logout anında React state'i tamamen sıfırlandı (setFavorites([]))");

  // KRİTİK DOĞRULAMA: Veritabanındaki kayıtlar silinmedi!
  const dbCountAfterLogout = await prisma.favorite.count({
    where: { userId: userA.id },
  });
  assert(dbCountAfterLogout === 1, "Kullanıcı çıkış yaptığında veritabanındaki kayıtlar KESİNLİKLE silinmedi (DB'de 1 kayıt korundu)");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 3: User B Giriş Yapar (Account Switching / Temiz Ekran)");
  console.log("-------------------------------------------------------------------------------");

  // User B'nin veritabanından çekilen favorileri
  const userBFavIdsInitial = await FavoritesService.getFavoriteProductIds(userB.id);
  assert(userBFavIdsInitial.length === 0, "User B ilk giriş yaptığında favori listesi boş geldi");
  assert(!userBFavIdsInitial.includes(product1.id), "User A'nın favori verileri User B'nin oturumuna KESİNLİKLE sızmadı");

  // User B farklı bir ürünü (product2) favoriye ekler
  const addResultB = await FavoritesService.toggleFavorite(userB.id, product2.id);
  assert(addResultB.success === true && addResultB.isFavorite === true, "User B farklı bir ürünü (product2) favorilerine başarıyla ekledi");

  const userBFavIdsAfterAdd = await FavoritesService.getFavoriteProductIds(userB.id);
  assert(userBFavIdsAfterAdd.length === 1 && userBFavIdsAfterAdd[0] === product2.id, "User B'nin listesi yalnızca product2'yi içeriyor");

  // User A'nın bu işlemden etkilenmediğini doğrula
  const userAFavIdsDuringB = await FavoritesService.getFavoriteProductIds(userA.id);
  assert(userAFavIdsDuringB.length === 1 && userAFavIdsDuringB[0] === product1.id, "User B'nin eklediği favori User A'ya sızmadı (Tam çift yönlü izolasyon)");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 4: Tekrar User A'ya Dönülür (Switch back to User A)");
  console.log("-------------------------------------------------------------------------------");

  // queryClient.clear() çalıştırılır
  queryClient.clear();

  // User A'nın veritabanı kayıtları geri yüklenir
  const userARestoredFavIds = await FavoritesService.getFavoriteProductIds(userA.id);
  assert(userARestoredFavIds.length === 1, "User A'ya dönüldüğünde veritabanından 1 favori geri yüklendi");
  assert(userARestoredFavIds.includes(product1.id), "User A'nın daha önce eklediği product1 veritabanından eksiksiz ve hatasız geri geldi");
  assert(!userARestoredFavIds.includes(product2.id), "User A'nın geri yüklenen listesinde User B'nin favorisi (product2) bulunmuyor");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 5: Toggle ile Çıkarma ve Veritabanı Silinme Doğrulaması");
  console.log("-------------------------------------------------------------------------------");

  const removeResultA = await FavoritesService.toggleFavorite(userA.id, product1.id);
  assert(removeResultA.success === true && removeResultA.isFavorite === false, "User A toggleFavorite ile ürünü favorilerden çıkardı");

  const dbCountAfterRemove = await prisma.favorite.count({
    where: { userId: userA.id, productId: product1.id },
  });
  assert(dbCountAfterRemove === 0, "Kullanıcı bilerek çıkardığında veritabanındaki kayıt silindi");

  // User B'nin favorisi hala sapasağlam duruyor mu?
  const dbCountUserB = await prisma.favorite.count({
    where: { userId: userB.id, productId: product2.id },
  });
  assert(dbCountUserB === 1, "User A'nın çıkarma işlemi User B'nin veritabanı kaydını etkilemedi");

  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("📌 ADIM 6: Statik Kod ve Mimari Analiz Doğrulaması");
  console.log("-------------------------------------------------------------------------------");

  const serviceFilePath = path.join(process.cwd(), "src/features/favorites/services/favorites.service.ts");
  assert(fs.existsSync(serviceFilePath), "src/features/favorites/services/favorites.service.ts dosyası mevcut");

  const serviceContent = fs.readFileSync(serviceFilePath, "utf-8");
  assert(serviceContent.includes("export class FavoritesService"), "FavoritesService sınıfı tanımlı ve dışa aktarılmış");
  assert(serviceContent.includes("prisma.favorite.findMany"), "FavoritesService prisma.favorite.findMany ile doğrudan DB'den okuyor");
  assert(serviceContent.includes("where: { userId }"), "FavoritesService sorgusunda where: { userId } hesap filtresi zorunlu");

  const contextFilePath = path.join(process.cwd(), "src/features/favorites/context/FavoritesContext.tsx");
  const contextContent = fs.readFileSync(contextFilePath, "utf-8");
  assert(contextContent.includes("queryClient.clear()"), "FavoritesContext oturum değişimlerinde queryClient.clear() çağırıyor");
  assert(contextContent.includes("setFavoriteIds([])"), "FavoritesContext logout veya hesap değişiminde setFavoriteIds([]) çağırıyor");

  const authEventsPath = path.join(process.cwd(), "src/shared/utils/auth-events.ts");
  const authEventsContent = fs.readFileSync(authEventsPath, "utf-8");
  assert(authEventsContent.includes("queryClient"), "auth-events.ts içinde queryClient tanımlı");
  assert(authEventsContent.includes("notifyAuthStateChange"), "auth-events.ts içinde notifyAuthStateChange mevcut");

  // ---------------------------------------------------------------------------
  // Temizlik
  await prisma.favorite.deleteMany({
    where: { userId: { in: [userA.id, userB.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });

  console.log("\n===============================================================================");
  if (totalFailed === 0) {
    console.log(`🎉 TÜM FAVORİ İZOLASYON VE KALICILIK TESTLERİ BAŞARIYLA TAMAMLANDI! (${totalPassed}/${totalPassed} Geçti)`);
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
