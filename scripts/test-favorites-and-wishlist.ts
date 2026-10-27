import prisma from "../src/lib/prisma";
import {
  toggleFavoriteAction,
  getFavoriteProductIds,
  getFavoriteProducts,
  getFavoriteProductsByIds,
  syncFavoritesAction,
} from "../src/features/favorites/actions/favorite.actions";
import fs from "fs";
import path from "path";

async function runFavoritesAndWishlistTests() {
  console.log("===============================================================================");
  console.log("❤️ FAVORİLER & İSTEK LİSTESİ (WISHLIST) UÇTAN UCA DOĞRULAMA TESTİ");
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

  const BASE_URL = "http://localhost:3000";

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Veritabanı Modeli ve Benzersizlik Kısıtı (Unique Constraint)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 1: Prisma Favorite Modeli ve Benzersizlik Denetimi");

    // Test Kullanıcısı
    const user = await prisma.user.upsert({
      where: { email: "wishlist.test.user@hybridcommerce.dev" },
      update: { role: "CUSTOMER" },
      create: {
        name: "Wishlist Test Kullanıcısı",
        email: "wishlist.test.user@hybridcommerce.dev",
        password: "wishlist_pw_123",
        role: "CUSTOMER",
      },
    });

    // Test Ürünleri
    const products = await prisma.product.findMany({ take: 3 });
    assert(products.length >= 2, `Veritabanında test için en az 2 ürün bulundu (${products.length} ürün)`);

    const prod1 = products[0];
    const prod2 = products[1];

    // Önceki test kalıntılarını temizle
    await prisma.favorite.deleteMany({ where: { userId: user.id } });

    // İlk favoriyi doğrudan Prisma ile oluştur
    const fav1 = await prisma.favorite.create({
      data: {
        userId: user.id,
        productId: prod1.id,
      },
    });
    assert(Boolean(fav1.id), `Favorite kaydı oluşturuldu (ID: ${fav1.id})`);

    // Duplicate ekleme denemesi (@@unique([userId, productId]) testi)
    let duplicateErrorCaught = false;
    try {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          productId: prod1.id,
        },
      });
    } catch {
      duplicateErrorCaught = true;
    }
    assert(
      duplicateErrorCaught,
      "Aynı kullanıcı aynı ürünü ikinci kez ekleyemez (@@unique kısıtı duplicate kaydı engelledi)"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Server Actions & Toggle Mekanizması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 2: Server Actions (toggleFavoriteAction, getFavoriteProductIds)");

    // prod2'yi toggle ile ekle
    const toggleAdd = await toggleFavoriteAction(prod2.id, user.id);
    assert(
      toggleAdd.success && toggleAdd.isFavorite === true,
      `toggleFavoriteAction yeni ürünü başarıyla ekledi: ${toggleAdd.message}`
    );

    // Favori ID'lerini getir
    const ids = await getFavoriteProductIds(user.id);
    assert(
      ids.includes(prod1.id) && ids.includes(prod2.id) && ids.length === 2,
      `getFavoriteProductIds kullanıcının 2 favorisini eksiksiz listeledi (${ids.length} adet)`
    );

    // getFavoriteProducts ile serileştirilmiş ürünleri getir
    const fullProducts = await getFavoriteProducts(user.id);
    assert(
      fullProducts.length === 2,
      `getFavoriteProducts ürünleri detaylarıyla getirdi (${fullProducts.length} ürün)`
    );
    assert(
      typeof fullProducts[0].salePrice === "number" || fullProducts[0].salePrice === null,
      "Dönen favori ürünlerdeki fiyatlar saf number formatında (0 Decimal nesnesi)"
    );

    // prod1'i toggle ile kaldır
    const toggleRemove = await toggleFavoriteAction(prod1.id, user.id);
    assert(
      toggleRemove.success && toggleRemove.isFavorite === false,
      `toggleFavoriteAction mevcut ürünü başarıyla kaldırdı: ${toggleRemove.message}`
    );

    const idsAfterRemove = await getFavoriteProductIds(user.id);
    assert(
      !idsAfterRemove.includes(prod1.id) && idsAfterRemove.includes(prod2.id) && idsAfterRemove.length === 1,
      "Kaldırılan ürün listeden temizlendi, kalan ürünler korundu"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Misafir (LocalStorage) -> Üye (DB) Senkronizasyonu
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 3: Misafir Modundan Üye Moduna Otomatik Senkronizasyon (Sync)");

    // Senaryo: Misafir tarayıcısında prod1 favorilenmiş olsun
    const guestIds = [prod1.id];
    // Kullanıcının DB'sinde şu anda prod2 var
    const syncResult = await syncFavoritesAction(guestIds, user.id);

    assert(
      syncResult.success && syncResult.syncedCount >= 1,
      `syncFavoritesAction misafir favorilerini başarıyla aktardı (${syncResult.syncedCount} ürün senkronize edildi)`
    );

    assert(
      syncResult.allFavoriteIds.includes(prod1.id) && syncResult.allFavoriteIds.includes(prod2.id),
      "Senkronizasyon sonrası hem misafir favorileri hem de kullanıcının mevcut favorileri birleştirildi (Unified list)"
    );

    // Misafir için ID bazlı ürün detay çekme testi
    const guestFetchedProducts = await getFavoriteProductsByIds([prod1.id, prod2.id]);
    assert(
      guestFetchedProducts.length === 2,
      `getFavoriteProductsByIds misafir için ID listesinden ürünleri getirdi (${guestFetchedProducts.length} ürün)`
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: UI Bileşenleri, Header ve Sayfa Entegrasyonu
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 4: UI Bileşenleri ve /favorites Sayfa Erişimi");

    const headerPath = path.join(process.cwd(), "src/shared/layout/Header.tsx");
    const cardPath = path.join(process.cwd(), "src/features/products/components/ProductCard.tsx");
    const detailPath = path.join(process.cwd(), "src/features/products/components/ProductDetail.tsx");
    const buttonPath = path.join(process.cwd(), "src/features/favorites/components/FavoriteButton.tsx");

    assert(fs.existsSync(buttonPath), "src/features/favorites/components/FavoriteButton.tsx dosyası mevcut");

    const headerContent = fs.readFileSync(headerPath, "utf-8");
    assert(headerContent.includes('href="/favorites"'), "Header bileşeninde /favorites bağlantısı mevcut");
    assert(headerContent.includes("favoriteCount"), "Header bileşeninde canlı favori sayacı entegre edildi");

    const cardContent = fs.readFileSync(cardPath, "utf-8");
    assert(cardContent.includes("FavoriteButton"), "ProductCard üzerinde kalp butonu (FavoriteButton) mevcut");
    assert(cardContent.includes("relative aspect-square") || cardContent.includes("relative"), "Ürün görsel alanı relative konteynıra sahip");
    assert(cardContent.includes("bottom-3 right-3"), "FavoriteButton görsel üzerinde absolute bottom-3 right-3 konumuna sabitlendi");
    assert(cardContent.includes("bg-white/90") && cardContent.includes("hover:bg-white") && cardContent.includes("p-2") && cardContent.includes("rounded-full") && cardContent.includes("shadow-md"), "ProductCard üzerinde FavoriteButton istenen tam sınıflarla konumlandırıldı");

    const reexportCardPath = path.join(process.cwd(), "src/components/ProductCard.tsx");
    assert(fs.existsSync(reexportCardPath), "src/components/ProductCard.tsx mevcut");
    const reexportContent = fs.readFileSync(reexportCardPath, "utf-8");
    assert(reexportContent.includes("FavoriteButton"), "src/components/ProductCard.tsx üzerinde FavoriteButton mevcut");
    assert(reexportContent.includes("bottom-3 right-3"), "src/components/ProductCard.tsx üzerinde bottom-3 right-3 konumlandırması mevcut");

    const buttonContent = fs.readFileSync(buttonPath, "utf-8");
    assert(buttonContent.includes("bg-white/90") && buttonContent.includes("hover:bg-white"), "FavoriteButton yarı saydam beyaz ve hover arkaplanına sahip (bg-white/90 hover:bg-white)");
    assert(buttonContent.includes("rounded-full") && buttonContent.includes("p-2") && buttonContent.includes("backdrop-blur-sm"), "FavoriteButton dairesel ve backdrop-blur-sm filtreye sahip");
    assert(buttonContent.includes("fill-red-500") && buttonContent.includes("text-red-500"), "Favorideyken kalbin içi ve çizgisi kırmızı (fill-red-500 text-red-500)");
    assert(buttonContent.includes("text-gray-600"), "Favoride değilken gri çizgi kalp (text-gray-600) aktif");
    assert(buttonContent.includes("e.stopPropagation()") && buttonContent.includes("e.preventDefault()"), "Kalbe tıklandığında kart yönlendirmesini önleyen e.stopPropagation() ve e.preventDefault() kontrolleri mevcut");

    const contextPath = path.join(process.cwd(), "src/features/favorites/context/FavoritesContext.tsx");
    const contextContent = fs.readFileSync(contextPath, "utf-8");
    assert(contextContent.includes("hybrid_favorites_cache") || contextContent.includes("hybrid_favorites"), "FavoritesContext anlık yerel önbelleğe (localStorage) sahip");
    assert(contextContent.includes("setFavoriteIds(nextIds)"), "FavoritesContext anlık optimistic UI state güncellemesine sahip");

    const detailContent = fs.readFileSync(detailPath, "utf-8");
    assert(detailContent.includes("FavoriteButton"), "ProductDetail detay sayfasında kalp butonu mevcut");

    // Canlı HTTP /favorites sayfası yanıt kontrolü
    const favPageRes = await fetch(`${BASE_URL}/favorites`);
    assert(favPageRes.status === 200, `/favorites sayfası HTTP ${favPageRes.status} OK ile başarıyla yanıt verdi`);

    console.log("\n===============================================================================");
    console.log(`🎉 TÜM FAVORİLER & WISHLIST TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("===============================================================================");
  } catch (error) {
    console.error("\n❌ TEST HATA İLE SONLANDI:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFavoritesAndWishlistTests();
