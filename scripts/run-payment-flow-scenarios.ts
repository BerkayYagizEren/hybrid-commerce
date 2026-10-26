import prisma from "../src/lib/prisma";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { approveRentalReturn, requestRentalReturn } from "../src/features/rental/actions/rental.actions";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";
import { addDays } from "date-fns";

interface ScenarioStep {
  scenario: string;
  step: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const scenarioLog: ScenarioStep[] = [];

function assert(scenario: string, step: string, condition: boolean, expected: string, actual: string) {
  scenarioLog.push({ scenario, step, passed: condition, expected, actual });
  if (condition) {
    console.log(`  ✅ [PASS] ${step}`);
    console.log(`     └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
  } else {
    console.error(`  ❌ [FAIL] ${step}`);
    console.error(`     └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
  }
}

async function runPaymentFlowScenarios() {
  console.log("===========================================================================");
  console.log("🧪 HİBRİT E-TİCARET: ÖDEME, DEPOZİTO (ESCROW) VE İADE SENARYOLARI TESTİ");
  console.log("===========================================================================\n");

  const BASE_URL = "http://localhost:3000";

  // ─────────────────────────────────────────────────────────────
  // 0. HAZIRLIK ADIMI
  // ─────────────────────────────────────────────────────────────
  console.log("--- 0. TEST KULLANICI VE ENVANTER HAZIRLIĞI ---");

  const customer = await prisma.user.upsert({
    where: { email: "senaryo.musteri@hybridcommerce.dev" },
    update: { role: "CUSTOMER" },
    create: {
      email: "senaryo.musteri@hybridcommerce.dev",
      name: "Elif Demir (Senaryo Müşteri)",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
      roles: ["CUSTOMER"],
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "senaryo.satici@hybridcommerce.dev" },
    update: { role: "VENDOR" },
    create: {
      email: "senaryo.satici@hybridcommerce.dev",
      name: "FotoStudio Mağazası (Senaryo Satıcı)",
      password: "hashed_dummy_password",
      role: "VENDOR",
      roles: ["VENDOR"],
    },
  });

  const saleProduct = await prisma.product.upsert({
    where: { slug: "senaryo-satis-apple-macbook" },
    update: { salePrice: 42000, active: true },
    create: {
      name: "Apple MacBook Pro M4 (Test Satın Alma)",
      slug: "senaryo-satis-apple-macbook",
      description: "M4 Pro çip, 16 inç Liquid Retina XDR ekran",
      images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
      type: "SALE",
      salePrice: 42000,
      vendorId: vendor.id,
      inventory: {
        create: {
          totalStock: 25,
          reservedStock: 0,
        },
      },
    },
  });

  const rentalProduct = await prisma.product.upsert({
    where: { slug: "senaryo-kiralik-dji-ronin" },
    update: { active: true },
    create: {
      name: "DJI Ronin 4D 6K Gimbal Kamera (Test Kiralık)",
      slug: "senaryo-kiralik-dji-ronin",
      description: "4 eksenli sinematik gimbal kamera stabilizasyon sistemi",
      images: ["https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800"],
      type: "RENTAL",
      vendorId: vendor.id,
      rentalPricing: {
        create: {
          dailyPrice: 1200,
          depositAmount: 18000,
        },
      },
    },
  });

  const customerToken = await createSessionToken({
    id: customer.id,
    email: customer.email,
    role: "CUSTOMER",
    roles: ["CUSTOMER"],
  });

  console.log(`👤 Müşteri: ${customer.name} (${customer.email})`);
  console.log(`🏪 Satıcı: ${vendor.name} (${vendor.email})`);
  console.log(`💻 Satış Ürünü: ${saleProduct.name} - ₺${Number(saleProduct.salePrice)}`);
  console.log(`🎥 Kiralık Ürün: ${rentalProduct.name} - Günlük: ₺1200, Depozito: ₺18000\n`);

  // =========================================================================
  // SENARYO 1: BAŞARILI SATIN ALMA TESTİ (DIRECT PAYMENT)
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 1: Başarılı Satın Alma Testi (Direct Payment)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1.1 Sepete satın alınabilir ürünü ekle
  const cart1 = await CartService.getOrCreateCart(customer.id);
  await CartService.clear(cart1.id);
  await CartService.addItem(cart1.id, {
    productId: saleProduct.id,
    type: "SALE",
    quantity: 1,
  });

  // 1.2 /checkout sayfasına git ve HTTP 200 doğrula
  const checkoutPageRes = await fetch(`${BASE_URL}/checkout`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
  });
  const checkoutHtml = await checkoutPageRes.text();

  assert(
    "Senaryo 1",
    "1.1 /checkout sayfası müşteri oturumu ile 200 OK açılmalı",
    checkoutPageRes.status === 200,
    "HTTP 200 OK",
    `HTTP ${checkoutPageRes.status}`
  );

  assert(
    "Senaryo 1",
    "1.2 Ödeme formunda kart formu ve teslimat bilgileri yer almalı",
    checkoutHtml.includes("Kart ile Güvenli Ödeme") && checkoutHtml.includes("Teslimat Adresi"),
    "Kart formu ve teslimat alanları mevcut",
    "Form başarıyla render edildi"
  );

  // 1.3 Başarılı senaryo kartı (4242 ...) ile siparişi tamamla
  const directPaymentResult = await CheckoutService.process({
    userId: customer.id,
    cartId: cart1.id,
    paymentCard: {
      cardHolder: "ELİF DEMİR",
      cardNumber: "4242 4242 4242 4242",
      expireMonth: "12",
      expireYear: "2028",
      cvc: "123",
    },
    shippingAddress: {
      fullName: "Elif Demir",
      addressLine1: "Levent Mah. Cömert Sok. No: 1",
      city: "İstanbul",
      postalCode: "34330",
      phone: "+90 532 111 2233",
      email: customer.email,
    },
  });

  assert(
    "Senaryo 1",
    "1.3 Ödeme başarılı şekilde alınmalı ve orderId dönmeli",
    directPaymentResult.success && Boolean(directPaymentResult.orderId),
    "success: true, orderId üretildi",
    `success: ${directPaymentResult.success}, orderId: ${directPaymentResult.orderId}`
  );

  // 1.4 Veritabanında sipariş durumu PAID olmalı
  const paidOrder = await prisma.order.findUnique({
    where: { id: directPaymentResult.orderId },
    include: { items: true, payments: true },
  });

  assert(
    "Senaryo 1",
    "1.4 Veritabanında sipariş durumu 'PAID' olmalı",
    paidOrder?.status === "PAID",
    "status: PAID",
    `status: ${paidOrder?.status}`
  );

  // 1.5 Snapshot (fiyat/görsel/ad) kilitlenmesi
  const saleOrderItem = paidOrder?.items.find((i) => i.productId === saleProduct.id);
  assert(
    "Senaryo 1",
    "1.5 OrderItem snapshot verileri (productName, productImage, priceAtPurchase) doğru kilitlenmeli",
    Boolean(
      saleOrderItem?.productName === saleProduct.name &&
        saleOrderItem?.productImage === saleProduct.images[0] &&
        Number(saleOrderItem?.priceAtPurchase) === Number(saleProduct.salePrice)
    ),
    `Ad: "${saleProduct.name}", Fiyat: ₺${Number(saleProduct.salePrice)}`,
    `Ad: "${saleOrderItem?.productName}", Fiyat: ₺${Number(saleOrderItem?.priceAtPurchase)}`
  );

  // =========================================================================
  // SENARYO 2: KİRALAMA VE DEPOZİTO BLOKAJI TESTİ (HOLD / PRE-AUTH)
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 2: Kiralama ve Depozito Blokajı Testi (Hold / Pre-auth)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 2.1 Sepete kiralık ürün ekle (3 gün kiralama: 3 * 1200 = 3600 TL kira + 18000 TL depozito)
  const cart2 = await CartService.getOrCreateCart(customer.id);
  await CartService.clear(cart2.id);

  const rentStart = addDays(new Date(), 20);
  const rentEnd = addDays(new Date(), 23);
  await CartService.addItem(cart2.id, {
    productId: rentalProduct.id,
    type: "RENTAL",
    rentalStart: rentStart.toISOString(),
    rentalEnd: rentEnd.toISOString(),
  });

  const cart2Summary = await CartService.getSummary(cart2.id);

  assert(
    "Senaryo 2",
    "2.1 Sepette kiralama bedeli ve ₺18.000 depozito tutarı net ayrılmalı",
    cart2Summary.rentalSubtotal === 3600 && cart2Summary.totalDeposit === 18000,
    "Kiralama Bedeli: ₺3600, Depozito: ₺18000, Toplam: ₺21600",
    `Kira: ₺${cart2Summary.rentalSubtotal}, Depozito: ₺${cart2Summary.totalDeposit}`
  );

  // 2.2 Kiralama siparişini öde (Direct Charge for 3600 TL + Escrow Hold for 18000 TL)
  const rentalPaymentResult = await CheckoutService.process({
    userId: customer.id,
    cartId: cart2.id,
    paymentCard: {
      cardHolder: "ELİF DEMİR",
      cardNumber: "4242 4242 4242 4242",
      expireMonth: "12",
      expireYear: "2028",
      cvc: "123",
    },
  });

  assert(
    "Senaryo 2",
    "2.2 Kiralama checkout işlemi başarılı olmalı",
    rentalPaymentResult.success && Boolean(rentalPaymentResult.orderId),
    "success: true",
    `success: ${rentalPaymentResult.success}, orderId: ${rentalPaymentResult.orderId}`
  );

  // 2.3 Depozito durumunun HELD olarak kaydedildiğini doğrula
  const rentalOrder = await prisma.order.findUnique({
    where: { id: rentalPaymentResult.orderId },
    include: {
      items: { include: { rental: { include: { escrow: true } } } },
      payments: { include: { escrows: true } },
    },
  });

  const escrowRecord = rentalOrder?.payments[0]?.escrows[0];
  const rentalRecord = rentalOrder?.items[0]?.rental;

  assert(
    "Senaryo 2",
    "2.3 Depozito tutarı için provizyon/blokaj (Escrow Hold) ID üretilmeli",
    Boolean(escrowRecord?.holdId && escrowRecord.holdId.startsWith("hold_")),
    "holdId tanımlı (hold_escrow_...)",
    `holdId: ${escrowRecord?.holdId}`
  );

  assert(
    "Senaryo 2",
    "2.4 Sipariş detayında depozito durumu 'HELD' olarak kaydedilmeli",
    escrowRecord?.status === "HELD" && Number(escrowRecord?.depositAmount) === 18000,
    "status: HELD, depositAmount: 18000",
    `status: ${escrowRecord?.status}, Tutar: ₺${Number(escrowRecord?.depositAmount)}`
  );

  // =========================================================================
  // SENARYO 3: İADE ONAYI VE DEPOZİTO ÇÖZME (REFUND / RELEASE) TESTİ
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 3: İade Onayı ve Depozito Çözme (Refund / Release) Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const rentalId = rentalRecord!.id;

  // 3.1 Müşteri iade sürecini başlatır
  const returnReq = await requestRentalReturn(rentalId);
  assert(
    "Senaryo 3",
    "3.1 Müşteri iade talebi başlatmalı (status: RETURN_REQUESTED)",
    returnReq.success && returnReq.status === "RETURN_REQUESTED",
    "status: RETURN_REQUESTED",
    `status: ${returnReq.status}`
  );

  // 3.2 Satıcı / Admin paneli iadeyi onaylar (approveRentalReturn)
  const returnApproval = await approveRentalReturn(rentalId);

  assert(
    "Senaryo 3",
    "3.2 approveRentalReturn başarılı çalışmalı ve releaseTxId dönmeli",
    returnApproval.success && Boolean(returnApproval.releaseTxId),
    "success: true ve releaseTxId tanımlı",
    `success: ${returnApproval.success}, Dekont: ${returnApproval.releaseTxId}`
  );

  // 3.3 Veritabanında ürün/kiralama durumu RETURNED olmalı
  const updatedRental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { escrow: true },
  });

  assert(
    "Senaryo 3",
    "3.3 Veritabanındaki kiralama durumu 'RETURNED' olmalı",
    updatedRental?.status === "RETURNED",
    "status: RETURNED",
    `status: ${updatedRental?.status}`
  );

  // 3.4 Arka planda depozito blokajının serbest bırakıldığını (Escrow: RELEASED) doğrula
  assert(
    "Senaryo 3",
    "3.4 Escrow blokajı 'RELEASED' durumuna getirilmeli ve releaseTxId kaydedilmeli",
    updatedRental?.escrow?.status === "RELEASED" && Boolean(updatedRental?.escrow?.releaseTxId),
    "status: RELEASED ve releaseTxId dolu",
    `Escrow status: ${updatedRental?.escrow?.status}, Release Tx: ${updatedRental?.escrow?.releaseTxId}`
  );

  // =========================================================================
  // SENARYO 4: HATALI ÖDEME & KART REDDİ TESTİ
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 SENARYO 4: Hatalı Ödeme & Kart Reddi Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 4.1 Sepete ürün ekle
  const cart4 = await CartService.getOrCreateCart(customer.id);
  await CartService.clear(cart4.id);
  await CartService.addItem(cart4.id, {
    productId: saleProduct.id,
    type: "SALE",
    quantity: 1,
  });

  // 4.2 Yetersiz bakiye test kartı (4000 0000 0000 0002) ile ödeme dene
  const failedPaymentResult = await CheckoutService.process({
    userId: customer.id,
    cartId: cart4.id,
    paymentCard: {
      cardHolder: "ELİF DEMİR",
      cardNumber: "4000 0000 0000 0002",
      expireMonth: "12",
      expireYear: "2028",
      cvc: "123",
    },
  });

  assert(
    "Senaryo 4",
    "4.1 Yetersiz bakiye kartı ile checkout işlemi reddedilmeli (success: false)",
    !failedPaymentResult.success,
    "success: false",
    `success: ${failedPaymentResult.success}`
  );

  assert(
    "Senaryo 4",
    "4.2 Kullanıcıya anlaşılır Türkçe bakiye hatası gösterilmeli",
    Boolean(failedPaymentResult.error?.includes("yeterli bakiye bulunmamaktadır")),
    "Hata: 'Kartınızda yeterli bakiye bulunmamaktadır...'",
    `Hata Mesajı: "${failedPaymentResult.error}"`
  );

  // 4.3 Veritabanında siparişin FAILED durumunda kaldığını doğrula
  const failedOrder = await prisma.order.findUnique({
    where: { id: failedPaymentResult.orderId },
    include: { payments: true },
  });

  assert(
    "Senaryo 4",
    "4.3 Veritabanında sipariş 'FAILED' durumunda kaydedilmeli",
    failedOrder?.status === "FAILED",
    "status: FAILED",
    `status: ${failedOrder?.status}`
  );

  assert(
    "Senaryo 4",
    "4.4 Başarısız ödeme kaydı (Payment status: FAILED) hata detayıyla tutulmalı",
    Boolean(
      failedOrder?.payments &&
        failedOrder.payments.length > 0 &&
        failedOrder.payments[0].status === "FAILED" &&
        failedOrder.payments[0].errorMessage?.includes("yeterli bakiye")
    ),
    "Payment status: FAILED ve errorMessage kayıtlı",
    `Payment Status: ${failedOrder?.payments[0]?.status}, Hata: "${failedOrder?.payments[0]?.errorMessage}"`
  );

  // =========================================================================
  // SONUÇ VE ÖZET
  // =========================================================================
  console.log("===========================================================================");
  const total = scenarioLog.length;
  const passed = scenarioLog.filter((s) => s.passed).length;
  const failed = scenarioLog.filter((s) => !s.passed).length;

  console.log(`📊 TEST RAPORU: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 TÜM ÖDEME, DEPOZİTO BLOKAJI VE İADE SENARYOLARI %100 BAŞARIYLA TAMAMLANDI!");
  } else {
    console.error("⚠️ BAZI SENARYO ADIMLARI BAŞARISIZ OLDU!");
    process.exit(1);
  }
  console.log("===========================================================================\n");
}

runPaymentFlowScenarios()
  .catch((err) => {
    console.error("Senaryo testi hatası:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
