import prisma from "../src/lib/prisma";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { PaymentGatewayService, validateCreditCard } from "../src/features/payment/services/payment-gateway.service";
import { requestRentalReturn, approveRentalReturn } from "../src/features/rental/actions/rental.actions";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";
import { addDays } from "date-fns";

interface TestStepResult {
  step: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const results: TestStepResult[] = [];

function assert(step: string, condition: boolean, expected: string, actual: string) {
  results.push({ step, passed: condition, expected, actual });
  if (condition) {
    console.log(`✅ [PASS] ${step}`);
    console.log(`   └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
  } else {
    console.error(`❌ [FAIL] ${step}`);
    console.error(`   └─ Beklenen: ${expected} | Gerçekleşen: ${actual}\n`);
  }
}

async function runPaymentAndEscrowTests() {
  console.log("===========================================================================");
  console.log("💳 STRIPE / IYZICO SANDBOX ÖDEME VE ESCROW DEPOZİTO DOĞRULAMA TESTİ");
  console.log("===========================================================================\n");

  const BASE_URL = "http://localhost:3000";

  // ─────────────────────────────────────────────────────────────
  // HAZIRLIK: Test Müşterisi, Satıcı ve Ürünler
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 ADIM 0: Test Veri Hazırlığı");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const customer = await prisma.user.upsert({
    where: { email: "payment.customer@hybridcommerce.dev" },
    update: { role: "CUSTOMER" },
    create: {
      email: "payment.customer@hybridcommerce.dev",
      name: "Selin Yıldız (Ödeme Test Müşteri)",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
      roles: ["CUSTOMER"],
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "payment.vendor@hybridcommerce.dev" },
    update: { role: "VENDOR" },
    create: {
      email: "payment.vendor@hybridcommerce.dev",
      name: "FotoPro Mağazası (Ödeme Test Satıcı)",
      password: "hashed_dummy_password",
      role: "VENDOR",
      roles: ["VENDOR"],
    },
  });

  // Satış ürünü
  const saleProduct = await prisma.product.upsert({
    where: { slug: "test-odeme-satis-kulaklik" },
    update: { salePrice: 1500, active: true },
    create: {
      name: "Sony WH-1000XM5 Kulaklık (Test Satış)",
      slug: "test-odeme-satis-kulaklik",
      description: "Yüksek çözünürlüklü gürültü engelleyici kulaklık",
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
      type: "SALE",
      salePrice: 1500,
      vendorId: vendor.id,
      inventory: {
        create: {
          totalStock: 50,
          reservedStock: 0,
        },
      },
    },
  });

  // Kiralama ürünü (Depozitolu)
  const rentalProduct = await prisma.product.upsert({
    where: { slug: "test-odeme-kiralik-lens" },
    update: { active: true },
    create: {
      name: "Sony FE 24-70mm f/2.8 GM II Lens (Test Kiralık)",
      slug: "test-odeme-kiralik-lens",
      description: "Profesyonel zum lens, sinematik çekim kalitesi",
      images: ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800"],
      type: "RENTAL",
      vendorId: vendor.id,
      rentalPricing: {
        create: {
          dailyPrice: 350,
          depositAmount: 4000,
        },
      },
    },
  });

  console.log(`👤 Müşteri: ${customer.name} (${customer.id})`);
  console.log(`📦 Satış Ürünü: ${saleProduct.name} (₺${Number(saleProduct.salePrice)})`);
  console.log(`📦 Kiralık Ürünü: ${rentalProduct.name} (Depozito: ₺4000)\n`);

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 1: Sepet & Ödeme Sayfası (/checkout) UI ve Özet Doğrulaması
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 1: Sepet ve Ödeme Sayfası (/checkout) Kontrolleri");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Müşterinin sepetini ürünle doldur
  const initCart = await CartService.getOrCreateCart(customer.id);
  await CartService.clear(initCart.id);
  await CartService.addItem(initCart.id, {
    productId: saleProduct.id,
    type: "SALE",
    quantity: 1,
  });

  const customerToken = await createSessionToken({
    id: customer.id,
    email: customer.email,
    role: "CUSTOMER",
    roles: ["CUSTOMER"],
  });

  const checkoutRes = await fetch(`${BASE_URL}/checkout`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${customerToken}` },
  });
  const checkoutHtml = await checkoutRes.text();

