import prisma from "../src/lib/prisma";
import { ProductService } from "../src/features/products/services/product.service";
import { serializeProduct, toNumber, type SerializedProduct } from "../src/features/products/types";
import { Prisma } from "@prisma/client";

async function runDecimalSerializationTests() {
  console.log("===============================================================================");
  console.log("🔢 PRISMA DECIMAL -> NUMBER SERİLEŞTİRME VE CLIENT UYUMLULUK TESTİ");
  console.log("===============================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

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

  function isDecimalInstance(val: unknown): boolean {
    if (!val || typeof val !== "object") return false;
    // Prisma Decimal checks: instanceof Prisma.Decimal or internal decimal properties (d, e, s)
    if (val instanceof Prisma.Decimal) return true;
    const obj = val as Record<string, unknown>;
    if ("d" in obj && "e" in obj && "s" in obj && typeof obj.toNumber === "function") return true;
    return false;
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Helper Fonksiyonların Doğruluğu (toNumber)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 1: toNumber Yardımcı Fonksiyonunun Çevrim Doğruluğu");

    assert(toNumber(null) === null, "toNumber(null) -> null döner");
    assert(toNumber(undefined) === null, "toNumber(undefined) -> null döner");
    assert(toNumber(123.45) === 123.45, "toNumber(number) -> aynen number döner");
    assert(toNumber("456.78") === 456.78, "toNumber(string) -> number döner");

    const prismaDec = new Prisma.Decimal("999.99");
    assert(toNumber(prismaDec) === 999.99, "toNumber(Prisma.Decimal) -> number döner");
    assert(typeof toNumber(prismaDec) === "number", "Dönen değerin tipi kesinlikle 'number'");

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: serializeProduct ile Saf JavaScript Plain Obje Dönüşümü
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 2: serializeProduct ile Ham Decimal Objesinin Serileştirilmesi");

    const mockRawProduct = {
      id: "prod-test-dec-1",
      name: "Test Çadırı",
      slug: "test-cadiri",
      description: "Açıklama",
      images: ["https://example.com/image.jpg"],
      type: "BOTH" as const,
      salePrice: new Prisma.Decimal("1450.50"),
      active: true,
      categoryId: "cat-1",
      subCategoryId: "cat-sub-1",
      vendorId: "usr-1",
      averageRating: 4.6,
      reviewCount: 12,
      rentalPricing: {
        id: "rp-1",
        productId: "prod-test-dec-1",
        dailyPrice: new Prisma.Decimal("120.00"),
        weeklyPrice: new Prisma.Decimal("700.00"),
        monthlyPrice: new Prisma.Decimal("2500.00"),
        depositAmount: new Prisma.Decimal("500.00"),
        minDays: 2,
        maxDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      category: { id: "cat-1", name: "Outdoor", slug: "outdoor", description: null, parentId: null, createdAt: new Date(), updatedAt: new Date() },
      inventory: { id: "inv-1", productId: "prod-test-dec-1", totalStock: 10, reservedStock: 2, rentalQuantity: 5, createdAt: new Date(), updatedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const serialized: SerializedProduct = serializeProduct(mockRawProduct);

    // Tip ve değer kontrolleri
    assert(typeof serialized.salePrice === "number", `serialized.salePrice tipi number'dır: ${serialized.salePrice}`);
    assert(serialized.salePrice === 1450.5, `serialized.salePrice değeri 1450.5'tir`);
    assert(!isDecimalInstance(serialized.salePrice), "serialized.salePrice Prisma.Decimal nesnesi DEĞİLDİR");

    assert(Boolean(serialized.rentalPricing), "serialized.rentalPricing mevcuttur");
    assert(typeof serialized.rentalPricing?.dailyPrice === "number", `dailyPrice number'dır: ${serialized.rentalPricing?.dailyPrice}`);
    assert(serialized.rentalPricing?.dailyPrice === 120, "dailyPrice 120'dir");
    assert(!isDecimalInstance(serialized.rentalPricing?.dailyPrice), "dailyPrice Prisma.Decimal nesnesi DEĞİLDİR");

    assert(typeof serialized.rentalPricing?.weeklyPrice === "number", `weeklyPrice number'dır: ${serialized.rentalPricing?.weeklyPrice}`);
    assert(serialized.rentalPricing?.weeklyPrice === 700, "weeklyPrice 700'dür");

    assert(typeof serialized.rentalPricing?.monthlyPrice === "number", `monthlyPrice number'dır: ${serialized.rentalPricing?.monthlyPrice}`);
    assert(serialized.rentalPricing?.monthlyPrice === 2500, "monthlyPrice 2500'dür");

    assert(typeof serialized.rentalPricing?.depositAmount === "number", `depositAmount number'dır: ${serialized.rentalPricing?.depositAmount}`);
    assert(serialized.rentalPricing?.depositAmount === 500, "depositAmount 500'dür");
    assert(!isDecimalInstance(serialized.rentalPricing?.depositAmount), "depositAmount Prisma.Decimal nesnesi DEĞİLDİR");

    assert(typeof serialized.averageRating === "number", `averageRating number'dır: ${serialized.averageRating}`);
    assert(typeof serialized.reviewCount === "number", `reviewCount number'dır: ${serialized.reviewCount}`);

    // JSON.stringify uyumluluğu (Next.js RSC Serialization testi)
    const jsonStr = JSON.stringify(serialized);
    assert(jsonStr.includes('"salePrice":1450.5'), 'JSON çıktısında "salePrice":1450.5 doğrudan sayı olarak bulunur');
    assert(jsonStr.includes('"dailyPrice":120'), 'JSON çıktısında "dailyPrice":120 doğrudan sayı olarak bulunur');
    assert(jsonStr.includes('"depositAmount":500'), 'JSON çıktısında "depositAmount":500 doğrudan sayı olarak bulunur');
    assert(!jsonStr.includes('"d":['), 'JSON çıktısında Decimal.js dahili array/object özellikleri bulunmaz');

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: ProductService.list() ile Dönen Veritabanı Ürünlerinin Doğrulanması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 3: ProductService.list() Sonuçlarında 0 Decimal Nesnesi Garantisi");

    const listResult = await ProductService.list({ limit: 50 });
    assert(listResult.products.length > 0, `Veritabanından ${listResult.products.length} ürün listelendi`);

    let inspectedProductsCount = 0;
    let inspectedRentalCount = 0;
    let decimalFound = false;

    for (const p of listResult.products) {
      inspectedProductsCount++;

      // Satış fiyatı kontrolü
      if (p.salePrice !== null) {
        if (typeof p.salePrice !== "number" || isDecimalInstance(p.salePrice)) {
          decimalFound = true;
          throw new Error(`Ürün "${p.name}" (${p.id}) salePrice Decimal olarak bulundu!`);
        }
      }

      // Kiralama fiyatı kontrolleri
      if (p.rentalPricing) {
        inspectedRentalCount++;
        const rp = p.rentalPricing;

        if (typeof rp.dailyPrice !== "number" || isDecimalInstance(rp.dailyPrice)) {
          decimalFound = true;
          throw new Error(`Ürün "${p.name}" (${p.id}) dailyPrice Decimal olarak bulundu!`);
        }

        if (rp.weeklyPrice !== null && (typeof rp.weeklyPrice !== "number" || isDecimalInstance(rp.weeklyPrice))) {
          decimalFound = true;
          throw new Error(`Ürün "${p.name}" (${p.id}) weeklyPrice Decimal olarak bulundu!`);
        }

        if (rp.monthlyPrice !== null && (typeof rp.monthlyPrice !== "number" || isDecimalInstance(rp.monthlyPrice))) {
          decimalFound = true;
          throw new Error(`Ürün "${p.name}" (${p.id}) monthlyPrice Decimal olarak bulundu!`);
        }

        if (typeof rp.depositAmount !== "number" || isDecimalInstance(rp.depositAmount)) {
          decimalFound = true;
          throw new Error(`Ürün "${p.name}" (${p.id}) depositAmount Decimal olarak bulundu!`);
        }
      }

      // Ortalama puan kontrolü
      if (typeof p.averageRating !== "number" || isDecimalInstance(p.averageRating)) {
        decimalFound = true;
        throw new Error(`Ürün "${p.name}" (${p.id}) averageRating Decimal olarak bulundu!`);
      }
    }

    assert(!decimalFound, `Tüm ${inspectedProductsCount} üründe 0 adet Decimal nesnesi tespit edildi (Tümü saf number)`);
    assert(inspectedRentalCount > 0, `En az ${inspectedRentalCount} kiralık üründe günlük/depozito fiyatlarının number olduğu doğrulandı`);

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: ProductService.getBySlug() ve getById() Doğrulaması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 4: ProductService.getBySlug() ve getById() Serileştirme Kontrolü");

    const firstProduct = listResult.products[0];
    const productBySlug = await ProductService.getBySlug(firstProduct.slug);

    assert(Boolean(productBySlug), `getBySlug('${firstProduct.slug}') başarıyla ürün döndürdü`);
    assert(
      typeof productBySlug?.averageRating === "number" && !isDecimalInstance(productBySlug?.averageRating),
      "getBySlug ile dönen üründe averageRating saf number"
    );

    if (productBySlug?.salePrice !== null) {
      assert(
        typeof productBySlug?.salePrice === "number" && !isDecimalInstance(productBySlug?.salePrice),
        "getBySlug ile dönen üründe salePrice saf number"
      );
    }

    if (productBySlug?.rentalPricing) {
      assert(
        typeof productBySlug.rentalPricing.dailyPrice === "number" && !isDecimalInstance(productBySlug.rentalPricing.dailyPrice),
        "getBySlug ile dönen üründe dailyPrice saf number"
      );
      assert(
        typeof productBySlug.rentalPricing.depositAmount === "number" && !isDecimalInstance(productBySlug.rentalPricing.depositAmount),
        "getBySlug ile dönen üründe depositAmount saf number"
      );
    }

    const productById = await ProductService.getById(firstProduct.id);
    assert(Boolean(productById), `getById('${firstProduct.id}') başarıyla ürün döndürdü`);
    assert(
      typeof productById?.averageRating === "number" && !isDecimalInstance(productById?.averageRating),
      "getById ile dönen üründe averageRating saf number"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: HTTP /products Sayfası ve API Endpoint Yanıt Kontrolü
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 5: Canlı HTTP Endpoint'leri ve RSC Payload Uyum Doğrulaması");

    const pageRes = await fetch("http://localhost:3000/products");
    assert(pageRes.status === 200, `/products sayfası HTTP 200 OK yanıt verdi`);

    const apiRes = await fetch("http://localhost:3000/api/products");
    assert(apiRes.status === 200, `/api/products endpoint'i HTTP 200 OK yanıt verdi`);

    const apiData = await apiRes.json();
    assert(Array.isArray(apiData.products), "/api/products JSON 'products' dizisi içeriyor");

    const firstApiProduct = apiData.products[0];
    if (firstApiProduct.salePrice !== null) {
      assert(
        typeof firstApiProduct.salePrice === "number",
        `/api/products JSON cevabında salePrice number tipindedir (string/Decimal değildir: ${firstApiProduct.salePrice})`
      );
    }

    if (firstApiProduct.rentalPricing) {
      assert(
        typeof firstApiProduct.rentalPricing.dailyPrice === "number",
        `/api/products JSON cevabında dailyPrice number tipindedir (${firstApiProduct.rentalPricing.dailyPrice})`
      );
      assert(
        typeof firstApiProduct.rentalPricing.depositAmount === "number",
        `/api/products JSON cevabında depositAmount number tipindedir (${firstApiProduct.rentalPricing.depositAmount})`
      );
    }

    console.log("\n===============================================================================");
    console.log(`🎉 TÜM DECIMAL SERİLEŞTİRME TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("===============================================================================");
  } catch (error) {
    console.error("\n❌ TEST HATA İLE SONLANDI:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDecimalSerializationTests();
