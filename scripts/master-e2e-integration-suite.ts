import prisma from "../src/lib/prisma";
import { ProductService } from "../src/features/products/services/product.service";
import { serializeProduct, toNumber, type SerializedProduct } from "../src/features/products/types";
import { Prisma } from "@prisma/client";
import { getCategoriesTree, getAllCategories, createCategory, updateCategory, deleteCategory } from "../src/features/categories/actions/category.actions";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";
import { CartService } from "../src/features/cart/services/cart.service";
import { requestRentalReturn, approveRentalReturn } from "../src/features/rental/actions/rental.actions";
import {
  createReview,
  approveReview,
  rejectReview,
  deleteReview,
  getProductReviews,
  getAdminReviews,
  checkVerifiedBuyer,
} from "../src/features/reviews/actions/review.actions";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-token";
import { addDays } from "date-fns";
import fs from "fs";
import path from "path";

interface StepMetric {
  id: string;
  scenario: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const metrics: StepMetric[] = [];
let passedCount = 0;
let failedCount = 0;

function assert(scenario: string, id: string, name: string, condition: boolean, expected: string, actual: string) {
  metrics.push({ id, scenario, name, passed: condition, expected, actual });
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${id} - ${name}`);
    console.log(`     └─ Beklenen: ${expected} | Gerçekleşen: ${actual}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${id} - ${name}`);
    console.error(`     └─ Beklenen: ${expected} | Gerçekleşen: ${actual}`);
    throw new Error(`Master test failed at ${id}: ${name} (Expected: ${expected}, Actual: ${actual})`);
  }
}

function isDecimalInstance(val: unknown): boolean {
  if (!val || typeof val !== "object") return false;
  if (val instanceof Prisma.Decimal) return true;
  const obj = val as Record<string, unknown>;
  return "d" in obj && "e" in obj && "s" in obj && typeof obj.toNumber === "function";
}

async function runMasterE2EIntegrationSuite() {
  const startTime = Date.now();
  console.log("=========================================================================================");
  console.log("🚀 HİBRİT E-TİCARET PLATFORMU — KAPSAMLI MASTER E2E ENTEGRASYON VE OTOMASYON TESTİ");
  console.log("=========================================================================================\n");

  const BASE_URL = "http://localhost:3000";

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // MODÜL 1: PRISMA & VERİ SERİLEŞTİRME TESTİ (DECIMAL -> NUMBER)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📌 MODÜL 1: Prisma & Veri Serileştirme Testi (Decimal -> Plain Number)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1.1 toNumber helper
    const testDecimal = new Prisma.Decimal("1250.75");
    const convertedNumber = toNumber(testDecimal);
    assert(
      "MODÜL 1",
      "1.1",
      "toNumber() Prisma.Decimal'ı saf JavaScript number'a dönüştürmeli",
      typeof convertedNumber === "number" && convertedNumber === 1250.75,
      "typeof number ve 1250.75",
      `typeof ${typeof convertedNumber} ve ${convertedNumber}`
    );

    // 1.2 serializeProduct on mock product
    const mockProduct = {
      id: "prod-mock-dec-01",
      name: "Mock Dağ Bisikleti",
      slug: "mock-dag-bisikleti",
      description: "Profesyonel bisiklet",
      images: ["https://example.com/bike.jpg"],
      type: "BOTH" as const,
      salePrice: new Prisma.Decimal("18500.00"),
      active: true,
      categoryId: null,
      subCategoryId: null,
      vendorId: null,
      averageRating: 4.8,
      reviewCount: 9,
      rentalPricing: {
        id: "rp-mock-01",
        productId: "prod-mock-dec-01",
        dailyPrice: new Prisma.Decimal("350.00"),
        weeklyPrice: new Prisma.Decimal("2000.00"),
        monthlyPrice: new Prisma.Decimal("7500.00"),
        depositAmount: new Prisma.Decimal("1500.00"),
        minDays: 1,
        maxDays: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const serializedMock = serializeProduct(mockProduct);
    assert(
      "MODÜL 1",
      "1.2",
      "serializeProduct tüm Decimal alanları number tipine dönüştürmeli (0 Decimal kalmalı)",
      typeof serializedMock.salePrice === "number" &&
        typeof serializedMock.rentalPricing?.dailyPrice === "number" &&
        typeof serializedMock.rentalPricing?.depositAmount === "number" &&
        !isDecimalInstance(serializedMock.salePrice) &&
        !isDecimalInstance(serializedMock.rentalPricing?.dailyPrice),
      "salePrice, dailyPrice ve depositAmount saf number (0 Decimal)",
      `salePrice: ${typeof serializedMock.salePrice}, dailyPrice: ${typeof serializedMock.rentalPricing?.dailyPrice}`
    );

    // 1.3 ProductService.list ile veritabanından dönen ürünlerin kontrolü
    const listResult = await ProductService.list({ limit: 50 });
    assert(
      "MODÜL 1",
      "1.3",
      "ProductService.list veritabanından ürünleri getirmeli",
      listResult.products.length > 0,
      "> 0 ürün",
      `${listResult.products.length} ürün listelendi`
    );

    let decimalFoundInDbProducts = false;
    for (const p of listResult.products) {
      if (p.salePrice !== null && (typeof p.salePrice !== "number" || isDecimalInstance(p.salePrice))) {
        decimalFoundInDbProducts = true;
      }
      if (p.rentalPricing) {
        if (typeof p.rentalPricing.dailyPrice !== "number" || isDecimalInstance(p.rentalPricing.dailyPrice)) {
          decimalFoundInDbProducts = true;
        }
        if (typeof p.rentalPricing.depositAmount !== "number" || isDecimalInstance(p.rentalPricing.depositAmount)) {
          decimalFoundInDbProducts = true;
        }
      }
    }
    assert(
      "MODÜL 1",
      "1.4",
      "ProductService.list sorgusundaki tüm ürünlerde 0 Decimal nesnesi bulunmalı",
      !decimalFoundInDbProducts,
      "Tüm ürünlerde 0 Decimal (Saf number)",
      decimalFoundInDbProducts ? "Decimal nesnesi saptandı!" : "Tüm fiyatlar ve depozitolar saf number"
    );

    // 1.4 API JSON ve RSC Uyum Kontrolü
    const apiRes = await fetch(`${BASE_URL}/api/products`);
    const apiJson = await apiRes.json();
    assert(
      "MODÜL 1",
      "1.5",
      "/api/products JSON yanıtında fiyatlar string veya Decimal değil number olmalı",
      apiRes.status === 200 && Array.isArray(apiJson.products),
      "HTTP 200 ve JSON array",
      `HTTP ${apiRes.status}, ${apiJson.products?.length} ürün`
    );

    // ═════════════════════════════════════════════════════════════════════════
    // MODÜL 2: NAVBAR, ARAMA VE MEGA KATEGORİ MENÜSÜ TESTİ
    // ═════════════════════════════════════════════════════════════════════════
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📌 MODÜL 2: Navbar, Arama ve Mega Kategori Menüsü Testi");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 2.1 İki Katmanlı Header HTML Elemanları
    const homeHtml = await (await fetch(`${BASE_URL}/`)).text();

    assert(
      "MODÜL 2",
      "2.1",
      "Üst satır: Logo, arama çubuğu ve sepet butonu bulunmalı",
      homeHtml.includes("Hybrid") &&
        homeHtml.includes("Commerce") &&
        homeHtml.includes('placeholder="Ürün, kategori veya marka ara..."') &&
        homeHtml.includes('href="/cart"'),
      "Logo, Arama Input ve Sepet Linki mevcut",
      "Üst satır temel bileşenleri HTML içerisinde doğrulandı"
    );

    assert(
      "MODÜL 2",
      "2.2",
      "Alt satır: Navigasyon linkleri ve 'Kategoriler' butonu bulunmalı",
      homeHtml.includes("Kategoriler") &&
        homeHtml.includes('href="/products"') &&
        homeHtml.includes('href="/products?type=SALE"') &&
        homeHtml.includes('href="/products?type=RENTAL"'),
      "Kategoriler butonu ve tip filtre linkleri mevcut",
      "Alt satır navigasyon linkleri HTML içerisinde doğrulandı"
    );

    // 2.3 Mega Menü Ağaç Yapısı
    const categoryTree = await getCategoriesTree();
    assert(
      "MODÜL 2",
      "2.3",
      "getCategoriesTree ana kategorileri ve ilişkili alt kategorilerini döndürmeli",
      categoryTree.length > 0 && categoryTree.some((c) => c.children && c.children.length > 0),
      "Ana kategoriler ve children dizileri dolu",
      `${categoryTree.length} ana kategori, en az birinin alt kategorileri mevcut`
    );

    // 2.4 Arama Filtreleme Testi (Case-Insensitive)
    const searchRes = await fetch(`${BASE_URL}/products?q=kamp`);
    assert(
      "MODÜL 2",
      "2.4",
      "/products?q=kamp arama sorgusu HTTP 200 dönmeli ve eşleşen ürünleri listelemeli",
      searchRes.status === 200,
      "HTTP 200 OK",
      `HTTP ${searchRes.status}`
    );

    const searchPrisma = await ProductService.list({ search: "çadır" });
    assert(
      "MODÜL 2",
      "2.5",
      "Arama çubuğu sorgusu veritabanında ad ve açıklamalarda Türkçe karakter duyarlı eşleşmeli",
      searchPrisma.products.length > 0,
      "> 0 eşleşen ürün",
      `${searchPrisma.products.length} ürün eşleşti (Örnek: "${searchPrisma.products[0]?.name}")`
    );

    // ═════════════════════════════════════════════════════════════════════════
    // MODÜL 3: ADMİN KATEGORİ YÖNETİMİ (CRUD) VE SENKRONİZASYON TESTİ
    // ═════════════════════════════════════════════════════════════════════════
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📌 MODÜL 3: Admin Kategori Yönetimi (CRUD) ve Senkronizasyon Testi");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const uniqueSuffix = Date.now().toString().slice(-6);

    // 3.1 Ana Kategori Oluşturma
    const mainCatResult = await createCategory({
      name: `Master Test Ana Kategori ${uniqueSuffix}`,
      slug: `master-test-ana-${uniqueSuffix}`,
      description: "Master E2E Test için oluşturulan ana kategori",
    });

    assert(
      "MODÜL 3",
      "3.1",
      "createCategory ana kategori oluşturabilmeli",
      mainCatResult.success && Boolean(mainCatResult.category?.id),
      "success: true ve kategori ID üretildi",
      `success: ${mainCatResult.success}, ID: ${mainCatResult.category?.id}`
    );

    const mainCatId = mainCatResult.category!.id;

    // 3.2 Alt Kategori Oluşturma (Parent İlişkisi)
    const subCatResult = await createCategory({
      name: `Master Test Alt Kategori ${uniqueSuffix}`,
      slug: `master-test-alt-${uniqueSuffix}`,
      parentId: mainCatId,
      description: "Ana kategoriye bağlı alt kategori",
    });

    assert(
      "MODÜL 3",
      "3.2",
      "createCategory alt kategoriyi parentId ile hiyerarşik bağlayarak oluşturmalı",
      subCatResult.success && subCatResult.category?.parentId === mainCatId,
      `parentId: ${mainCatId}`,
      `parentId: ${subCatResult.category?.parentId}`
    );

    const subCatId = subCatResult.category!.id;

    // 3.3 Kategori Güncelleme
    const updateResult = await updateCategory({
      id: subCatId,
      name: `Master Test Alt Kategori (Güncellendi) ${uniqueSuffix}`,
      description: "Güncellenmiş alt kategori açıklaması",
    });

    assert(
      "MODÜL 3",
      "3.3",
      "updateCategory kategori bilgilerini başarıyla güncellemeli",
      Boolean(updateResult.success && updateResult.category?.name.includes("Güncellendi")),
      "İsimde '(Güncellendi)' ibaresi mevcut",
      `Güncellenen isim: "${updateResult.category?.name}"`
    );

    // 3.4 Senkronizasyon: Mega Menü ve Dropdown Listesinde Anlık Görünme
    const updatedTree = await getCategoriesTree();
    const treeHasMain = updatedTree.some((c) => c.id === mainCatId);
    const treeHasSub = updatedTree
      .find((c) => c.id === mainCatId)
      ?.children?.some((sub) => sub.id === subCatId);

    assert(
      "MODÜL 3",
      "3.4",
      "Oluşturulan ana ve alt kategori getCategoriesTree Mega Menü ağacında anında yer almalı",
      treeHasMain && Boolean(treeHasSub),
      "Ana ve alt kategori Mega Menü hiyerarşisinde mevcut",
      `Ana kategori: ${treeHasMain}, Alt kategori: ${Boolean(treeHasSub)}`
    );

    const allCats = await getAllCategories();
    const dropdownHasSub = allCats.some((c) => c.id === subCatId);
    assert(
      "MODÜL 3",
      "3.5",
      "getAllCategories düz listesinde yeni kategori satıcı dropdown'ları için listelenmeli",
      dropdownHasSub,
      "Dropdown listesinde mevcut: true",
      `Dropdown listesinde mevcut: ${dropdownHasSub}`
    );

    // 3.5 Temizlik ve Güvenli Silme (Delete)
    const deleteSubRes = await deleteCategory(subCatId);
    const deleteMainRes = await deleteCategory(mainCatId);
    assert(
      "MODÜL 3",
      "3.6",
      "deleteCategory alt ve ana kategoriyi güvenle silebilmeli",
      deleteSubRes.success && deleteMainRes.success,
      "success: true (her ikisi için)",
      `Sub delete: ${deleteSubRes.success}, Main delete: ${deleteMainRes.success}`
    );

    // ═════════════════════════════════════════════════════════════════════════
    // MODÜL 4: ÖDEME, KİRALAMA VE DEPOZİTO ESCROW TESTİ
    // ═════════════════════════════════════════════════════════════════════════
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📌 MODÜL 4: Ödeme, Kiralama ve Depozito Escrow Blokaj / İade Testi");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 4.1 Test Müşterisi ve Sepet Hazırlığı
    const testCustomer = await prisma.user.upsert({
      where: { email: "master.test.customer@hybridcommerce.dev" },
      update: { role: "CUSTOMER" },
      create: {
        name: "Master Test Müşterisi",
        email: "master.test.customer@hybridcommerce.dev",
        password: "hashed_test_password_123",
        role: "CUSTOMER",
      },
    });

    const testVendor = await prisma.user.upsert({
      where: { email: "master.test.vendor@hybridcommerce.dev" },
      update: { role: "VENDOR" },
      create: {
        name: "Master Test Mağazası",
        email: "master.test.vendor@hybridcommerce.dev",
        password: "hashed_test_password_123",
        role: "VENDOR",
      },
    });

    // Önceki testlerden kalan kilitleri ve test siparişlerini temizle (İdempotent hazırlık)
    await prisma.rentalAvailability.deleteMany({
      where: { product: { slug: "master-test-rental-camera-lens" } },
    });
    await prisma.escrowTransaction.deleteMany({
      where: { rental: { product: { slug: "master-test-rental-camera-lens" } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: testCustomer.id } },
    });
    await prisma.rental.deleteMany({
      where: { userId: testCustomer.id },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId: testCustomer.id } },
    });
    await prisma.order.deleteMany({
      where: { userId: testCustomer.id },
    });

    // Satış Ürünü
    const saleProd = await prisma.product.upsert({
      where: { slug: "master-test-sale-headphone" },
      update: {
        salePrice: new Prisma.Decimal(2500),
        inventory: {
          upsert: {
            create: { totalStock: 30, reservedStock: 0, rentalQuantity: 0 },
            update: { totalStock: 30, reservedStock: 0 },
          },
        },
      },
      create: {
        name: "Master Test Bluetooth Kulaklık",
        slug: "master-test-sale-headphone",
        description: "Yüksek ses kaliteli kulaklık",
        images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80"],
        type: "SALE",
        salePrice: new Prisma.Decimal(2500),
        vendorId: testVendor.id,
        inventory: { create: { totalStock: 30, reservedStock: 0, rentalQuantity: 0 } },
      },
    });

    // Kiralık Ürün (Depozitolu)
    const rentalProd = await prisma.product.upsert({
      where: { slug: "master-test-rental-camera-lens" },
      update: {
        inventory: {
          upsert: {
            create: { totalStock: 10, reservedStock: 0, rentalQuantity: 10 },
            update: { totalStock: 10, reservedStock: 0, rentalQuantity: 10 },
          },
        },
        rentalPricing: {
          upsert: {
            create: { dailyPrice: new Prisma.Decimal(300), depositAmount: new Prisma.Decimal(2000) },
            update: { dailyPrice: new Prisma.Decimal(300), depositAmount: new Prisma.Decimal(2000) },
          },
        },
      },
      create: {
        name: "Master Test Sinema Lensi",
        slug: "master-test-rental-camera-lens",
        description: "Profesyonel 50mm f/1.2 lens",
        images: ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=400&q=80"],
        type: "RENTAL",
        vendorId: testVendor.id,
        inventory: { create: { totalStock: 10, reservedStock: 0, rentalQuantity: 10 } },
        rentalPricing: {
          create: {
            dailyPrice: new Prisma.Decimal(300),
            depositAmount: new Prisma.Decimal(2000),
            minDays: 1,
            maxDays: 30,
          },
        },
      },
    });

    // Müşteri Sepetini Temizle ve Hazırla
    await prisma.cart.deleteMany({ where: { userId: testCustomer.id } });
    const cart = await CartService.getOrCreateCart(testCustomer.id);

    // Satış ürünü ekle (1 Adet x ₺2500)
    await CartService.addItem(cart.id, {
      productId: saleProd.id,
      quantity: 1,
      type: "SALE",
    });

    // Kiralık ürün ekle (3 Gün x ₺300 = ₺900 + ₺2000 Depozito)
    const rentalStart = addDays(new Date(), 10);
    const rentalEnd = addDays(rentalStart, 3);
    await CartService.addItem(cart.id, {
      productId: rentalProd.id,
      quantity: 1,
      type: "RENTAL",
      rentalStart: rentalStart.toISOString(),
      rentalEnd: rentalEnd.toISOString(),
    });

    const summary = await CartService.getSummary(cart.id);
    // Beklenen: Satış (₺2500) + Kiralama (₺900) = ₺3400 ürün bedeli; Depozito = ₺2000; Genel Toplam = ₺5400
    assert(
      "MODÜL 4",
      "4.1",
      "Sepet özeti: Satış + Kiralama ve Depozito tutarını kuruşu kuruşuna doğru hesaplamalı",
      summary.saleSubtotal === 2500 &&
        summary.rentalSubtotal === 900 &&
        summary.totalDeposit === 2000 &&
        summary.grandTotal === 5400,
      "Satış: ₺2500, Kiralama: ₺900, Depozito: ₺2000, Toplam: ₺5400",
      `Satış: ₺${summary.saleSubtotal}, Kiralama: ₺${summary.rentalSubtotal}, Depozito: ₺${summary.totalDeposit}, Toplam: ₺${summary.grandTotal}`
    );

    // 4.2 Checkout ve Başarılı Ödeme (PAID)
    const checkoutResult = await CheckoutService.process({
      userId: testCustomer.id,
      cartId: cart.id,
      paymentCard: {
        cardHolder: "Master Test Müşterisi",
        cardNumber: "4242 4242 4242 4242",
        expireMonth: "12",
        expireYear: "2028",
        cvc: "123",
      },
    });

    assert(
      "MODÜL 4",
      "4.2",
      "CheckoutService.process geçerli test kartıyla siparişi başarıyla oluşturmalı",
      checkoutResult.success && Boolean(checkoutResult.orderId),
      "success: true ve orderId tanımlı",
      `success: ${checkoutResult.success}, OrderId: ${checkoutResult.orderId}`
    );

    const order = await prisma.order.findUnique({
      where: { id: checkoutResult.orderId! },
      include: {
        items: true,
        payments: { include: { escrows: true } },
      },
    });

    assert(
      "MODÜL 4",
      "4.3",
      "Veritabanında sipariş durumu 'PAID' ve ödeme kaydı 'SUCCEEDED' olmalı",
      order?.status === "PAID" && order?.payments[0]?.status === "SUCCEEDED",
      "Order status: PAID, Payment status: SUCCEEDED",
      `Order status: ${order?.status}, Payment status: ${order?.payments[0]?.status}`
    );

    // 4.3 Escrow Blokaj Durumu (HELD)
    const escrowTx = order?.payments[0]?.escrows[0];
    assert(
      "MODÜL 4",
      "4.4",
      "Kiralama depozitosu için EscrowTransaction kaydı 'HELD' (Bloke/Provizyon) durumunda saklanmalı",
      Boolean(escrowTx) && escrowTx?.status === "HELD" && Number(escrowTx?.depositAmount) === 2000,
      "Escrow status: HELD, amount: ₺2000",
      `Escrow status: ${escrowTx?.status}, amount: ₺${escrowTx?.depositAmount}`
    );

    // 4.4 OrderItem Snapshot Veri Bütünlüğü
    const saleItem = order?.items.find((i) => i.productId === saleProd.id);
    assert(
      "MODÜL 4",
      "4.5",
      "OrderItem snapshot alanları (productName, productImage, priceAtPurchase) veritabanına kilitlenmeli",
      saleItem?.productName === saleProd.name && Number(saleItem?.priceAtPurchase) === 2500,
      `Snapshot Adı: "${saleProd.name}", Fiyat: ₺2500`,
      `Snapshot Adı: "${saleItem?.productName}", Fiyat: ₺${saleItem?.priceAtPurchase}`
    );

    // 4.5 İade Talebi ve Depozito Çözme (approveRentalReturn -> RELEASED)
    const rentalItem = order?.items.find((i) => i.type === "RENTAL");
    const testRentalId = rentalItem?.rentalId;
    assert(
      "MODÜL 4",
      "4.6",
      "Siparişe bağlı Rental kaydı oluşmuş olmalı",
      Boolean(testRentalId),
      "Rental kaydı mevcut",
      `Rental ID: ${testRentalId}`
    );

    // Müşteri İade Talebi Başlatır
    await requestRentalReturn(testRentalId!);

    // Satıcı / Admin İadeyi Onaylar (Depozito kartına iade edilir)
    const approveResult = await approveRentalReturn(testRentalId!);
    assert(
      "MODÜL 4",
      "4.7",
      "approveRentalReturn iadeyi onaylayarak releaseTxId dekontu üretmeli",
      approveResult.success && Boolean(approveResult.releaseTxId),
      "success: true ve releaseTxId tanımlı",
      `success: ${approveResult.success}, releaseTxId: ${approveResult.releaseTxId}`
    );

    // EscrowTransaction 'RELEASED' ve Rental 'RETURNED' doğrulaması
    const updatedEscrow = await prisma.escrowTransaction.findUnique({
      where: { rentalId: testRentalId! },
    });
    const updatedRental = await prisma.rental.findUnique({
      where: { id: testRentalId! },
    });

    assert(
      "MODÜL 4",
      "4.8",
      "Veritabanında EscrowTransaction 'RELEASED' ve Rental 'RETURNED' olarak güncellenmeli",
      updatedEscrow?.status === "RELEASED" &&
        Boolean(updatedEscrow?.releasedAt) &&
        updatedRental?.status === "RETURNED",
      "Escrow status: RELEASED, Rental status: RETURNED",
      `Escrow: ${updatedEscrow?.status}, Rental: ${updatedRental?.status}`
    );

    // ═════════════════════════════════════════════════════════════════════════
    // MODÜL 5: ÜRÜN PUANLAMA, YORUM VE MODERASYON TESTİ
    // ═════════════════════════════════════════════════════════════════════════
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📌 MODÜL 5: Ürün Puanlama, Yorum, Doğrulanmış Alıcı & Moderasyon Testi");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 5.1 Doğrulanmamış Kullanıcı Engeli (Verified Buyer Barrier)
    const nonBuyerUser = await prisma.user.upsert({
      where: { email: "nonbuyer.user@hybridcommerce.dev" },
      update: {},
      create: {
        name: "Satın Almamış Ziyaretçi",
        email: "nonbuyer.user@hybridcommerce.dev",
        password: "hashed_test_password_123",
        role: "CUSTOMER",
      },
    });

    const isVerifiedNonBuyer = await checkVerifiedBuyer(nonBuyerUser.id, saleProd.id);
    assert(
      "MODÜL 5",
      "5.1",
      "Satın almamış kullanıcı için checkVerifiedBuyer false dönmeli",
      !isVerifiedNonBuyer,
      "checkVerifiedBuyer: false",
      `checkVerifiedBuyer: ${isVerifiedNonBuyer}`
    );

    const nonBuyerReviewAttempt = await createReview(
      {
        productId: saleProd.id,
        rating: 5,
        comment: "Bu ürünü almadım ama bence harika bir kulaklığa benziyor!",
      },
      nonBuyerUser.id
    );

    assert(
      "MODÜL 5",
      "5.2",
      "Satın almamış müşterinin yorum yazması güvenlik filtresine takılmalı",
      Boolean(!nonBuyerReviewAttempt.success && nonBuyerReviewAttempt.error?.includes("doğrulanmış müşteriler")),
      "success: false ve 'doğrulanmış müşteriler' hatası",
      `success: ${nonBuyerReviewAttempt.success}, error: "${nonBuyerReviewAttempt.error}"`
    );

    // 5.2 Doğrulanmış Müşteri Yorumu (Verified Buyer)
    const isVerifiedCustomer = await checkVerifiedBuyer(testCustomer.id, saleProd.id);
    assert(
      "MODÜL 5",
      "5.3",
      "Siparişi PAID olan test müşterisi için checkVerifiedBuyer true dönmeli",
      isVerifiedCustomer,
      "checkVerifiedBuyer: true (Verified Buyer Onaylandı)",
      `checkVerifiedBuyer: ${isVerifiedCustomer}`
    );

    // Yorum Oluşturma (İlk Durum: PENDING)
    const reviewResult = await createReview(
      {
        productId: saleProd.id,
        rating: 5,
        comment: "Ses kalitesi ve gürültü engellemesi kesinlikle harika, tavsiye ederim!",
      },
      testCustomer.id
    );

    assert(
      "MODÜL 5",
      "5.4",
      "Doğrulanmış müşteri yorumu isVerified: true ve status: PENDING olarak kaydedilmeli",
      reviewResult.success &&
        reviewResult.review?.isVerified === true &&
        reviewResult.review?.status === "PENDING",
      "isVerified: true, status: PENDING",
      `isVerified: ${reviewResult.review?.isVerified}, status: ${reviewResult.review?.status}`
    );

    const createdReviewId = reviewResult.review!.id;

    // 5.3 Admin Moderasyonu: Yorumu Onaylama (Approve)
    const approveReviewResult = await approveReview(createdReviewId, "Yorum kurallara uygun.");
    assert(
      "MODÜL 5",
      "5.5",
      "approveReview yorumu onaylayabilmeli (status: APPROVED)",
      approveReviewResult.success,
      "success: true",
      `success: ${approveReviewResult.success}`
    );

    // 5.4 Ürün Kartı ve Detay Sayfası için Ortalama Puan & Yorum Sayısı Güncellemesi
    const updatedSaleProd = await ProductService.getBySlug(saleProd.slug);
    assert(
      "MODÜL 5",
      "5.6",
      "Onaylanan yorum sonrası ürünün averageRating ve reviewCount değerleri güncellenmeli",
      updatedSaleProd?.reviewCount === 1 && updatedSaleProd?.averageRating === 5,
      "reviewCount: 1, averageRating: 5 ⭐",
      `reviewCount: ${updatedSaleProd?.reviewCount}, averageRating: ${updatedSaleProd?.averageRating} ⭐`
    );

    // 5.5 Müşteri Vitrininde Yorumun Görünmesi & İstatistikler
    const publicReviews = await getProductReviews(saleProd.id);
    assert(
      "MODÜL 5",
      "5.7",
      "getProductReviews onaylanan yorumu ve 5 yıldız istatistiğini vitrinde göstermeli",
      publicReviews.reviews.length === 1 &&
        publicReviews.stats.averageRating === 5 &&
        publicReviews.stats.totalReviews === 1,
      "1 onaylı yorum, ortalama 5 ⭐",
      `${publicReviews.reviews.length} yorum, Ortalama: ${publicReviews.stats.averageRating} ⭐`
    );

    // 5.6 Admin Moderasyonu: Yorumu Reddetme (Reject) ve Puan Düşüşü
    const rejectReviewResult = await rejectReview(createdReviewId, "Uygunsuz içerik.");
    assert(
      "MODÜL 5",
      "5.8",
      "rejectReview yorumu reddedebilmeli (status: REJECTED)",
      rejectReviewResult.success,
      "success: true",
      `success: ${rejectReviewResult.success}`
    );

    const afterRejectProd = await ProductService.getBySlug(saleProd.slug);
    assert(
      "MODÜL 5",
      "5.9",
      "Reddedilen yorum vitrinden ve ortalama puandan güvenle düşürülmeli",
      afterRejectProd?.reviewCount === 0 && afterRejectProd?.averageRating === 0,
      "reviewCount: 0, averageRating: 0",
      `reviewCount: ${afterRejectProd?.reviewCount}, averageRating: ${afterRejectProd?.averageRating}`
    );

    // Temizlik: Yorumu Sil
    await deleteReview(createdReviewId);

    // ═════════════════════════════════════════════════════════════════════════
    // ÖZET VE BİTİŞ RAPORU
    // ═════════════════════════════════════════════════════════════════════════
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n=========================================================================================");
    console.log(`🎉 TÜM UÇTAN UCA MASTER ENTEGRASYON VE OTOMASYON TESTLERİ BAŞARIYLA TAMAMLANDI!`);
    console.log(`📊 Toplam Test: ${metrics.length} | ✅ Başarılı: ${passedCount} | ❌ Başarısız: ${failedCount} | ⏱️ Süre: ${durationSec} sn`);
    console.log("=========================================================================================\n");

    return {
      success: true,
      total: metrics.length,
      passed: passedCount,
      failed: failedCount,
      durationSec,
      metrics,
    };
  } catch (error) {
    console.error("\n❌ MASTER TEST SÜİTİ BEKLENMEYEN BİR HATA İLE KARŞILAŞTI:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMasterE2EIntegrationSuite();