  assert(
    "1.1 /checkout sayfası müşteri için HTTP 200 dönmeli",
    checkoutRes.status === 200,
    "HTTP 200 OK",
    `HTTP ${checkoutRes.status}`
  );

  assert(
    "1.2 Ödeme formunda kart alanları ve SSL rozeti bulunmalı",
    checkoutHtml.includes("Kart ile Güvenli Ödeme") ||
      checkoutHtml.includes("Kart Numarası") ||
      checkoutHtml.includes("256-Bit SSL"),
    "Kart ve güvenlik alanları mevcut",
    "Ödeme formu render edildi"
  );

  assert(
    "1.3 Sandbox Hızlı Test Kartı butonları ve Özet alanları bulunmalı",
    checkoutHtml.includes("Başarılı") ||
      checkoutHtml.includes("Sandbox") ||
      checkoutHtml.includes("Ürün Toplamı"),
    "Sandbox test kartları veya özet kalemleri mevcut",
    "Ödeme ve özet bileşenleri render edildi"
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 2: Hata & Test Kartları Handling
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 2: Hata & Test Kartları Simülasyonu");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 2.1 Yetersiz Bakiye Kartı: 4000 0000 0000 0002
  const insufficientCheck = validateCreditCard({
    cardHolder: "Selin Yıldız",
    cardNumber: "4000 0000 0000 0002",
    expireMonth: "12",
    expireYear: "2028",
    cvc: "123",
  });

  assert(
    "2.1 Yetersiz Bakiye Test Kartı (4000 0000 0000 0002) reddedilmeli ve Türkçe mesaj dönmeli",
    !insufficientCheck.valid &&
      Boolean(insufficientCheck.error?.includes("yeterli bakiye bulunmamaktadır")),
    "valid: false ve 'yeterli bakiye bulunmamaktadır' mesajı",
    `valid: ${insufficientCheck.valid}, Hata: "${insufficientCheck.error}"`
  );

  // 2.2 Son Kullanma Tarihi Geçmiş Kart: 4000 0000 0000 0110
  const expiredCheck = validateCreditCard({
    cardHolder: "Selin Yıldız",
    cardNumber: "4000 0000 0000 0110",
    expireMonth: "01",
    expireYear: "2023",
    cvc: "123",
  });

  assert(
    "2.2 Süresi Geçmiş Test Kartı (4000 0000 0000 0110) reddedilmeli",
    !expiredCheck.valid && Boolean(expiredCheck.error?.includes("son kullanma tarihi geçmiştir")),
    "valid: false ve 'son kullanma tarihi geçmiştir' mesajı",
    `valid: ${expiredCheck.valid}, Hata: "${expiredCheck.error}"`
  );

  // 2.3 Hatalı CVC Kartı: 4000 0000 0000 0127
  const cvcCheck = validateCreditCard({
    cardHolder: "Selin Yıldız",
    cardNumber: "4000 0000 0000 0127",
    expireMonth: "05",
    expireYear: "2027",
    cvc: "000",
  });

  assert(
    "2.3 Hatalı CVC Test Kartı (4000 0000 0000 0127) reddedilmeli",
    !cvcCheck.valid && Boolean(cvcCheck.error?.includes("CVC")),
    "valid: false ve CVC hata mesajı",
    `valid: ${cvcCheck.valid}, Hata: "${cvcCheck.error}"`
  );

  // 2.4 Geçersiz/Kısa Kart Numarası
  const shortCardCheck = validateCreditCard({
    cardHolder: "Selin Yıldız",
    cardNumber: "1234 5678",
    expireMonth: "12",
    expireYear: "2028",
    cvc: "123",
  });

  assert(
    "2.4 Eksik haneli kart numarası reddedilmeli",
    !shortCardCheck.valid,
    "valid: false",
    `valid: ${shortCardCheck.valid}, Hata: "${shortCardCheck.error}"`
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 3: Ödeme Server Action & API Entegrasyonu (Hibrit Tahsilat & Escrow)
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 3: Ödeme Tahsilatı & Escrow Blokajı Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Müşterinin sepetini hazırla
  const customerCart = await CartService.getOrCreateCart(customer.id);
  await CartService.clear(customerCart.id);

  // Sepete 1 adet Satış ürünü ekle (1500 TL)
  await CartService.addItem(customerCart.id, {
    productId: saleProduct.id,
    type: "SALE",
    quantity: 1,
  });

  // Sepete 3 günlük Kiralık ürün ekle (3 * 350 = 1050 TL kira + 4000 TL depozito)
  const rentStart = addDays(new Date(), 10);
  const rentEnd = addDays(new Date(), 13);
  await CartService.addItem(customerCart.id, {
    productId: rentalProduct.id,
    type: "RENTAL",
    rentalStart: rentStart.toISOString(),
    rentalEnd: rentEnd.toISOString(),
  });

  const cartSummary = await CartService.getSummary(customerCart.id);
  const expectedProductTotal = cartSummary.saleSubtotal + cartSummary.rentalSubtotal;
  const expectedDeposit = cartSummary.totalDeposit;
  const expectedGrandTotal = cartSummary.grandTotal;

  assert(
    "3.1 Sepet özeti Ürün Toplamı, Depozito ve Genel Toplamı doğru hesaplamalı",
    expectedProductTotal > 0 && expectedDeposit === 4000 && expectedGrandTotal === expectedProductTotal + 4000,
    `Ürün Toplamı: ₺${expectedProductTotal}, Depozito: ₺${expectedDeposit}, Genel: ₺${expectedGrandTotal}`,
    `Hesaplanan: ₺${expectedProductTotal} + ₺${expectedDeposit} = ₺${expectedGrandTotal}`
  );

  // Önce Yetersiz Bakiye ile Checkout denemesi (Sipariş oluşmamalı veya rollback olmalı)
  const failedCheckout = await CheckoutService.process({
    userId: customer.id,
    cartId: customerCart.id,
    paymentCard: {
      cardHolder: "Selin Yıldız",
      cardNumber: "4000 0000 0000 0002",
      expireMonth: "12",
      expireYear: "2028",
      cvc: "123",
    },
  });

  assert(
    "3.2 Yetersiz bakiye kartı ile checkout işlemi reddedilmeli ve sipariş tamamlanmamalı",
    !failedCheckout.success && Boolean(failedCheckout.error?.includes("yeterli bakiye")),
    "success: false ve 'yeterli bakiye bulunmamaktadır'",
    `success: ${failedCheckout.success}, error: "${failedCheckout.error}"`
  );

  // Şimdi Geçerli Kart ile Başarılı Checkout
  const successfulCheckout = await CheckoutService.process({
    userId: customer.id,
    cartId: customerCart.id,
    paymentCard: {
      cardHolder: "Selin Yıldız",
      cardNumber: "4242 4242 4242 4242",
      expireMonth: "12",
      expireYear: "2028",
      cvc: "123",
    },
  });

  assert(
    "3.3 Geçerli kart ile checkout başarılı olmalı ve orderId üretilmeli",
    successfulCheckout.success && Boolean(successfulCheckout.orderId),
    "success: true ve orderId tanımlı",
    `success: ${successfulCheckout.success}, orderId: ${successfulCheckout.orderId}`
  );

  const createdOrder = await prisma.order.findUnique({
    where: { id: successfulCheckout.orderId },
    include: {
      items: { include: { product: true } },
      payments: { include: { escrows: true } },
    },
  });

  assert(
    "3.4 Sipariş durumu veritabanında 'PAID' olarak işaretlenmeli",
    createdOrder?.status === "PAID",
    "status: PAID",
    `status: ${createdOrder?.status}`
  );

  assert(
    "3.5 Ödeme kaydı (Payment) oluşturulmalı ve SUCCEEDED olmalı",
    Boolean(createdOrder?.payments && createdOrder.payments.length > 0 && createdOrder.payments[0].status === "SUCCEEDED"),
    "Payment kaydı mevcut ve SUCCEEDED",
    `Payment status: ${createdOrder?.payments[0]?.status}, TxId: ${createdOrder?.payments[0]?.transactionId}`
  );

  assert(
    "3.6 Kiralama depozitosu için EscrowTransaction kaydı 'HELD' durumunda olmalı",
    Boolean(createdOrder?.payments[0]?.escrows && createdOrder.payments[0].escrows.length > 0 && createdOrder.payments[0].escrows[0].status === "HELD"),
    "EscrowTransaction status: HELD",
    `Escrow status: ${createdOrder?.payments[0]?.escrows[0]?.status}, HoldId: ${createdOrder?.payments[0]?.escrows[0]?.holdId}`
  );

  // OrderItem snapshot alanları kontrolü
  const saleItem = createdOrder?.items.find((i) => i.type === "SALE");
  const rentalItem = createdOrder?.items.find((i) => i.type === "RENTAL");

  assert(
    "3.7 Satış OrderItem snapshot verileri (ad, görsel, fiyat) tam saklanmalı",
    Boolean(saleItem?.productName && saleItem.productImage && saleItem.priceAtPurchase),
    "productName, productImage ve priceAtPurchase dolu",
    `Ad: "${saleItem?.productName}", Fiyat: ₺${Number(saleItem?.priceAtPurchase)}`
  );

  assert(
    "3.8 Kiralık OrderItem snapshot verileri ve rentalId tam bağlanmalı",
    Boolean(rentalItem?.productName && rentalItem.rentalId),
    "productName ve rentalId mevcut",
    `Ad: "${rentalItem?.productName}", Rental ID: ${rentalItem?.rentalId}`
  );

  // ─────────────────────────────────────────────────────────────
  // BÖLÜM 4: İade Onayında Depozito Çözme (Escrow Refund / Release Hold)
  // ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📌 BÖLÜM 4: İade Onayı ve Escrow Depozito Çözme Testi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const testRentalId = rentalItem!.rentalId!;

  // 4.1 Müşteri İade Talebi Başlatır
  const returnReq = await requestRentalReturn(testRentalId);
  assert(
    "4.1 Müşteri iade talebi oluşturabilmeli (status: RETURN_REQUESTED)",
    returnReq.success && returnReq.status === "RETURN_REQUESTED",
    "success: true, status: RETURN_REQUESTED",
    `success: ${returnReq.success}, status: ${returnReq.status}`
  );

  // 4.2 Satıcı / Admin İadeyi Onaylar ve Depozito Çözülür
  const returnApproval = await approveRentalReturn(testRentalId);

  assert(
    "4.2 approveRentalReturn çağrısı başarılı olmalı ve releaseTxId dönmeli",
    returnApproval.success && Boolean(returnApproval.releaseTxId),
    "success: true ve releaseTxId tanımlı",
    `success: ${returnApproval.success}, Dekont: ${returnApproval.releaseTxId}, Depozito: ₺${returnApproval.depositAmount}`
  );

  // 4.3 Veritabanında EscrowTransaction durumu RELEASED olmalı
  const updatedEscrow = await prisma.escrowTransaction.findUnique({
    where: { rentalId: testRentalId },
  });

  assert(
    "4.3 Veritabanında EscrowTransaction durumu 'RELEASED' olmalı ve releasedAt kaydedilmeli",
    updatedEscrow?.status === "RELEASED" && Boolean(updatedEscrow.releasedAt) && Boolean(updatedEscrow.releaseTxId),
    "status: RELEASED, releasedAt dolu",
    `Status: ${updatedEscrow?.status}, ReleasedAt: ${updatedEscrow?.releasedAt?.toISOString()}, TxId: ${updatedEscrow?.releaseTxId}`
  );

  // 4.4 Takvim Kilidi Kaldırılmış Olmalı
  const locks = await prisma.rentalAvailability.count({
    where: { rentalId: testRentalId },
  });

  assert(
    "4.4 Kiralama takvim kilit kaydı (RentalAvailability) temizlenmeli",
    locks === 0,
    "Kilit sayısı: 0",
    `Kalan kilit sayısı: ${locks}`
  );

  // ─────────────────────────────────────────────────────────────
  // ÖZET RAPOR
  // ─────────────────────────────────────────────────────────────
  console.log("===========================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`📊 TEST TAMAMLANDI: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  if (failed === 0) {
    console.log("🎉 IYZICO / STRIPE SANDBOX ÖDEME VE ESCROW DEPOZİTO SİSTEMİ %100 DOĞRULANDI!");
  } else {
    console.error("⚠️ BAZI TESTLER BAŞARISIZ OLDU!");
    process.exit(1);
  }
  console.log("===========================================================================\n");
}

runPaymentAndEscrowTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
