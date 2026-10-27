import prisma from "../src/lib/prisma";
import { AvailabilityService } from "../src/features/rental/services/availability.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Yardımcı gün ekleme
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0); // Saat dilimi etkisini bertaraf etmek için öğlen 12
  return d;
}

async function runRentalConflictTests() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🧪 ADIM 7: Gelişmiş Kiralama Çakışma Motoru (Rental Conflict Engine)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const testEmail = `rental-test-${Date.now()}@test.com`;

  try {
    // 1. Hazırlık: Test Kullanıcısı ve Kiralık Ürün Oluştur
    console.log("🔹 1. Test Kullanıcısı ve Kiralık Ürün Hazırlığı...");
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Kiralama Test Müşterisi",
        password: "hashed_test_password",
        role: "CUSTOMER",
      },
    });
    assert(!!testUser.id, `Test kullanıcısı oluşturuldu: ${testUser.email}`);

    const product = await prisma.product.create({
      data: {
        name: `Sony A7 IV Kamera ${Date.now()}`,
        slug: `sony-a7-iv-${Date.now()}`,
        description: "Profesyonel Kiralık Fotoğraf Makinesi",
        type: "RENTAL",
        images: ["/test-camera.png"],
        rentalPricing: {
          create: {
            dailyPrice: 250,
            weeklyPrice: 1500,
            monthlyPrice: 5000,
            depositAmount: 1000,
            minDays: 1,
            maxDays: 30,
          },
        },
      },
      include: { rentalPricing: true },
    });
    assert(!!product.id, `Kiralık ürün oluşturuldu: ${product.name}`);

    // Referans tarihler (Bugünden 10 gün sonrası başlangıç)
    const now = new Date();
    const d10 = addDays(now, 10);
    const d15 = addDays(now, 15);
    const d8 = addDays(now, 8);
    const d12 = addDays(now, 12);
    const d14 = addDays(now, 14);
    const d18 = addDays(now, 18);
    const d20 = addDays(now, 20);
    const d25 = addDays(now, 25);

    // 2. İlk Rezervasyon: Gün 10 - Gün 15 (CONFIRMED)
    console.log("\n🔹 2. Temel Rezervasyon Oluşturma (Gün 10 - Gün 15)...");
    const res1 = await AvailabilityService.createReservation({
      productId: product.id,
      startDate: d10,
      endDate: d15,
      userId: testUser.id,
      status: "CONFIRMED",
    });
    assert(!!res1.id, "İlk rezervasyon başarıyla kaydedildi");
    assert(res1.status === "CONFIRMED", "Rezervasyon statüsü CONFIRMED");

    // 3. Çakışma Senaryoları Testi (Tüm Overlap Durumları)
    console.log("\n🔹 3. Çakışma Algoritması Doğrulamaları (Overlap Algoritması)...");

    // Senaryo A: Tamamen İçinde Kalan Tarih (Gün 11 - Gün 13)
    const checkA = await AvailabilityService.check({
      productId: product.id,
      startDate: addDays(now, 11).toISOString(),
      endDate: addDays(now, 13).toISOString(),
    });
    assert(checkA.available === false, "Senaryo A (Tamamen içinde aralık 11-13) ÇAKIŞMA TESPİT EDİLDİ");

    // Senaryo B: Başlangıçtan Kesişen Tarih (Gün 8 - Gün 12)
    const checkB = await AvailabilityService.check({
      productId: product.id,
      startDate: d8.toISOString(),
      endDate: d12.toISOString(),
    });
    assert(checkB.available === false, "Senaryo B (Başlangıç kesişen 8-12) ÇAKIŞMA TESPİT EDİLDİ");

    // Senaryo C: Bitişten Kesişen Tarih (Gün 13 - Gün 18)
    const checkC = await AvailabilityService.check({
      productId: product.id,
      startDate: addDays(now, 13).toISOString(),
      endDate: d18.toISOString(),
    });
    assert(checkC.available === false, "Senaryo C (Bitiş kesişen 13-18) ÇAKIŞMA TESPİT EDİLDİ");

    // Senaryo D: Birebir Aynı Aralık (Gün 10 - Gün 15)
    const checkD = await AvailabilityService.check({
      productId: product.id,
      startDate: d10.toISOString(),
      endDate: d15.toISOString(),
    });
    assert(checkD.available === false, "Senaryo D (Birebir aynı aralık 10-15) ÇAKIŞMA TESPİT EDİLDİ");

    // Senaryo E: Kapsayan Tarih Aralığı (Gün 8 - Gün 18)
    const checkE = await AvailabilityService.check({
      productId: product.id,
      startDate: d8.toISOString(),
      endDate: d18.toISOString(),
    });
    assert(checkE.available === false, "Senaryo E (Kapsayan dış aralık 8-18) ÇAKIŞMA TESPİT EDİLDİ");

    // Doğrudan rezervasyon oluşturmaya çalışıldığında hata fırlatma testi
    let threwConflict = false;
    try {
      await AvailabilityService.createReservation({
        productId: product.id,
        startDate: d12,
        endDate: d14,
        userId: testUser.id,
      });
    } catch (e: unknown) {
      threwConflict = true;
      assert(
        e instanceof Error && e.message.includes("Kiralama Çakışması"),
        `Rezervasyon oluşturma engellendi: "${(e as Error).message}"`
      );
    }
    assert(threwConflict, "Çakışan tarihte createReservation hata fırlattı");

    // 4. Çakışmayan Geçerli Tarihler
    console.log("\n🔹 4. Çakışmayan Farklı Tarih Aralıkları Testi...");

    // Bitişik sonraki tarih (Gün 15 - Gün 20) -> İzin verilmeli
    const checkValid1 = await AvailabilityService.check({
      productId: product.id,
      startDate: d15.toISOString(),
      endDate: d20.toISOString(),
    });
    assert(checkValid1.available === true, "Bitişik sonraki aralık (15-20) MÜSAİT");

    // Tamamen ayrı ileri tarih (Gün 20 - Gün 25) -> İzin verilmeli
    const checkValid2 = await AvailabilityService.check({
      productId: product.id,
      startDate: d20.toISOString(),
      endDate: d25.toISOString(),
    });
    assert(checkValid2.available === true, "Ayrı ileri tarih (20-25) MÜSAİT");

    // İkinci geçerli rezervasyonu oluştur
    const res2 = await AvailabilityService.createReservation({
      productId: product.id,
      startDate: d20,
      endDate: d25,
      userId: testUser.id,
      status: "CONFIRMED",
    });
    assert(!!res2.id, "Çakışmayan aralıkta ikinci rezervasyon başarıyla kaydedildi");

    // 5. Sepete Ekleme Aşamasında Çakışma Engeli (CartService.addItem)
    console.log("\n🔹 5. Sepete Ekleme Aşamasında Çakışma Engeli Testi...");
    const cart = await CartService.getOrCreateCart(testUser.id);

    // Çakışan tarihli kiralama eklemeye çalış (Gün 12 - Gün 14)
    let cartConflictBlocked = false;
    try {
      await CartService.addItem(cart.id, {
        productId: product.id,
        type: "RENTAL",
        rentalStart: d12.toISOString(),
        rentalEnd: d14.toISOString(),
      });
    } catch (err: unknown) {
      cartConflictBlocked = true;
      assert(
        err instanceof Error && err.message.includes("Kiralama Çakışması"),
        `Sepete ekleme engellendi: "${(err as Error).message}"`
      );
    }
    assert(cartConflictBlocked, "Çakışan kiralama kalemi sepete eklenemedi");

    // Çakışmayan tarihli kiralama ekle (Gün 26 - Gün 28)
    const d26 = addDays(now, 26);
    const d28 = addDays(now, 28);
    const validCartItem = await CartService.addItem(cart.id, {
      productId: product.id,
      type: "RENTAL",
      rentalStart: d26.toISOString(),
      rentalEnd: d28.toISOString(),
    });
    assert(!!validCartItem.id, "Çakışmayan tarihli kiralama başarıyla sepete eklendi");

    // 6. Checkout ve Sipariş Tamamlama ile Kalıcı CONFIRMED Rezervasyon
    console.log("\n🔹 6. Sipariş Tamamlama ve Rezervasyonun CONFIRMED Kaydı...");
    const checkoutResult = await CheckoutService.process({
      userId: testUser.id,
      cartId: cart.id,
    });
    assert(checkoutResult.success === true, "Sipariş ve kiralama checkout başarıyla tamamlandı");

    // Veritabanında sipariş ile oluşan RentalReservation kaydını doğrula
    const confirmedRes = await prisma.rentalReservation.findFirst({
      where: {
        productId: product.id,
        startDate: d26,
        endDate: d28,
        status: "CONFIRMED",
      },
    });
    assert(!!confirmedRes, "Sipariş tamamlandığında RentalReservation kalıcı olarak CONFIRMED oluşturuldu");

    // Artık bu tarih aralığı da çakışma vermeli
    const checkAfterCheckout = await AvailabilityService.check({
      productId: product.id,
      startDate: d26.toISOString(),
      endDate: d28.toISOString(),
    });
    assert(checkAfterCheckout.available === false, "Yeni sipariş edilen tarihler (26-28) artık kilitli");

    // 7. Rezervasyon İptali ve Tarihlerin Yeniden Serbest Kalması Testi
    console.log("\n🔹 7. İptal ve Serbest Bırakma (Cancel & Unblock) Testi...");
    await AvailabilityService.cancelReservation(res1.id);
    const checkAfterCancel = await AvailabilityService.check({
      productId: product.id,
      startDate: d10.toISOString(),
      endDate: d15.toISOString(),
    });
    assert(checkAfterCancel.available === true, "İptal edilen rezervasyonun tarihleri (10-15) tekrar müsait oldu");

    // 8. Temizlik
    console.log("\n🔹 8. Test Verileri Temizleniyor...");
    await prisma.rentalReservation.deleteMany({ where: { productId: product.id } });
    await prisma.rentalAvailability.deleteMany({ where: { productId: product.id } });
    await prisma.orderItem.deleteMany({ where: { productId: product.id } });
    await prisma.payment.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
    await prisma.rental.deleteMany({ where: { productId: product.id } });
    await prisma.cartItem.deleteMany({ where: { productId: product.id } });
    await prisma.cart.deleteMany({ where: { userId: testUser.id } });
    await prisma.rentalPricing.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log(`🎉 ADIM 7 TESTLERİ TAMAMLANDI: ${passedTests}/${totalTests} Test Başarıyla Geçti!`);
    console.log("═══════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ Kiralama Çakışma Motoru Testi Sırasında Hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRentalConflictTests();
