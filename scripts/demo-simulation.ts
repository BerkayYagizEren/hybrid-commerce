import prisma from "../src/lib/prisma";
import { ProductService } from "../src/features/products/services/product.service";
import { AvailabilityService } from "../src/features/rental/services/availability.service";
import { RentalPricingService } from "../src/features/rental/services/pricing.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";
import { RentalService } from "../src/features/rental/services/rental.service";
import { OrderService } from "../src/features/orders/services/order.service";
import { formatCurrency, formatDate } from "../src/shared/utils/format";

async function runDemoSimulation() {
  console.log("===============================================================");
  console.log("🚀 HİBRİT E-TİCARET (SATIŞ & KİRALAMA) E2E SİMÜLASYONU BAŞLIYOR");
  console.log("===============================================================\n");

  // 0. Demo Kullanıcı Oluştur veya Bul
  const user = await prisma.user.upsert({
    where: { email: "ahmet@example.com" },
    update: {},
    create: {
      email: "ahmet@example.com",
      name: "Ahmet Yılmaz",
      password: "hashed_password_demo",
    },
  });
  console.log(`👤 Kullanıcı: ${user.name} (${user.email})\n`);

  // 1. Ürün Kataloğu Sorgusu (ProductService)
  console.log("--- 1. ÜRÜN KATALOĞU LİSTELEME ---");
  const catalog = await ProductService.list({ limit: 10 });
  for (const p of catalog.products) {
    const saleInfo = p.salePrice ? `Satış: ${formatCurrency(Number(p.salePrice))}` : "Satış Yok";
    const rentalInfo = p.rentalPricing
      ? `Kira: ${formatCurrency(Number(p.rentalPricing.dailyPrice))}/gün (Haftalık: ${formatCurrency(Number(p.rentalPricing.weeklyPrice ?? 0))}) [Depozito: ${formatCurrency(Number(p.rentalPricing.depositAmount))}]`
      : "Kira Yok";
    console.log(` • [${p.type}] ${p.name}`);
    console.log(`   ${saleInfo} | ${rentalInfo}`);
  }

  const laptop = catalog.products.find((p) => p.slug === "macbook-pro-16")!;
  const camera = catalog.products.find((p) => p.slug === "sony-a7iv-kamera")!;
  const tent = catalog.products.find((p) => p.slug === "4-mevsim-cadir")!;

  // 2. Kiralama Tarih ve Fiyat Algoritması Testi (Louez Modeli)
  console.log("\n--- 2. KİRALAMA FİYAT HESAPLAMA (LOUEZ MODELİ) ---");
  const rentalDays = 7; // 1 Hafta
  const cameraPricing = camera.rentalPricing!;
  const calc = RentalPricingService.calculate(
    rentalDays,
    Number(cameraPricing.dailyPrice),
    Number(cameraPricing.weeklyPrice),
    Number(cameraPricing.monthlyPrice),
    Number(cameraPricing.depositAmount)
  );
  console.log(`Ürün: ${camera.name}`);
  console.log(`Süre: ${calc.totalDays} Gün`);
  for (const b of calc.breakdown) {
    console.log(` -> Tarife: ${b.label} (${b.quantity} x ${formatCurrency(b.unitPrice)}) = ${formatCurrency(b.total)}`);
  }
  console.log(` -> Ara Toplam: ${formatCurrency(calc.subtotal)}`);
  console.log(` -> Güvence Depozitosu (İade Edilir): ${formatCurrency(calc.depositAmount)}`);
  console.log(` -> Genel Toplam: ${formatCurrency(calc.grandTotal)}`);

  // 3. Sepet İşlemleri (Hibrit Sepet: Satış + Kiralama)
  console.log("\n--- 3. HİBRİT SEPETE EKLEME (MEDUSA STANDARDI) ---");
  const cart = await CartService.getOrCreateCart(user.id);
  // Sepeti temizle (temiz başlangıç için)
  await CartService.clear(cart.id);

  // A) Satılık Ürün Ekle (Laptop x 1)
  console.log(`🛒 Satış Kalemi Ekleniyor: ${laptop.name} (Adet: 1)`);
  await CartService.addItem(cart.id, {
    productId: laptop.id,
    type: "SALE",
    quantity: 1,
  });

  // B) Kiralık Ürün Ekle (Kamera: 10 Kasım 2026 - 17 Kasım 2026)
  const rentStart = new Date("2026-11-10T10:00:00Z");
  const rentEnd = new Date("2026-11-17T10:00:00Z");
  console.log(`🛒 Kiralama Kalemi Ekleniyor: ${camera.name} (${formatDate(rentStart)} - ${formatDate(rentEnd)})`);
  await CartService.addItem(cart.id, {
    productId: camera.id,
    type: "RENTAL",
    rentalStart: rentStart.toISOString(),
    rentalEnd: rentEnd.toISOString(),
  });

  // C) Sepet Özeti
  const summary = await CartService.getSummary(cart.id);
  console.log("\n🧾 SEPET ÖZETİ:");
  console.log(` • Kalem Sayısı: ${summary.itemCount}`);
  console.log(` • Satın Alma Toplamı: ${formatCurrency(summary.saleSubtotal)}`);
  console.log(` • Kiralama Toplamı:   ${formatCurrency(summary.rentalSubtotal)}`);
  console.log(` • Toplam Depozito:     ${formatCurrency(summary.totalDeposit)}`);
  console.log(` • ÖDENECEK TUTAR:      ${formatCurrency(summary.grandTotal)}`);

  // 4. Checkout ve Atomik Sipariş Oluşturma
  console.log("\n--- 4. CHECKOUT & ATOMİK SİPARİŞ OLUŞTURMA ---");
  const checkoutResult = await CheckoutService.process({
    userId: user.id,
    cartId: cart.id,
    shippingAddress: {
      fullName: "Ahmet Yılmaz",
      addressLine1: "Büyükdere Cad. No: 123",
      city: "İstanbul",
      state: "Levent",
      postalCode: "34394",
      country: "Türkiye",
      phone: "+90 532 111 2233",
    },
  });

  if (!checkoutResult.success) {
    throw new Error(`Checkout başarısız: ${checkoutResult.error}`);
  }
  console.log(`✅ Sipariş Başarıyla Oluşturuldu! Sipariş ID: ${checkoutResult.orderId}`);

  // 5. Sipariş ve Kiralama Kayıtlarını Doğrulama
  console.log("\n--- 5. SİPARİŞ & ENVANTER DOĞRULAMA ---");
  const orderDetails = await OrderService.getById(checkoutResult.orderId!);
  console.log(`Sipariş Durumu: ${orderDetails?.status} | Toplam: ${formatCurrency(orderDetails?.totalAmount ?? 0)}`);
  for (const item of orderDetails?.items ?? []) {
    console.log(` • [${item.type}] ${item.productName} - Tutar: ${formatCurrency(item.totalPrice)}`);
    if (item.rentalInfo) {
      console.log(`   Rezervasyon ID: ${item.rentalInfo.rentalId}`);
      console.log(`   Kiralama Tarihleri: ${formatDate(item.rentalInfo.startDate)} - ${formatDate(item.rentalInfo.endDate)}`);
      console.log(`   Durum: ${item.rentalInfo.status}`);
    }
  }

  // Envanter kontrolü
  const laptopInv = await prisma.inventory.findUnique({ where: { productId: laptop.id } });
  console.log(`📦 Laptop Stok Durumu -> Toplam: ${laptopInv?.totalStock}, Rezerve: ${laptopInv?.reservedStock}`);

  // 6. Takvim Müsaitlik Kilidi Testi (Sharetribe / Louez Overlap Blocking)
  console.log("\n--- 6. MÜSAİTLİK KİLİTLEME (AVAILABILITY BLOCKING) TESTİ ---");
  
  // Test A: Çakışan tarih aralığı (12 Kasım - 15 Kasım)
  console.log("🔍 Test A: Çakışan tarih testi (12 Kasım - 15 Kasım)");
  const conflictCheck = await AvailabilityService.check({
    productId: camera.id,
    startDate: new Date("2026-11-12T10:00:00Z").toISOString(),
    endDate: new Date("2026-11-15T10:00:00Z").toISOString(),
  });

  if (!conflictCheck.available) {
    console.log("  🛑 [BAŞARILI] Ürün bu tarihlerde MÜSAİT DEĞİL! Sistem çakışmayı tespit etti:");
    for (const c of conflictCheck.conflicts ?? []) {
      console.log(`     Mevcut Blok: ${formatDate(c.startDate)} - ${formatDate(c.endDate)}`);
    }
  } else {
    console.error("  ❌ [HATA] Çakışma tespit edilemedi!");
  }

  // Test B: Çakışmayan tarih aralığı (20 Kasım - 25 Kasım)
  console.log("\n🔍 Test B: Müsait tarih testi (20 Kasım - 25 Kasım)");
  const freeCheck = await AvailabilityService.check({
    productId: camera.id,
    startDate: new Date("2026-11-20T10:00:00Z").toISOString(),
    endDate: new Date("2026-11-25T10:00:00Z").toISOString(),
  });

  if (freeCheck.available) {
    console.log("  ✅ [BAŞARILI] Ürün bu tarihlerde TAMAMEN MÜSAİT!");
  } else {
    console.error("  ❌ [HATA] Müsait olması gereken tarihte çakışma bildirildi!");
  }

  // 7. Kiralama İade / İptal ve Kilidin Açılması Testi
  console.log("\n--- 7. İPTAL / İADE İLE KİLİDİN AÇILMASI TESTİ ---");
  const rentalItem = orderDetails?.items.find((i) => i.type === "RENTAL");
  if (rentalItem?.rentalInfo) {
    console.log(`Kiralama iptal ediliyor (ID: ${rentalItem.rentalInfo.rentalId})...`);
    await RentalService.updateStatus(rentalItem.rentalInfo.rentalId, "CANCELLED");
    
    // Tekrar çakışan tarihe bakalım
    const recheck = await AvailabilityService.check({
      productId: camera.id,
      startDate: new Date("2026-11-12T10:00:00Z").toISOString(),
      endDate: new Date("2026-11-15T10:00:00Z").toISOString(),
    });

    if (recheck.available) {
      console.log("  🔓 [BAŞARILI] Kiralama iptal edilince takvim kilidi kalktı ve tarihler yeniden müsait oldu!");
    } else {
      console.error("  ❌ [HATA] Kilit kaldırılamadı!");
    }
  }

  console.log("\n===============================================================");
  console.log("✨ TÜM TEST VE SİMÜLASYON ADIMLARI BAŞARIYLA TAMAMLANDI!");
  console.log("===============================================================\n");
}

runDemoSimulation()
  .catch((e) => {
    console.error("Simülasyon Hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
