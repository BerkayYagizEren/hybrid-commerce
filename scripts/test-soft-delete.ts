import prisma from "../src/lib/prisma";
import { ProductService } from "../src/features/products/services/product.service";
import {
  createCategory,
  deleteCategory,
  getCategoriesTree,
  getAllCategories,
} from "../src/features/categories/actions/category.actions";
import {
  deleteProductAction,
  getVendorProductsList,
} from "../src/features/vendor/actions/vendor.actions";

async function runSoftDeleteTests() {
  console.log("=========================================================================");
  console.log("🗑️  ADIM 1: SOFT DELETE (YUMUŞAK SİLME) MEKANİZMASI DOĞRULAMA TESTİ");
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
    // 1. Brand Model Soft Delete Testi
    console.log("📌 1. Brand Modeli Soft Delete Doğrulaması");
    const testBrand = await prisma.brand.create({
      data: {
        name: `Test Brand ${Date.now()}`,
        slug: `test-brand-${Date.now()}`,
      },
    });
    assert(testBrand.isDeleted === false, "Yeni oluşturulan Brand varsayılan olarak isDeleted: false");

    await prisma.brand.update({
      where: { id: testBrand.id },
      data: { isDeleted: true },
    });
    const updatedBrand = await prisma.brand.findUnique({ where: { id: testBrand.id } });
    assert(updatedBrand?.isDeleted === true, "Brand kaydı isDeleted: true olarak güncellendi");

    // 2. Category Model Soft Delete Testi
    console.log("\n📌 2. Category Modeli Soft Delete ve Liste Filtresi");
    const catRes = await createCategory({
      name: `SoftDel Ana Kategori ${Date.now()}`,
      slug: `softdel-cat-${Date.now()}`,
    });
    assert(Boolean(catRes.success && catRes.category), "Test kategorisi oluşturuldu");
    const catId = catRes.category!.id;

    const subCatRes = await createCategory({
      name: `SoftDel Alt Kategori ${Date.now()}`,
      slug: `softdel-subcat-${Date.now()}`,
      parentId: catId,
    });
    assert(Boolean(subCatRes.success && subCatRes.category), "Test alt kategorisi oluşturuldu");
    const subCatId = subCatRes.category!.id;

    // Kategori ağacında görünüyor mu?
    let tree = await getCategoriesTree();
    assert(tree.some((c) => c.id === catId), "Silinmeden önce kategori getCategoriesTree içinde mevcut");

    // Soft delete işlemi
    const delCatRes = await deleteCategory(catId);
    assert(delCatRes.success, "deleteCategory başarıyla çalıştı");

    // Veritabanında fiziksel olarak duruyor mu, isDeleted: true mu?
    const dbCat = await prisma.category.findUnique({ where: { id: catId } });
    assert(dbCat !== null && dbCat.isDeleted === true, "Kategori veritabanından silinmedi, isDeleted: true yapıldı");
    const dbSubCat = await prisma.category.findUnique({ where: { id: subCatId } });
    assert(dbSubCat !== null && dbSubCat.isDeleted === true, "Alt kategori de yumuşak silindi (isDeleted: true)");

    // getCategoriesTree ve getAllCategories içinde görünmemeli
    tree = await getCategoriesTree();
    assert(!tree.some((c) => c.id === catId), "Yumuşak silinen ana kategori getCategoriesTree listesinde GÖRÜNMÜYOR");
    const allCats = await getAllCategories();
    assert(!allCats.some((c) => c.id === catId || c.id === subCatId), "Yumuşak silinen kategoriler getAllCategories listesinde GÖRÜNMÜYOR");

    // 3. Product Model Soft Delete Testi
    console.log("\n📌 3. Product Modeli Soft Delete ve Vitrin Filtresi");
    const testProduct = await prisma.product.create({
      data: {
        name: `Soft Delete Test Ürünü ${Date.now()}`,
        slug: `soft-del-product-${Date.now()}`,
        type: "SALE",
        salePrice: 1500,
        active: true,
      },
    });
    assert(testProduct.isDeleted === false, "Yeni oluşturulan Product varsayılan olarak isDeleted: false");

    // Listelemede görünüyor mu?
    let listRes = await ProductService.list({ search: testProduct.name });
    assert(listRes.products.some((p) => p.id === testProduct.id), "Silinmeden önce ProductService.list içinde ürün bulundu");

    let bySlug = await ProductService.getBySlug(testProduct.slug);
    assert(bySlug !== null && bySlug.id === testProduct.id, "Silinmeden önce ProductService.getBySlug ürünü getirdi");

    // Soft delete action'ı çalıştır
    const delProdRes = await deleteProductAction(testProduct.id);
    assert(delProdRes.success, "deleteProductAction başarıyla tamamlandı");

    // Veritabanında fiziksel olarak duruyor mu?
    const dbProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(dbProduct !== null && dbProduct.isDeleted === true, "Ürün veritabanında fiziksel olarak duruyor ve isDeleted: true");

    // ProductService ve Vendor listesinde GÖRÜNMEMELİ
    listRes = await ProductService.list({ search: testProduct.name });
    assert(!listRes.products.some((p) => p.id === testProduct.id), "Yumuşak silinen ürün ProductService.list içinde GÖRÜNMÜYOR");

    bySlug = await ProductService.getBySlug(testProduct.slug);
    assert(bySlug === null, "Yumuşak silinen ürün ProductService.getBySlug ile getirilmiyor (null)");

    const vendorProds = await getVendorProductsList();
    assert(!vendorProds.some((p) => p.id === testProduct.id), "Yumuşak silinen ürün getVendorProductsList içinde GÖRÜNMÜYOR");

    console.log("\n=========================================================================");
    console.log(`🎉 ADIM 1: SOFT DELETE TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("=========================================================================\n");
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSoftDeleteTests();
