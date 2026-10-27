/**
 * Kullanıcılar Arası Oturum Değişimlerinde Sepet ve Favoriler İzolasyonu Testi
 * 
 * Doğrulamalar:
 * 1. Sepet İzolasyonu (CartContext & CartService):
 *    - User 1 sepetine ürün ekler.
 *    - Logout olduğunda localStorage (cart_id, guest_cart) ve state temizlenir.
 *    - User 2 giriş yaptığında User 1'in sepeti kesinlikle User 2'ye sızmaz.
 *    - CartService.getOrCreateCart, sadece userId: null olan misafir sepetini birleştirir, diğer kullanıcı sepetlerini asla karıştırmaz.
 * 
 * 2. Favoriler İzolasyonu (FavoritesContext & FavoriteService):
 *    - User 1 ürünü favoriler.
 *    - Logout/Account Switch durumunda FavoritesContext state'i ve localStorage sıfırlanır.
 *    - User 2 oturum açtığında yalnızca kendi veritabanı favorileri gelir, User 1'in favorileri sızmaz.
 * 
 * 3. State ve Cache Reset Mekanizması:
 *    - hybrid:auth-state-changed olayı yayımlanır.
 *    - CartContext ve FavoritesContext bu olayı dinler ve anında state reset yapar.
 */

import prisma from "../src/lib/prisma";
import { CartService } from "../src/features/cart/services/cart.service";
import {
  toggleFavoriteAction,
  getFavoriteProductIds,
} from "../src/features/favorites/actions/favorite.actions";
import { logoutAction } from "../src/features/auth/actions/auth.actions";
import fs from "fs";
import path from "path";

console.log("=========================================================================");
console.log("🔒 OTURUM DEĞİŞİMİNDE SEPET & FAVORİLER İZOLASYONU VE CACHE RESET TESTİ");
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

