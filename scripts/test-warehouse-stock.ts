import prisma from "../src/lib/prisma";
import { WarehouseService } from "../src/features/warehouse/services/warehouse.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";

async function runWarehouseTests() {
  console.log("=========================================================================");
  console.log("🏢 ADIM 5: ÇOKLU DEPO VE ŞUBE YÖNETİMİ (WAREHOUSE & STOCK) DOĞRULAMA TESTİ");
  console.log("=========================================================================\n");

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
    const timestamp = Date.now().toString().slice(-4);

    // 1. Varsayılan Ana Depo Kontrolü
    console.log("📌 1. Varsayılan Ana Depo (Merkez) Kontrolü");
    const defaultWh = await WarehouseService.getOrCreateDefaultWarehouse();
    assert(Boolean(defaultWh.id), `Varsayılan ana depo mevcut (ID: ${defaultWh.id}, Kod: ${defaultWh.code})`);
    assert(defaultWh.isDefault === true, "Varsayılan depo isDefault: true özelliğine sahip");

    // 2. İkinci Şube Deposu Oluşturma
    console.log("\n📌 2. Yeni Şube Deposu Oluşturma");
    const ankaraWh = await WarehouseService.createWarehouse({
      name: `Ankara Şube Deposu ${timestamp}`,
      code: `WH-ANK-${timestamp}`,
      address: "Çankaya Lojistik Merkezi, Ankara",
    });
    assert(Boolean(ankaraWh.id), `Yeni şube deposu oluşturuldu (Kod: ${ankaraWh.code})`);

    // 3. Çoklu Depo Stok Dağıtımı
    console.log("\n📌 3. Ürün İçin Depo Bazlı Stok Tanımlama");
    const testProduct = await prisma.product.create({
      data: {
        name: `Çoklu Depo Test Ürünü ${timestamp}`,
        slug: `multi-wh-prod-${timestamp}`,
        type: "SALE",
        salePrice: 500,
        active: true,
      },
    });

    // Merkez depoya 10 adet, Ankara şubesine 5 adet stok ata
    await WarehouseService.setProductWarehouseStock(testProduct.id, defaultWh.id, 10);
    await WarehouseService.setProductWarehouseStock(testProduct.id, ankaraWh.id, 5);

    const stockSummary = await WarehouseService.getProductTotalStock(testProduct.id);
    assert(stockSummary.total === 15, `Tüm depolardaki toplam stok doğru hesaplandı (10 + 5 = ${stockSummary.total})`);

    const dbInventory = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    assert(dbInventory?.totalStock === 15, "Ana Inventory tablosu çoklu depo toplamıyla senkronize edildi (15 Adet)");

    // 4. Depodan Stok Düşümü ve Stok Yetersiz Denetimi
    console.log("\n📌 4. Stok Düşümü ve Yetersiz Stok Koruması");
    // Merkez depodan 4 adet düş
    const afterDeduct = await WarehouseService.deductWarehouseStock(testProduct.id, 4, defaultWh.id);
    assert(afterDeduct.quantity === 6, `Merkez depodan 4 adet düşüldü, kalan: ${afterDeduct.quantity} (Beklenen: 6)`);

    // Kalan 6 iken 10 adet düşmeye çalış -> Hata fırlatmalı
    let failedAsExpected = false;
    try {
      await WarehouseService.deductWarehouseStock(testProduct.id, 10, defaultWh.id);
    } catch (err: any) {
      if (err.message.includes("Stok Yetersiz")) {
        failedAsExpected = true;
      }
    }
    assert(failedAsExpected, "Depoda yeterli stok olmadığında 'Stok Yetersiz' hatası fırlatıldı ve işlem engellendi");

    // 5. Checkout Entegrasyonu ile Sipariş Anında Depo Stok Kontrolü
    console.log("\n📌 5. Checkout Sipariş Akışında Depo Stok Kontrolü");
    const testUser = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
    assert(testUser !== null, "Test müşterisi bulundu");

    const cart = await CartService.getOrCreateCart(testUser!.id);
    await CartService.clear(cart.id);

    // Kalan 6 iken 2 adet sepete ekle -> Checkout başarılı olmalı
    await CartService.addItem(cart.id, {
      productId: testProduct.id,
      quantity: 2,
      type: "SALE",
    });

    const checkoutSuccess = await CheckoutService.process({
      userId: testUser!.id,
      cartId: cart.id,
    });
    assert(checkoutSuccess.success, "Yeterli stok ile verilen sipariş başarıyla tamamlandı");

    const currentWhStock = await prisma.stock.findUnique({
      where: { productId_warehouseId: { productId: testProduct.id, warehouseId: defaultWh.id } },
    });
    assert(currentWhStock?.quantity === 4, `Sipariş sonrası merkez depo stoku 4 adede düştü (Mevcut: ${currentWhStock?.quantity})`);

    // Şimdi sepete 10 adet ekleyip sipariş vermeyi dene (Stokta sadece 4 kaldı)
    await CartService.addItem(cart.id, {
      productId: testProduct.id,
      quantity: 10,
      type: "SALE",
    });

    const checkoutFail = await CheckoutService.process({
      userId: testUser!.id,
      cartId: cart.id,
    });
    assert(!checkoutFail.success, "Depo stokunu aşan sipariş checkout aşamasında engellendi");
    assert(Boolean(checkoutFail.error?.includes("Stok Yetersiz")), "Checkout hata mesajında 'Stok Yetersiz' ibaresi yer aldı");

    console.log("\n=========================================================================");
    console.log(`🎉 ADIM 5: ÇOKLU DEPO VE ŞUBE YÖNETİMİ TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("=========================================================================\n");
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runWarehouseTests();
