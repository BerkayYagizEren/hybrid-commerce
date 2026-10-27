import prisma from "../src/lib/prisma";
import { B2BService } from "../src/features/b2b/services/b2b.service";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { WarehouseService } from "../src/features/warehouse/services/warehouse.service";

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

async function runB2BTests() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🧪 ADIM 6: B2B Bayi Finansal Altyapısı (DealerFinancial) Testleri");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const testEmail = `b2b-dealer-${Date.now()}@test.com`;

  try {
    // 0. Hazırlık: Test Bayi Kullanıcısı ve Ürünü Oluştur
    console.log("🔹 1. Test Bayisi ve Ürün Hazırlığı...");
    const dealerUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test B2B Bayi A.Ş.",
        password: "hashed_test_password",
        role: "VENDOR",
      },
    });
    assert(!!dealerUser.id, `Test bayisi oluşturuldu: ${dealerUser.email}`);

    // B2B Finans Kaydı Oluştur: Limit 10,000 TL, Başlangıç Bakiyesi 2,000 TL, İskonto %20
    const financial = await B2BService.upsertDealerFinancial(dealerUser.id, {
      creditLimit: 10000,
      currentBalance: 2000,
      discountRate: 20,
    });
    assert(financial.creditLimit === 10000, "Kredi limiti 10.000 TL olarak ayarlandı");
    assert(financial.currentBalance === 2000, "Mevcut borç bakiyesi 2.000 TL olarak ayarlandı");
    assert(financial.discountRate === 20, "Bayi iskonto oranı %20 olarak ayarlandı");

    // 1. Bilgi Sorgulama ve Kalan Kredi Hesabı
    console.log("\n🔹 2. Bayi Finansal Bilgi Sorgulama ve Kalan Limit Doğrulaması...");
    const dealerInfo = await B2BService.getDealerFinancial(dealerUser.id);
    assert(dealerInfo !== null, "Bayi finansal kaydı getirildi");
    assert(dealerInfo?.availableCredit === 8000, `Kalan kredi doğru hesaplandı (10.000 - 2.000 = 8.000 TL): ${dealerInfo?.availableCredit}`);

    // 2. İskonto Hesaplama Motoru Testi
    console.log("\n🔹 3. Otomatik B2B İskonto Hesaplama Testi...");
    const discountCalc = await B2BService.calculateB2BDiscount(dealerUser.id, 1000);
    assert(discountCalc.hasDiscount === true, "İskonto aktif");
    assert(discountCalc.discountRate === 20, "İskonto oranı %20");
    assert(discountCalc.discountAmount === 200, "1.000 TL için iskonto tutarı 200 TL");
    assert(discountCalc.discountedPrice === 800, "İskontolu nihai fiyat 800 TL");

    // 3. Limit Kontrol Motoru (CheckCreditLimit)
    console.log("\n🔹 4. Kredi Limiti Kontrol Motoru Testleri...");
    const checkWithin = await B2BService.checkCreditLimit(dealerUser.id, 5000);
    assert(checkWithin.allowed === true, "8.000 TL kalan limit varken 5.000 TL sipariş ONAYLANDI");

    const checkExceeded = await B2BService.checkCreditLimit(dealerUser.id, 9000);
    assert(checkExceeded.allowed === false, "8.000 TL kalan limit varken 9.000 TL sipariş ENGELLENDİ");
    assert(
      typeof checkExceeded.error === "string" && checkExceeded.error.includes("Kredi Limiti Yetersiz"),
      `Hata mesajı doğru: "${checkExceeded.error}"`
    );

    // 4. Test Ürünü ve Depo Stoğu Hazırlığı
    console.log("\n🔹 5. Sipariş ve Sepet Akışı Test Hazırlığı...");
    const defaultWh = await WarehouseService.getOrCreateDefaultWarehouse();
    const product = await prisma.product.create({
      data: {
        name: `B2B Test Ürünü ${Date.now()}`,
        slug: `b2b-test-product-${Date.now()}`,
        description: "B2B Test Ürünü Açıklama",
        salePrice: 1000,
        type: "SALE",
        images: ["/test-b2b.png"],
        inventory: {
          create: {
            totalStock: 100,
            reservedStock: 0,
          },
        },
      },
    });

    // Depo stoğu ekle
    await prisma.stock.create({
      data: {
        productId: product.id,
        warehouseId: defaultWh.id,
        quantity: 50,
      },
    });

    // Sepet oluştur ve 2 adet ürün ekle (2 x 1000 = 2000 TL liste fiyatı)
    const cart = await CartService.getOrCreateCart(dealerUser.id);
    await CartService.addItem(cart.id, {
      productId: product.id,
      type: "SALE",
      quantity: 2,
    });

    // 5. Limit Dahilinde Sipariş Tamamlama (%20 iskonto ile 2.000 TL -> 1.600 TL)
    console.log("\n🔹 6. Limit Dahilinde Sipariş ve B2B Cari Hesaba Borçlandırma...");
    const checkoutSuccess = await CheckoutService.process({
      userId: dealerUser.id,
      cartId: cart.id,
      paymentMethod: "B2B_CREDIT",
    });

    assert(checkoutSuccess.success === true, "Sipariş başarıyla tamamlandı");
    assert(
      checkoutSuccess.totalAmount === 1600,
      `%20 B2B iskontosu fiyata doğru yansıdı (2000 -> 1600 TL): ${checkoutSuccess.totalAmount} TL`
    );

    // Bakiye kontrolü: 2000 + 1600 = 3600 TL olmalı
    const dealerAfterOrder = await B2BService.getDealerFinancial(dealerUser.id);
    assert(
      dealerAfterOrder?.currentBalance === 3600,
      `Sipariş sonrası borç bakiyesi 3.600 TL'ye güncellendi: ${dealerAfterOrder?.currentBalance} TL`
    );
    assert(
      dealerAfterOrder?.availableCredit === 6400,
      `Kalan kredi limiti 6.400 TL olarak güncellendi: ${dealerAfterOrder?.availableCredit} TL`
    );

    // 6. Limit Aşımında Siparişin Engellenmesi Testi
    console.log("\n🔹 7. Kredi Limiti Aşıldığında Siparişin Engellenmesi...");
    // Sepete 10 adet ürün ekle: Liste fiyatı 10.000 TL, %20 iskonto ile 8.000 TL.
    // Mevcut bakiye 3.600 + 8.000 = 11.600 TL > 10.000 TL limit!
    const cart2 = await CartService.getOrCreateCart(dealerUser.id);
    await CartService.addItem(cart2.id, {
      productId: product.id,
      type: "SALE",
      quantity: 10,
    });

    const checkoutFailed = await CheckoutService.process({
      userId: dealerUser.id,
      cartId: cart2.id,
      paymentMethod: "B2B_CREDIT",
    });

    assert(checkoutFailed.success === false, "Limit aşımında sipariş engellendi");
    assert(
      typeof checkoutFailed.error === "string" && checkoutFailed.error.includes("Kredi Limiti Yetersiz"),
      `Limit aşımı hata mesajı döndürüldü: "${checkoutFailed.error}"`
    );

    // Borç bakiyesinin değişmediğini doğrula (3.600 TL kalmalı)
    const dealerAfterFailed = await B2BService.getDealerFinancial(dealerUser.id);
    assert(
      dealerAfterFailed?.currentBalance === 3600,
      `Başarısız siparişte bakiye değişmedi (3.600 TL korundu): ${dealerAfterFailed?.currentBalance} TL`
    );

    // 7. Admin Bakiye İşlemleri Testi (Bakiye Tahsilatı / İade)
    console.log("\n🔹 8. Admin Bakiye Düzenleme ve İade Testi...");
    await B2BService.refundCredit(dealerUser.id, 1600);
    const dealerAfterRefund = await B2BService.getDealerFinancial(dealerUser.id);
    assert(
      dealerAfterRefund?.currentBalance === 2000,
      `1.600 TL tahsilat/düşüm sonrası borç bakiyesi 2.000 TL'ye indi: ${dealerAfterRefund?.currentBalance} TL`
    );

    // Temizlik
    console.log("\n🔹 9. Test Verileri Temizleniyor...");
    await prisma.stock.deleteMany({ where: { productId: product.id } });
    await prisma.orderItem.deleteMany({ where: { productId: product.id } });
    await prisma.payment.deleteMany({ where: { order: { userId: dealerUser.id } } });
    await prisma.order.deleteMany({ where: { userId: dealerUser.id } });
    await prisma.cartItem.deleteMany({ where: { productId: product.id } });
    await prisma.cart.deleteMany({ where: { userId: dealerUser.id } });
    await prisma.inventory.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.dealerFinancial.delete({ where: { userId: dealerUser.id } });
    await prisma.user.delete({ where: { id: dealerUser.id } });

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log(`🎉 ADIM 6 TESTLERİ TAMAMLANDI: ${passedTests}/${totalTests} Test Başarıyla Geçti!`);
    console.log("═══════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ B2B Testi Sırasında Hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runB2BTests();
