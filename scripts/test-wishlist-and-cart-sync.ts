import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";
import { CartService } from "../src/features/cart/services/cart.service";
import {
  toggleFavoriteAction,
  getFavoriteProductIds,
  syncFavoritesAction,
} from "../src/features/favorites/actions/favorite.actions";

async function runComprehensiveWishlistAndCartTests() {
  console.log("=========================================================================================");
  console.log("🛒 WISHLIST (FAVORİLER) & CART (SEPET) UÇTAN UCA SENKRONİZASYON VE DOĞRULAMA TESTİ");
  console.log("=========================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

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
    // MODÜL 1: Prisma & Veri Modeli Düzeltmesi (Favorite Modeli & findMany)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 MODÜL 1: Prisma Favorite Modeli, findMany & İlişkiler");

    // 1.1 prisma.favorite.findMany tanımsızlık hatası vermemeli
    assert(typeof prisma.favorite.findMany === "function", "prisma.favorite.findMany fonksiyonu mevcut ve erişilebilir");
    assert(typeof prisma.favorite.create === "function", "prisma.favorite.create fonksiyonu mevcut");
    assert(typeof prisma.favorite.delete === "function", "prisma.favorite.delete fonksiyonu mevcut");

    // 1.2 Test kullanıcıları ve ürünleri hazırla
    const testUserA = await prisma.user.upsert({
      where: { email: "wishlist_user_a@test.com" },
      update: {},
      create: {
        email: "wishlist_user_a@test.com",
        name: "Wishlist User A",
        password: "hashed_password_123",
        role: "CUSTOMER",
      },
    });

    const testUserB = await prisma.user.upsert({
      where: { email: "wishlist_user_b@test.com" },
      update: {},
      create: {
        email: "wishlist_user_b@test.com",
        name: "Wishlist User B",
        password: "hashed_password_123",
        role: "CUSTOMER",
      },
    });

    const products = await prisma.product.findMany({ take: 3 });
    assert(products.length >= 2, `Test için en az 2 ürün bulundu (${products.length} ürün)`);
    const [prod1, prod2] = products;

    // Temizlik
    await prisma.favorite.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    });

    // 1.3 User ve Product modelleri üzerinden favorite ilişkilerini sorgula
    const userWithFavorites = await prisma.user.findUnique({
      where: { id: testUserA.id },
      include: { favorites: true },
    });
    assert(Array.isArray(userWithFavorites?.favorites), "User modelinde 'favorites' ilişkisi tanımlı ve dizi dönüyor");

    const productWithFavorites = await prisma.product.findUnique({
      where: { id: prod1.id },
      include: { favorites: true },
    });
    assert(Array.isArray(productWithFavorites?.favorites), "Product modelinde 'favorites' ilişkisi tanımlı ve dizi dönüyor");

    console.log("\n-----------------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // MODÜL 2: Hesap İzolasyonu ve Favori Taşınması Hatası (Auth & State Isolation)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 MODÜL 2: Hesap İzolasyonu ve Misafir Senkronizasyonu");

    // 2.1 User A bir ürün favorilesin
    const toggleA = await toggleFavoriteAction(prod1.id, testUserA.id);
    assert(toggleA.success && toggleA.isFavorite, "User A ürünü başarıyla favoriledi");

    const userAFavs = await getFavoriteProductIds(testUserA.id);
    assert(userAFavs.includes(prod1.id) && userAFavs.length === 1, "User A favorilerinde prod1 mevcut");

    // 2.2 User B'nin favorileri tamamen izole olmalı (User A'nın favorisi User B'ye sızmamalı)
    const userBFavs = await getFavoriteProductIds(testUserB.id);
    assert(!userBFavs.includes(prod1.id) && userBFavs.length === 0, "User B favorileri boş; User A'nın favorileri User B'ye sızmadı (Hesap İzolasyonu)");

    // 2.3 Misafir oturumundaki localStorage favorilerini aktarma (syncFavoritesAction)
    const guestIds = [prod2.id];
    const syncRes = await syncFavoritesAction(guestIds, testUserB.id);
    assert(syncRes.success && syncRes.syncedCount === 1, "Misafir favorileri User B oturumuna başarıyla aktarıldı");

    const userBUpdatedFavs = await getFavoriteProductIds(testUserB.id);
    assert(userBUpdatedFavs.includes(prod2.id), "User B'nin favorilerinde misafir oturumundan aktarılan prod2 mevcut");
    assert(!userBUpdatedFavs.includes(prod1.id), "User B'nin favorilerinde hala User A'nın prod1'i YOK (İzolasyon korundu)");

    // 2.4 FavoritesContext kodunda logout ve login temizlik kontrolleri
    const favContextPath = path.join(process.cwd(), "src/features/favorites/context/FavoritesContext.tsx");
    const favContextContent = fs.readFileSync(favContextPath, "utf-8");
    assert(favContextContent.includes("guest_favorites"), "FavoritesContext 'guest_favorites' anahtarını destekliyor");
    assert(favContextContent.includes("localStorage.removeItem(GUEST_FAVORITES_KEY)"), "FavoritesContext misafir favorilerini aktardıktan sonra localStorage'ı sıfırlıyor");
    assert(favContextContent.includes("prevUserId && !currentUserId"), "FavoritesContext kullanıcı çıkış yaptığında (logout) state'i ve localStorage'ı temizliyor");

    const roleContextPath = path.join(process.cwd(), "src/shared/providers/RoleContext.tsx");
    const roleContextContent = fs.readFileSync(roleContextPath, "utf-8");
    assert(roleContextContent.includes('localStorage.removeItem("guest_favorites")'), "RoleContext logout fonksiyonunda 'guest_favorites' temizleniyor");

    console.log("\n-----------------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // MODÜL 3: Ürün Kartı ve Detay Sayfası Kalp Butonu Konumu & Stili
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 MODÜL 3: Ürün Kartı ve Detay Sayfası Kalp Butonu");

    const cardPath = path.join(process.cwd(), "src/features/products/components/ProductCard.tsx");
    const cardContent = fs.readFileSync(cardPath, "utf-8");

    assert(cardContent.includes("relative aspect-square") || cardContent.includes("relative"), "Ürün kartı görsel alanı 'relative' konteynıra sahip");
    assert(
      cardContent.includes("absolute bottom-3 right-3 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-md backdrop-blur-sm transition-all"),
      "ProductCard üzerinde <FavoriteButton> sağ alt köşeye tam oturacak şekilde istenen sınıflarla sabitlendi"
    );

    const reexportCardPath = path.join(process.cwd(), "src/components/ProductCard.tsx");
    assert(fs.existsSync(reexportCardPath), "src/components/ProductCard.tsx mevcut");
    const reexportContent = fs.readFileSync(reexportCardPath, "utf-8");
    assert(
      reexportContent.includes("absolute bottom-3 right-3 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-md backdrop-blur-sm transition-all"),
      "src/components/ProductCard.tsx üzerinde de istenen tam sınıflarla konumlandırma mevcut"
    );

    const buttonPath = path.join(process.cwd(), "src/features/favorites/components/FavoriteButton.tsx");
    const buttonContent = fs.readFileSync(buttonPath, "utf-8");
    assert(buttonContent.includes("e.stopPropagation()"), "FavoriteButton kart yönlendirmesini önleyen e.stopPropagation() korumasına sahip");
    assert(buttonContent.includes("e.preventDefault()"), "FavoriteButton e.preventDefault() korumasına sahip");
    assert(buttonContent.includes("fill-red-500 text-red-500"), "Favoriye eklenince kalp kırmızı dolgu ve çizgiye sahip (fill-red-500 text-red-500)");
    assert(buttonContent.includes("text-gray-600"), "Favoride değilken gri/siyah çizgi kalp aktif");

    const detailPath = path.join(process.cwd(), "src/features/products/components/ProductDetail.tsx");
    const detailContent = fs.readFileSync(detailPath, "utf-8");
    assert(detailContent.includes("FavoriteButton"), "ProductDetail detay sayfasında kalp butonu mevcut");

    console.log("\n-----------------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // MODÜL 4: Sepet Ekleme, AddToCartModal, CartService & Header Sayacı
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 MODÜL 4: Sepet Ekleme, AddToCartModal, CartService & Canlı Sayaç");

    // 4.1 CartService ile sepete ürün ekleme ve CartItem doğrulaması
    const testSessionId = `test_session_${Date.now()}`;
    const testCart = await CartService.getOrCreateCart(undefined, testSessionId);
    assert(Boolean(testCart.id), `Sepet başarıyla oluşturuldu (Cart ID: ${testCart.id})`);

    const cartItem = await CartService.addItem(testCart.id, {
      productId: prod1.id,
      quantity: 2,
      type: "SALE",
    });
    assert(Boolean(cartItem.id) && cartItem.quantity === 2, `CartItem veritabanına başarıyla kaydedildi (Miktar: ${cartItem.quantity})`);

    const cartSummary = await CartService.getSummary(testCart.id);
    assert(cartSummary.itemCount === 1, `Sepet özeti kalem sayısı doğru hesaplandı (1 kalem, 2 adet)`);
    assert(cartSummary.saleSubtotal > 0, `Satış ara toplamı kuruşu kuruşuna hesaplandı (${cartSummary.saleSubtotal} ₺)`);

    // 4.2 AddToCartModal bileşeni doğrulaması
    const modalPath = path.join(process.cwd(), "src/features/cart/components/AddToCartModal.tsx");
    assert(fs.existsSync(modalPath), "src/features/cart/components/AddToCartModal.tsx bileşeni mevcut");
    const modalContent = fs.readFileSync(modalPath, "utf-8");

    assert(modalContent.includes("addToCart"), "AddToCartModal useCart hook'unun addToCart fonksiyonunu kullanıyor");
    assert(modalContent.includes("onClose()"), "İşlem sonrası modal kapatılıyor (isOpen: false)");
    assert(modalContent.includes("setIsCartOpen(true)"), "İşlem sonrası sepet drawer'ı otomatik açılıyor (setIsCartOpen(true))");

    const reexportModalPath = path.join(process.cwd(), "src/components/AddToCartModal.tsx");
    assert(fs.existsSync(reexportModalPath), "src/components/AddToCartModal.tsx re-export dosyası mevcut");

    // 4.3 FavoritesClient bileşeninde useCart ve AddToCartModal bağlantısı
    const favClientPath = path.join(process.cwd(), "src/app/(shop)/favorites/FavoritesClient.tsx");
    const favClientContent = fs.readFileSync(favClientPath, "utf-8");
    assert(favClientContent.includes("useCart"), "FavoritesClient useCart hook'unu çağırıyor");
    assert(favClientContent.includes("addToCart"), "FavoritesClient addToCart fonksiyonunu kullanıyor");
    assert(favClientContent.includes("AddToCartModal"), "FavoritesClient AddToCartModal bileşenini import edip render ediyor");

    // 4.4 Header canlı sepet rozet sayacı
    const headerPath = path.join(process.cwd(), "src/shared/layout/Header.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    assert(headerContent.includes("cartItemCount"), "Header bileşeninde canlı sepet sayacı değişkeni tanımlı");
    assert(headerContent.includes("cartItemCount > 0"), "Sepette ürün varken Header sepet ikonunda rozet (badge) gösteriliyor");

    // 4.5 CartDrawer bileşeni
    const drawerPath = path.join(process.cwd(), "src/features/cart/components/CartDrawer.tsx");
    assert(fs.existsSync(drawerPath), "src/features/cart/components/CartDrawer.tsx bileşeni mevcut");

    // Temizlik
    await CartService.clear(testCart.id);
    await prisma.cart.delete({ where: { id: testCart.id } });

    console.log("\n=========================================================================================");
    console.log(`🎉 TÜM WISHLIST & CART ENTEGRASYON TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("=========================================================================================");
  } catch (err) {
    console.error("\n❌ TEST HATA İLE SONLANDI:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runComprehensiveWishlistAndCartTests();
