import prisma from "../src/lib/prisma";
import {
  getCategoriesTree,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../src/features/categories/actions/category.actions";
import {
  createVendorProduct,
  updateVendorProduct,
  getVendorProductsList,
} from "../src/features/vendor/actions/vendor.actions";
import { ProductService } from "../src/features/products/services/product.service";

async function runCategoryAndMegaMenuTests() {
  console.log("===============================================================================");
  console.log("🚀 KATEGORİ YÖNETİMİ, MEGA MENÜ & SATICI EŞLEŞTİRME TEST SÜİTİ BAŞLATILIYOR");
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

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Veritabanı Hiyerarşi & Self-Relation Kontrolü
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 1: Veritabanı Modelleri & Self-Relation İlişkisi");

    const categoriesWithChildren = await prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
    });

    assert(categoriesWithChildren.length > 0, "Ana kategoriler (parentId: null) başarıyla listelendi");
    const categoryWithChild = categoriesWithChildren.find((c) => c.children.length > 0);
    assert(
      Boolean(categoryWithChild),
      `En az bir ana kategorinin alt kategorileri (children) mevcut: "${categoryWithChild?.name}" (${categoryWithChild?.children.length} alt kategori)`
    );

    // Ters yön kontrolü: Alt kategoriden parent ilişkisi
    const aChild = categoryWithChild!.children[0];
    const childWithParent = await prisma.category.findUnique({
      where: { id: aChild.id },
      include: { parent: true },
    });
    assert(
      childWithParent?.parent?.id === categoryWithChild!.id,
      `Alt kategoriden (${aChild.name}) üst kategoriye (${categoryWithChild!.name}) ters ilişki başarıyla doğrulandı`
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Admin Kategori CRUD Server Action Testleri
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 2: Admin Kategori Server Actions (CRUD)");

    // 2.1 createCategory (Ana Kategori)
    const testMainSlug = `test-ana-kat-${Date.now()}`;
    const createMainRes = await createCategory({
      name: "Test Ana Kategori",
      slug: testMainSlug,
      description: "Admin panel testi için geçici ana kategori",
    });
    assert(createMainRes.success && Boolean(createMainRes.category), "createCategory ana kategori başarıyla oluşturdu");
    const testMainId = createMainRes.category!.id;

    // 2.2 createCategory (Alt Kategori - parentId ile)
    const testSubSlug = `test-alt-kat-${Date.now()}`;
    const createSubRes = await createCategory({
      name: "Test Alt Kategori",
      slug: testSubSlug,
      description: "Admin panel testi için geçici alt kategori",
      parentId: testMainId,
    });
    assert(
      createSubRes.success && createSubRes.category?.parentId === testMainId,
      "createCategory alt kategoriyi parentId ile hiyerarşik bağlayarak oluşturdu"
    );
    const testSubId = createSubRes.category!.id;

    // 2.3 updateCategory
    const updateRes = await updateCategory({
      id: testSubId,
      name: "Test Alt Kategori (Güncellendi)",
      slug: `${testSubSlug}-revize`,
      description: "Açıklama güncellendi",
    });
    assert(
      updateRes.success && updateRes.category?.name === "Test Alt Kategori (Güncellendi)",
      "updateCategory kategori adını ve bilgilerini başarıyla güncelledi"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Satıcı Ürün Ekleme & Kategori/Alt Kategori Eşleştirmesi
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 3: Satıcı Ürün Oluşturma & Kategori Eşleştirmesi");

    // Test için aktif bir vendor bul veya oluştur
    let vendor = await prisma.user.findFirst({ where: { role: "VENDOR" } });
    if (!vendor) {
      vendor = await prisma.user.findFirst();
    }
    assert(Boolean(vendor), "Satıcı kullanıcısı doğrulandı");

    const uniqueSuffix = Date.now();
    const productPayload = {
      name: `Kategori Test Ürünü #${uniqueSuffix}`,
      description: "Kategori ve alt kategori eşleştirme testi için oluşturuldu",
      type: "BOTH" as const,
      images: [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80",
      ],
      salePrice: 4500,
      dailyPrice: 250,
      depositAmount: 1800,
      totalStock: 15,
      rentalStock: 5,
      categoryId: testMainId,
      subCategoryId: testSubId,
    };

    const vendorCreateRes = await createVendorProduct(productPayload);
    if (!vendorCreateRes.success) {
      console.error("createVendorProduct error:", vendorCreateRes.error);
    }
    assert(vendorCreateRes.success && Boolean(vendorCreateRes.product), "createVendorProduct ürünü başarıyla oluşturdu");
    const createdProductId = vendorCreateRes.product!.id;

    // Ürünün veritabanından categoryId ve subCategoryId ile geldiğini doğrula
    const productFromDb = await prisma.product.findUnique({
      where: { id: createdProductId },
      include: { category: true, subCategory: true },
    });

    assert(
      productFromDb?.categoryId === testMainId,
      `Ürün categoryId (${productFromDb?.categoryId}) ana kategori ID ile eşleşti: ${productFromDb?.category?.name}`
    );
    assert(
      productFromDb?.subCategoryId === testSubId,
      `Ürün subCategoryId (${productFromDb?.subCategoryId}) alt kategori ID ile eşleşti: ${productFromDb?.subCategory?.name}`
    );

    // Satıcı listesinde kategori adlarının döndüğünü doğrula
    const vendorProducts = await getVendorProductsList();
    const listedVendorProduct = vendorProducts.find((p) => p.id === createdProductId);
    assert(
      listedVendorProduct?.categoryName === "Test Ana Kategori" &&
        listedVendorProduct?.subCategoryName === "Test Alt Kategori (Güncellendi)",
      "Satıcı ürün tablosunda categoryName ve subCategoryName doğru görüntülendi"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Trendyol Mega Menü Veri Akışı & Ağaç Yapısı
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 4: Trendyol Mega Menü Ağaç Yapısı & getCategoriesTree");

    const categoryTree = await getCategoriesTree();
    assert(categoryTree.length > 0, "getCategoriesTree kategori ağacını döndürdü");

    const treeMainItem = categoryTree.find((c) => c.id === testMainId);
    assert(Boolean(treeMainItem), "Oluşturulan ana kategori Mega Menü ağacında mevcut");
    assert(
      Boolean(treeMainItem?.children?.some((sub) => sub.id === testSubId)),
      "Oluşturulan alt kategori Mega Menü ağacında doğru ana kategorinin 'children' dizisinde yer alıyor"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Kategori ve Alt Kategoriye Göre Ürün Filtreleme (ProductService.list)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 5: Ürün Sayfası Kategori & Alt Kategori Filtreleme");

    // 5.1 Alt Kategoriye göre filtreleme: /products?subcategory=...
    const subCategoryFilterResult = await ProductService.list({
      subCategorySlug: `${testSubSlug}-revize`,
    });
    assert(
      subCategoryFilterResult.products.some((p) => p.id === createdProductId),
      `subCategorySlug filtresi oluşturulan ürünü buldu (${subCategoryFilterResult.total} ürün)`
    );

    // 5.2 Ana Kategoriye göre filtreleme: /products?category=...
    const mainCategoryFilterResult = await ProductService.list({
      categorySlug: testMainSlug,
    });
    assert(
      mainCategoryFilterResult.products.some((p) => p.id === createdProductId),
      `categorySlug filtresi hiyerarşik eşleşmeyle alt kategorideki ürünü buldu (${mainCategoryFilterResult.total} ürün)`
    );

    // 5.3 Hem Kategori hem Alt Kategori ile filtreleme: /products?category=...&subcategory=...
    const dualFilterResult = await ProductService.list({
      categorySlug: testMainSlug,
      subCategorySlug: `${testSubSlug}-revize`,
    });
    assert(
      dualFilterResult.products.some((p) => p.id === createdProductId),
      `Dual filtre (category + subcategory) ürünü kusursuz getirdi`
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Güvenli Silme (Ürün Bağlantılarını Otomatik Çözme) & Temizlik
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 6: Güvenli Kategori Silme (Ürün Bağlantılarını Güvenle Çözme)");

    // Alt kategoriyi sil - Ürünün subCategoryId referansı otomatik olarak null'a çekilmeli
    const deleteSubRes = await deleteCategory(testSubId);
    assert(deleteSubRes.success, "Alt kategori silindi ve transaction ile bağlı referanslar temizlendi");

    const productAfterSubDelete = await prisma.product.findUnique({
      where: { id: createdProductId },
    });
    assert(
      productAfterSubDelete?.subCategoryId === null,
      "Silinen alt kategoriye bağlı ürünün subCategoryId alanı null yapılarak ürün silinmeden korundu"
    );

    // Ana kategoriyi sil - Ürünün categoryId referansı da null'a çekilmeli
    const deleteMainRes = await deleteCategory(testMainId);
    assert(deleteMainRes.success, "Ana kategori silindi ve bağlı referanslar temizlendi");

    const productAfterMainDelete = await prisma.product.findUnique({
      where: { id: createdProductId },
    });
    assert(
      productAfterMainDelete?.categoryId === null,
      "Silinen ana kategoriye bağlı ürünün categoryId alanı null yapıldı"
    );

    // Test ürününü tamamen temizle
    await prisma.product.delete({ where: { id: createdProductId } });

    console.log("\n===============================================================================");
    console.log(`🎉 TÜM TESTLER BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("❌ Test sırasında kritik hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCategoryAndMegaMenuTests();
