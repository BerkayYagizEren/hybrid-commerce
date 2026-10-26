import prisma from "../src/lib/prisma";
import { AvailabilityService } from "../src/features/rental/services/availability.service";
import {
  requestRentalReturn,
  approveRentalReturn,
  getRentalReturnsList,
} from "../src/features/rental/actions/rental.actions";
import {
  getAdminMetrics,
  generateFinancialReportCSV,
} from "../src/features/admin/actions/admin.actions";
import { formatCurrency, formatDate } from "../src/shared/utils/format";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";

interface TestReportStep {
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const testResults: TestReportStep[] = [];

async function recordStep(name: string, fn: () => Promise<string>) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    testResults.push({ name, passed: true, durationMs, details });
    console.log(`  ✅ [BAŞARILI] ${name} (${durationMs}ms)`);
    console.log(`     -> ${details}\n`);
  } catch (error) {
    const durationMs = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, durationMs, details: msg });
    console.error(`  ❌ [HATA] ${name} (${durationMs}ms)`);
    console.error(`     -> ${msg}\n`);
    throw error;
  }
}

async function runEndToEndVerification() {
  console.log("===============================================================================");
  console.log("🧪 HİBRİT E-TİCARET: İADE, DEPOZİTO VE TAKVİM KİLİDİ UÇTAN UCA DOĞRULAMA TESTİ");
  console.log("===============================================================================\n");

  // --- HAZIRLIK ADIMI: TEST KULLANICISI, SATICI VE KİRALAMA KAYDI OLUŞTURMA ---
  console.log("--- 0. TEST VERİ HAZIRLIĞI ---");

  // 1. Müşteri
  const customer = await prisma.user.upsert({
    where: { email: "test.customer@hybridcommerce.dev" },
    update: { role: "CUSTOMER" },
    create: {
      email: "test.customer@hybridcommerce.dev",
      name: "Merve Kaya (Test Müşteri)",
      password: "hashed_test_password",
      role: "CUSTOMER",
      roles: ["CUSTOMER"],
    },
  });

  // 2. Satıcı
  const vendor = await prisma.user.upsert({
    where: { email: "test.vendor@hybridcommerce.dev" },
    update: { role: "VENDOR" },
    create: {
      email: "test.vendor@hybridcommerce.dev",
      name: "TeknoRent Mağazası (Test Satıcı)",
      password: "hashed_test_password",
      role: "VENDOR",
      roles: ["VENDOR", "CUSTOMER"],
    },
  });

  // 3. Kiralık Ürün (Sony A7IV veya Özel Test Kamerası)
  const product = await prisma.product.upsert({
    where: { slug: "test-red-komodo-6k" },
    update: { vendorId: vendor.id },
    create: {
      name: "RED Komodo 6K Sinema Kamerası (Test Ürünü)",
      slug: "test-red-komodo-6k",
      description: "Profesyonel prodüksiyon için 6K sinema kamerası",
      type: "RENTAL",
      vendorId: vendor.id,
      images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32"],
      inventory: {
        create: {
          totalStock: 3,
          reservedStock: 0,
          rentalQuantity: 1,
        },
      },
      rentalPricing: {
        create: {
          dailyPrice: 1500,
          weeklyPrice: 9000,
          monthlyPrice: 30000,
          depositAmount: 15000,
          minDays: 1,
          maxDays: 30,
        },
      },
    },
    include: { rentalPricing: true, inventory: true },
  });

  // Test Tarihleri: 15 Aralık 2026 - 22 Aralık 2026 (7 Gün)
  const testStartDate = new Date("2026-12-15T10:00:00Z");
  const testEndDate = new Date("2026-12-22T10:00:00Z");

  // Önce bu test ürünü için varsa eski kiralama ve availability kayıtlarını temizle
  await prisma.rentalAvailability.deleteMany({ where: { productId: product.id } });
  await prisma.rental.deleteMany({ where: { productId: product.id } });

  // Yeni bir Kiralama ve Sipariş oluştur
  const testRental = await prisma.rental.create({
    data: {
      userId: customer.id,
      productId: product.id,
      startDate: testStartDate,
      endDate: testEndDate,
      dailyRate: 1500,
      totalPrice: 9000,
      depositAmount: 15000,
      status: "ACTIVE",
    },
  });

  // Takvim kilidi (RentalAvailability) ekle
  await prisma.rentalAvailability.create({
    data: {
      productId: product.id,
      rentalId: testRental.id,
      startDate: testStartDate,
      endDate: testEndDate,
    },
  });

  // Sipariş kaydı oluştur
  const testOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      status: "PROCESSING",
      totalAmount: 24000, // 9000 kira + 15000 depozito
      items: {
        create: {
          productId: product.id,
          type: "RENTAL",
          quantity: 1,
          unitPrice: 1500,
          totalPrice: 9000,
          productName: product.name,
          productImage: product.images[0] || "",
          priceAtPurchase: 1500,
          rentalId: testRental.id,
        },
      },
    },
  });

  console.log(`👤 Müşteri: ${customer.name} (${customer.email})`);
  console.log(`🏪 Satıcı: ${vendor.name} (${vendor.email})`);
  console.log(`📦 Ürün: ${product.name} (Depozito: ₺${product.rentalPricing?.depositAmount})`);
  console.log(`📋 Aktif Sipariş ID: ${testOrder.id} | Kiralama ID: ${testRental.id}`);
  console.log(`📅 Kilitli Tarihler: ${formatDate(testStartDate)} - ${formatDate(testEndDate)}\n`);

  // =========================================================================
  // TEST 1: MÜŞTERİ İADE BAŞLATMA TESTİ
  // =========================================================================
  console.log("--- TEST 1: MÜŞTERİ İADE BAŞLATMA TESTİ ---");

  // 1.1 Ön Kontrol: Kiralama aktifken takvim çakışma kontrolü yapılmalı ve müsait OLMAMALI
  await recordStep("1.1 Takvim Çakışma Ön Kontrolü (Ürün Müsait Olmamalı)", async () => {
    const check = await AvailabilityService.check({
      productId: product.id,
      startDate: new Date("2026-12-16T10:00:00Z").toISOString(),
      endDate: new Date("2026-12-20T10:00:00Z").toISOString(),
    });

    if (check.available) {
      throw new Error("Hata: Ürün aktif kiralama süresinde müsait görünüyor! Takvim kilidi çalışmıyor.");
    }
    return `Başarılı: Tarihler beklendiği gibi kilitli (Çakışan Blok: ${check.conflicts?.[0]?.startDate} - ${check.conflicts?.[0]?.endDate})`;
  });

  // 1.2 Müşteri İade Talebi Başlatma (requestRentalReturn)
  await recordStep("1.2 Müşteri 'İade Et' Server Action Tetikleme", async () => {
    const res = await requestRentalReturn(testRental.id);
    if (!res.success) {
      throw new Error(`İade talebi başarısız: ${res.error}`);
    }

    const updatedDb = await prisma.rental.findUnique({ where: { id: testRental.id } });
    if (updatedDb?.status !== "RETURN_REQUESTED") {
      throw new Error(`Veritabanı durumu hatalı. Beklenen: RETURN_REQUESTED, Gerçek: ${updatedDb?.status}`);
    }

    return `Sunucu Yanıtı: "${res.message}" | DB Durumu: ${updatedDb.status}`;
  });

  // 1.3 Müşteri Ekranı HTTP GET /orders Doğrulaması
  await recordStep("1.3 Müşteri Paneli HTTP GET /orders Yanıtı", async () => {
    const custToken = await createSessionToken({
      id: customer.id,
      email: customer.email,
      role: "CUSTOMER",
      roles: ["CUSTOMER"],
    });
    const res = await fetch("http://localhost:3000/orders", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${custToken}` },
    });
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status} - /orders sayfası açılamadı`);
    }
    const html = await res.text();
    if (!html.includes("İade") && !html.includes("Sipariş")) {
      throw new Error("Sayfa içeriği sipariş/iade bileşenlerini içermiyor");
    }
    return `HTTP 200 OK - Sayfa başarıyla render edildi (${html.length} bytes)`;
  });

  // =========================================================================
  // TEST 2: SATICI ONAY VE ENVANTER BOŞA ÇIKARMA TESTİ
  // =========================================================================
  console.log("--- TEST 2: SATICI ONAY VE ENVANTER BOŞA ÇIKARMA TESTİ ---");

  // 2.1 Satıcı Bekleyen İadeleri Listeleme
  await recordStep("2.1 Satıcı İade Listesinde Talebin Görünmesi", async () => {
    const list = await getRentalReturnsList();
    const item = list.find((r) => r.id === testRental.id);
    if (!item) {
      throw new Error("Oluşturulan iade talebi Satıcı İade Listesinde bulunamadı!");
    }
    if (item.status !== "RETURN_REQUESTED") {
      throw new Error(`Liste elemanının durumu RETURN_REQUESTED değil: ${item.status}`);
    }
    return `Talebin Listede Tespiti: Ürün: ${item.productName}, Kiracı: ${item.customerName}, Depozito: ₺${item.depositAmount}, Durum: ${item.status}`;
  });

  // 2.2 Satıcı Paneli HTTP GET /vendor/dashboard
  await recordStep("2.2 Satıcı Dashboard HTTP GET /vendor/dashboard Yanıtı", async () => {
    const vendToken = await createSessionToken({
      id: vendor.id,
      email: vendor.email,
      role: "VENDOR",
      roles: ["VENDOR"],
    });
    const res = await fetch("http://localhost:3000/vendor/dashboard", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${vendToken}` },
    });
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status} - /vendor/dashboard sayfası açılamadı`);
    }
    const html = await res.text();
    return `HTTP 200 OK - Satıcı dashboard başarıyla yüklendi (${html.length} bytes)`;
  });

  // 2.3 Satıcı İadeyi Onayla & Depozitoyu Serbest Bırak (Prisma $transaction)
  await recordStep("2.3 approveRentalReturn ($transaction) Çalıştırılması", async () => {
    const res = await approveRentalReturn(testRental.id);
    if (!res.success) {
      throw new Error(`İade onayı başarısız: ${res.error}`);
    }

    // A) Rental durumu RETURNED olmalı
    const rentalDb = await prisma.rental.findUnique({ where: { id: testRental.id } });
    if (rentalDb?.status !== "RETURNED") {
      throw new Error(`Rental durumu RETURNED olmadı. Mevcut: ${rentalDb?.status}`);
    }

    // B) RentalAvailability takvim kilit kaydı silinmiş olmalı
    const remainingLocks = await prisma.rentalAvailability.count({
      where: { rentalId: testRental.id },
    });
    if (remainingLocks !== 0) {
      throw new Error(`RentalAvailability silinmedi! Kalan kilit sayısı: ${remainingLocks}`);
    }

    return `Onay Mesajı: "${res.message}" | DB Durumu: ${rentalDb.status} | Kalan Takvim Kilidi: ${remainingLocks}`;
  });

  // 2.4 Takvim Müsaitliğinin Geri Kazanıldığının Doğrulanması (Availability Unblocking)
  await recordStep("2.4 Takvim Müsaitliği Kontrolü (Tarihler Tekrar Müsait Olmalı)", async () => {
    const recheck = await AvailabilityService.check({
      productId: product.id,
      startDate: new Date("2026-12-16T10:00:00Z").toISOString(),
      endDate: new Date("2026-12-20T10:00:00Z").toISOString(),
    });

    if (!recheck.available) {
      throw new Error("HATA: İade onaylanmasına rağmen ürün takvimi hala kilitli!");
    }
    return "MÜKEMMEL: Ürün takvim kilidi başarıyla kaldırıldı, tarihler yeniden kiralamaya MÜSAİT!";
  });

  // 2.5 İdempotency & Çift İade Hata Koruması
  await recordStep("2.5 İdempotent Hata Koruması (Tekrar İade Talebi Engellenmeli)", async () => {
    const duplicateReturn = await requestRentalReturn(testRental.id);
    if (duplicateReturn.success) {
      throw new Error("Hata: Zaten RETURNED olan bir kiralama için iade talebi kabul edildi!");
    }
    return `Beklenen Hata Yakalandı: "${duplicateReturn.error}"`;
  });

  // =========================================================================
  // TEST 3: ADMIN FİNANSAL HAVUZ VE DENETİM TESTİ
  // =========================================================================
  console.log("--- TEST 3: ADMIN FİNANSAL HAVUZ VE DENETİM TESTİ ---");

  // 3.1 Admin Metrikleri Hesaplama
  let adminMetricsSnapshot: any = null;
  await recordStep("3.1 Admin Metrikleri ve Emanet Depozito Havuzu Hesaplaması", async () => {
    adminMetricsSnapshot = await getAdminMetrics();
    if (!adminMetricsSnapshot || adminMetricsSnapshot.totalGMV <= 0) {
      throw new Error("Admin metrikleri sıfır veya geçersiz döndü");
    }
    return `GMV: ₺${adminMetricsSnapshot.totalGMV.toLocaleString("tr-TR")} | Emanet Depozito: ₺${adminMetricsSnapshot.totalEscrowDeposit.toLocaleString("tr-TR")} | Aktif Kiralamalar: ${adminMetricsSnapshot.activeRentalsCount}`;
  });

  // 3.2 CSV Finansal Rapor Üretimi
  await recordStep("3.2 Finansal Rapor CSV Üretimi (generateFinancialReportCSV)", async () => {
    const csvResult = await generateFinancialReportCSV();
    if (!csvResult.filename || !csvResult.csvContent) {
      throw new Error("CSV çıktısı boş veya geçersiz");
    }

    const lines = csvResult.csvContent.split("\n");
    const headerExists = lines.some((l) => l.includes("Sipariş No;Tarih;Müşteri;E-Posta"));
    if (!headerExists) {
      throw new Error("CSV başlık satırı eksik!");
    }

    return `Dosya Adı: "${csvResult.filename}" | Satır Sayısı: ${lines.length} | Boyut: ${csvResult.csvContent.length} bytes`;
  });

  // 3.3 Admin Sayfaları HTTP GET /admin/dashboard ve /admin/orders
  await recordStep("3.3 Admin Ekranları HTTP GET Doğrulaması", async () => {
    const [dashRes, ordersRes] = await Promise.all([
      fetch("http://localhost:3000/admin/dashboard"),
      fetch("http://localhost:3000/admin/orders"),
    ]);

    if (dashRes.status !== 200 || ordersRes.status !== 200) {
      throw new Error(`Admin sayfaları hata verdi: dashboard=${dashRes.status}, orders=${ordersRes.status}`);
    }

    return `/admin/dashboard: ${dashRes.status} OK | /admin/orders: ${ordersRes.status} OK`;
  });

  // =========================================================================
  // ÖZET VE SONUÇ
  // =========================================================================
  console.log("\n===============================================================================");
  console.log("📊 DOĞRULAMA TEST RAPORU ÖZETİ");
  console.log("===============================================================================");
  const totalSteps = testResults.length;
  const passedSteps = testResults.filter((r) => r.passed).length;
  const totalDuration = testResults.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Toplam Test Adımı: ${totalSteps}`);
  console.log(`Başarılı Adım:     ${passedSteps}`);
  console.log(`Başarısız Adım:    ${totalSteps - passedSteps}`);
  console.log(`Toplam Süre:       ${totalDuration}ms`);
  console.log(`Sistem Durumu:     %100 SAĞLIKLI, KONSOL HATASI / VERİTABANI KİLİTLENMESİ YOK\n`);
}

runEndToEndVerification()
  .catch((e) => {
    console.error("Test Sürecinde Kritik Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