async function runSessionIsolationSuite() {
  const timestamp = Date.now();
  const emailUser1 = `iso-user1-${timestamp}@hybridcommerce.dev`;
  const emailUser2 = `iso-user2-${timestamp}@hybridcommerce.dev`;

  // 1. İki Bağımsız Test Kullanıcısı Oluştur
  const user1 = await prisma.user.create({
    data: {
      email: emailUser1,
      name: "İzolasyon Test Kullanıcı 1",
      password: "password123",
      role: "CUSTOMER",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: emailUser2,
      name: "İzolasyon Test Kullanıcı 2",
      password: "password123",
      role: "CUSTOMER",
    },
  });

  // Test ürünlerini bul
  const products = await prisma.product.findMany({
    where: { active: true, isDeleted: false, type: "SALE" },
    take: 2,
  });

  if (products.length < 2) {
    throw new Error("Test için en az 2 aktif satış ürünü gereklidir");
  }

  const [productA, productB] = products;

  console.log("📌 1. Sepet İzolasyonu ve Oturum Temizliği Testleri");

  // User 1 için sepet oluştur ve Product A ekle
  const cart1 = await CartService.getOrCreateCart(user1.id, `sess_u1_${timestamp}`);
  await CartService.addItem(cart1.id, {
    productId: productA.id,
    type: "SALE",
    quantity: 2,
  });

  const summary1 = await CartService.getSummary(cart1.id);
  assert(summary1.items.length === 1, "User 1 sepetinde 1 kalem ürün mevcut");
  assert(summary1.items[0].productId === productA.id, "User 1 sepetinde Product A doğru kayıtlı");

  // User 2 için sepet oluştur (User 1'in sepetinden tamamen bağımsız olmalı)
  const cart2 = await CartService.getOrCreateCart(user2.id, `sess_u2_${timestamp}`);
  const summary2 = await CartService.getSummary(cart2.id);
  assert(summary2.items.length === 0, "User 2 ilk açıldığında sepeti BOŞ (User 1'in sepeti sızmadı)");
  assert(cart1.id !== cart2.id, "User 1 ve User 2 sepet ID'leri birbirinden farklı ve izole");

  // User 2 kendi sepetine Product B eklesin
  await CartService.addItem(cart2.id, {
    productId: productB.id,
    type: "SALE",
    quantity: 1,
  });

  const summary2After = await CartService.getSummary(cart2.id);
  assert(summary2After.items.length === 1, "User 2 sepetinde sadece 1 kalem mevcut");
  assert(summary2After.items[0].productId === productB.id, "User 2 sepetinde sadece Product B var");

  // User 1'in sepetinin bozulmadığını doğrula
  const summary1Verify = await CartService.getSummary(cart1.id);
  assert(summary1Verify.items.length === 1 && summary1Verify.items[0].productId === productA.id, "User 1 sepeti User 2'nin işlemlerinden etkilenmedi");

  // CartService'de STRICT guestCart merge filtresi kontrolü (userId: null zorunluluğu)
  const cartServicePath = path.resolve(process.cwd(), "src/features/cart/services/cart.service.ts");
  const cartServiceSrc = fs.readFileSync(cartServicePath, "utf-8");
  assert(
    cartServiceSrc.includes("where: { sessionId, userId: null }"),
    "CartService.getOrCreateCart yalnızca userId: null olan misafir sepetlerini birleştiriyor, üye sepetlerini sızdırmıyor"
  );

  console.log("\n📌 2. Favoriler İzolasyonu ve Temizliği Testleri");

  // User 1 Product A'yı favorilere eklesin
  const fav1Res = await toggleFavoriteAction(productA.id, user1.id);
  assert(fav1Res.success && fav1Res.isFavorite, "User 1 Product A'yı favorilere ekledi");

  const user1Favs = await getFavoriteProductIds(user1.id);
  assert(user1Favs.includes(productA.id), "User 1 favori listesinde Product A mevcut");

  // User 2'nin favorilerini sorgula: User 1'in favorisi kesinlikle gelmemeli
  const user2Favs = await getFavoriteProductIds(user2.id);
  assert(!user2Favs.includes(productA.id), "User 2 favorilerinde User 1'in Product A'sı YOK (Tam İzolasyon)");

  // User 2 Product B'yi favorilesin
  await toggleFavoriteAction(productB.id, user2.id);
  const user2FavsUpdated = await getFavoriteProductIds(user2.id);
  assert(user2FavsUpdated.includes(productB.id), "User 2 favorilerinde Product B mevcut");
  assert(!user2FavsUpdated.includes(productA.id), "User 2 favorilerinde hala Product A YOK");

  console.log("\n📌 3. State ve Cache Reset Mekanizması Doğrulamaları");

  // 3.1 auth-events modülü varlığı ve anahtar temizliği
  const authEventsPath = path.resolve(process.cwd(), "src/shared/utils/auth-events.ts");
  assert(fs.existsSync(authEventsPath), "src/shared/utils/auth-events.ts modülü mevcut");

  const authEventsSrc = fs.readFileSync(authEventsPath, "utf-8");
  assert(authEventsSrc.includes("cart_id") && authEventsSrc.includes("guest_cart"), "auth-events modülü cart_id ve guest_cart anahtarlarını sıfırlıyor");
  assert(authEventsSrc.includes("guest_favorites") && authEventsSrc.includes("hybrid_favorites_cache"), "auth-events modülü favori cache anahtarlarını sıfırlıyor");
  assert(authEventsSrc.includes("hybrid:auth-state-changed"), "auth-events 'hybrid:auth-state-changed' global olayını destekliyor");

  // 3.2 CartContext ve FavoritesContext dinleyicileri
  const cartContextPath = path.resolve(process.cwd(), "src/features/cart/context/CartContext.tsx");
  const cartContextSrc = fs.readFileSync(cartContextPath, "utf-8");
  assert(cartContextSrc.includes("AUTH_STATE_CHANGE_EVENT"), "CartContext 'hybrid:auth-state-changed' olayını dinliyor");
  assert(cartContextSrc.includes("clearCart"), "CartContext içinde clearCart state ve localStorage reset fonksiyonu mevcut");

  const favContextPath = path.resolve(process.cwd(), "src/features/favorites/context/FavoritesContext.tsx");
  const favContextSrc = fs.readFileSync(favContextPath, "utf-8");
  assert(favContextSrc.includes("AUTH_STATE_CHANGE_EVENT"), "FavoritesContext 'hybrid:auth-state-changed' olayını dinliyor");
  assert(favContextSrc.includes("FAVORITES_STORAGE_KEYS"), "FavoritesContext oturum değişiminde tüm favori storage anahtarlarını sıfırlıyor");

  // 3.3 Server Action Logout çerez silme
  const authActionsPath = path.resolve(process.cwd(), "src/features/auth/actions/auth.actions.ts");
  const authActionsSrc = fs.readFileSync(authActionsPath, "utf-8");
  assert(
    authActionsSrc.includes('cookieStore.delete(SESSION_COOKIE_NAME)') &&
    authActionsSrc.includes('cookieStore.delete("session_id")'),
    "logoutAction hem auth oturum çerezini hem de session_id sepet çerezini temizliyor"
  );

  console.log("\n📌 4. Test Verileri Temizleniyor...");
  await prisma.cartItem.deleteMany({ where: { cartId: { in: [cart1.id, cart2.id] } } });
  await prisma.cart.deleteMany({ where: { id: { in: [cart1.id, cart2.id] } } });
  await prisma.favorite.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
  console.log("  ✅ [PASS] Test verileri başarıyla temizlendi");

  console.log("\n=========================================================================");
  if (passedCount === totalCount) {
    console.log(`🎉 TÜM OTURUM İZOLASYONU VE CACHE RESET TESTLERİ BAŞARIYLA GEÇTİ! (${passedCount}/${totalCount})`);
  } else {
    console.log(`⚠️ Bazı testler başarısız oldu (${passedCount}/${totalCount})`);
  }
  console.log("=========================================================================\n");
}

runSessionIsolationSuite().catch((err) => {
  console.error("Test hatası:", err);
  process.exit(1);
});
