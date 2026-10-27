import prisma from "../src/lib/prisma";
import {
  createMeasurement,
  getMeasurements,
  updateMeasurement,
  deleteMeasurement,
} from "../src/features/measurement/actions/measurement.actions";
import { createVendorProduct } from "../src/features/vendor/actions/vendor.actions";

async function runMeasurementTests() {
  console.log("=========================================================================");
  console.log("📐 ADIM 2: ÖLÇÜ BİRİMİ YÖNETİMİ (MEASUREMENT) DOĞRULAMA TESTİ");
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
    // 1. Ölçü Birimi Oluşturma
    console.log("📌 1. Yeni Ölçü Birimleri Ekleme");
    const uniqueSuffix = Date.now().toString().slice(-4);
    const mtrRes = await createMeasurement({
      name: "Metre",
      code: `MTR_${uniqueSuffix}`,
    });
    assert(mtrRes.success && Boolean(mtrRes.measurement), "Metre ölçü birimi başarıyla eklendi");
    const mtrId = mtrRes.measurement!.id;

    const adtRes = await createMeasurement({
      name: "Adet",
      code: `ADT_${uniqueSuffix}`,
    });
    assert(adtRes.success && Boolean(adtRes.measurement), "Adet ölçü birimi başarıyla eklendi");
    const adtId = adtRes.measurement!.id;

    // Çakışan kod denemesi
    const duplicateRes = await createMeasurement({
      name: "İkinci Metre",
      code: `MTR_${uniqueSuffix}`,
    });
    assert(!duplicateRes.success, "Aynı kodla mükerrer ölçü birimi eklenmesi engellendi");

    // 2. Listeleme
    console.log("\n📌 2. Ölçü Birimleri Listesi ve Ürün Sayacı");
    let list = await getMeasurements();
    assert(list.some((m) => m.id === mtrId), "Eklenen Metre birimi listede mevcut");
    assert(list.some((m) => m.id === adtId), "Eklenen Adet birimi listede mevcut");

    // 3. Güncelleme
    console.log("\n📌 3. Ölçü Birimi Güncelleme");
    const updateRes = await updateMeasurement(mtrId, {
      name: "Metrekare",
      code: `M2_${uniqueSuffix}`,
    });
    assert(updateRes.success && updateRes.measurement?.name === "Metrekare", "Ölçü birimi adı ve kodu güncellendi");

    // 4. Ürün ile İlişkilendirme
    console.log("\n📌 4. Ürün Oluştururken Ölçü Birimi Bağlama");
    const prodRes = await createVendorProduct({
      name: `Kumaş Ölçü Test Ürünü ${uniqueSuffix}`,
      type: "SALE",
      salePrice: 250,
      measurementId: mtrId,
    });
    assert(prodRes.success && Boolean(prodRes.product), "Ürün ölçü birimi ID ile oluşturuldu");

    const dbProduct = await prisma.product.findUnique({
      where: { id: prodRes.product!.id },
      include: { measurement: true },
    });
    assert(dbProduct?.measurementId === mtrId, "Veritabanındaki üründe measurementId doğru kaydedildi");
    assert(dbProduct?.measurement?.code === `M2_${uniqueSuffix}`, "Ürün üzerinden Measurement ilişkisi başarıyla sorgulandı");

    // 5. Silme ve Cascade Güvenliği
    console.log("\n📌 5. Ölçü Birimi Silme ve Ürün Referans Güvenliği");
    const delRes = await deleteMeasurement(mtrId);
    assert(delRes.success, "Ölçü birimi başarıyla silindi");

    const dbProdAfterDel = await prisma.product.findUnique({
      where: { id: prodRes.product!.id },
    });
    assert(dbProdAfterDel?.measurementId === null, "Ölçü birimi silindiğinde ürünün measurementId alanı null yapıldı (Veri bütünlüğü korundu)");

    const dbMeasAfterDel = await prisma.measurement.findUnique({
      where: { id: mtrId },
    });
    assert(dbMeasAfterDel === null, "Ölçü birimi veritabanından başarıyla temizlendi");

    // Temizlik: Adet birimini sil
    await deleteMeasurement(adtId);

    console.log("\n=========================================================================");
    console.log(`🎉 ADIM 2: ÖLÇÜ BİRİMİ YÖNETİMİ TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("=========================================================================\n");
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMeasurementTests();
