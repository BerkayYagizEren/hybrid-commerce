import prisma from "../src/lib/prisma";
import {
  createCouponAction,
  validateCouponAction,
  deleteCouponAction,
} from "../src/features/coupons/actions/coupon.actions";

async function runCouponTests() {
  console.log("=========================================================================");
  console.log("🏷️  ADIM 3: İNDİRİM VE KUPON MOTORU (COUPON) DOĞRULAMA TESTİ");
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
    const codePercent = `YUZDE20_${timestamp}`;
    const codeFixed = `SABIT150_${timestamp}`;
    const codeExpired = `SURESIBTMIS_${timestamp}`;
    const codeInactive = `PASIF_${timestamp}`;

    // 1. Kupon Oluşturma Testleri
    console.log("📌 1. Farklı Tiplerde Kuponlar Oluşturma");
    const pRes = await createCouponAction({
      code: codePercent,
      discountType: "PERCENTAGE",
      discountValue: 20,
      minBasketAmount: 500,
    });
    assert(pRes.success && Boolean(pRes.coupon), "%20 Yüzdelik kupon başarıyla oluşturuldu");

    const fRes = await createCouponAction({
      code: codeFixed,
      discountType: "FIXED",
      discountValue: 150,
      minBasketAmount: 300,
    });
    assert(fRes.success && Boolean(fRes.coupon), "150 ₺ Sabit indirim kuponu oluşturuldu");

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const expRes = await createCouponAction({
      code: codeExpired,
      discountType: "FIXED",
      discountValue: 50,
      expiresAt: pastDate.toISOString(),
    });
    assert(expRes.success, "Süresi geçmiş test kuponu oluşturuldu");

    const inactRes = await createCouponAction({
      code: codeInactive,
      discountType: "PERCENTAGE",
      discountValue: 10,
      isActive: false,
    });
    assert(inactRes.success, "Pasif test kuponu oluşturuldu");

    // 2. Doğrulama ve İndirim Hesaplama
    console.log("\n📌 2. Başarılı Kupon İndirimi Hesaplama");
    // 1000 TL sepet, %20 indirim -> 200 TL indirim, 800 TL ödenecek
    const validPercent = await validateCouponAction(codePercent, 1000);
    assert(validPercent.valid === true, "%20 kuponu geçerli kabul edildi");
    assert(validPercent.discountAmount === 200, "İndirim tutarı doğru hesaplandı (200 ₺)");
    assert(validPercent.finalAmount === 800, "Nihai ödenecek tutar doğru hesaplandı (800 ₺)");

    // 1000 TL sepet, 150 TL sabit indirim -> 150 TL indirim, 850 TL ödenecek
    const validFixed = await validateCouponAction(codeFixed, 1000);
    assert(validFixed.valid === true, "150 ₺ sabit kupon geçerli kabul edildi");
    assert(validFixed.discountAmount === 150, "Sabit indirim tutarı doğru uygulandı (150 ₺)");
    assert(validFixed.finalAmount === 850, "Nihai ödenecek tutar doğru hesaplandı (850 ₺)");

    // 3. Kısıtlama ve Hata Senaryoları
    console.log("\n📌 3. Alt Limit, Süre ve Pasiflik Kısıtlama Testleri");
    // Sepet 400 TL, minBasket 500 TL -> Hata vermeli
    const minBasketFail = await validateCouponAction(codePercent, 400);
    assert(minBasketFail.valid === false, "Minimum sepet tutarı sağlanmadığında kupon reddedildi");
    assert(Boolean(minBasketFail.error?.includes("en az ₺500")), "Doğru sepet alt limit hata mesajı döndürüldü");

    // Süresi geçmiş kupon -> Hata vermeli
    const expiredFail = await validateCouponAction(codeExpired, 1000);
    assert(expiredFail.valid === false, "Süresi geçmiş kupon reddedildi");
    assert(Boolean(expiredFail.error?.includes("süresi dolmuştur")), "Süre dolma hata mesajı doğru");

    // Pasif kupon -> Hata vermeli
    const inactiveFail = await validateCouponAction(codeInactive, 1000);
    assert(inactiveFail.valid === false, "Pasif kupon reddedildi");
    assert(Boolean(inactiveFail.error?.includes("aktif değil")), "Pasif kupon hata mesajı doğru");

    // Olmayan kupon -> Hata vermeli
    const nonExistFail = await validateCouponAction("OLMAYANKOD_999", 1000);
    assert(nonExistFail.valid === false, "Olmayan kupon kodu reddedildi");

    // 4. Temizlik
    console.log("\n📌 4. Test Kuponlarının Temizlenmesi");
    if (pRes.coupon) await deleteCouponAction(pRes.coupon.id);
    if (fRes.coupon) await deleteCouponAction(fRes.coupon.id);
    if (expRes.coupon) await deleteCouponAction(expRes.coupon.id);
    if (inactRes.coupon) await deleteCouponAction(inactRes.coupon.id);
    assert(true, "Test kuponları başarıyla temizlendi");

    console.log("\n=========================================================================");
    console.log(`🎉 ADIM 3: İNDİRİM VE KUPON MOTORU TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("=========================================================================\n");
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCouponTests();
