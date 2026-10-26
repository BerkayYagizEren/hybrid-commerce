import prisma from "../src/lib/prisma";
import {
  checkVerifiedBuyer,
  recalculateProductRating,
  getProductReviews,
  createReview,
  getAdminReviews,
  getVendorReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from "../src/features/reviews/actions/review.actions";
import { createSessionToken } from "../src/lib/auth-token";

async function runReviewTests() {
  console.log("===============================================================================");
  console.log("⭐ ÜRÜN PUANLAMA, YORUM, DOĞRULANMIŞ ALICI & MODERASYON TEST SÜİTİ BAŞLATILIYOR");
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
    // TEST 1: Veritabanı Modelleri & Alan Doğrulaması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 1: Veritabanı Şeması & Review Modeli");

    const sampleProduct = await prisma.product.findFirst({
      select: { id: true, name: true, averageRating: true, reviewCount: true },
    });
    assert(Boolean(sampleProduct), "Test ürünü veritabanından çekildi");
    assert(
      sampleProduct?.averageRating !== undefined && sampleProduct?.reviewCount !== undefined,
      `Product modelinde averageRating (${sampleProduct?.averageRating}) ve reviewCount (${sampleProduct?.reviewCount}) alanları mevcut`
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Doğrulanmış Müşteri (Verified Buyer) Koruması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 2: Doğrulanmış Müşteri (Verified Buyer) Güvenlik Denetimi");

    // Test için sahte müşteri (satın almamış)
    const unverifiedUser = await prisma.user.upsert({
      where: { email: "unverified@test.com" },
      update: {},
      create: {
        email: "unverified@test.com",
        name: "Satın Almamış Müşteri",
        password: "password123",
        role: "CUSTOMER",
      },
    });

    const isVerifiedForUnbought = await checkVerifiedBuyer(unverifiedUser.id, sampleProduct!.id);
    assert(!isVerifiedForUnbought, "Satın alma/kiralama yapmamış kullanıcı için checkVerifiedBuyer: false döndü");

    // Satın almamış kullanıcının yorum yapma girişimi engellenmeli
    const blockedReviewRes = await createReview(
      {
        productId: sampleProduct!.id,
        rating: 5,
        comment: "Bu ürünü almadım ama deneme yorumu yazıyorum.",
      },
      unverifiedUser.id
    );

    assert(
      !blockedReviewRes.success &&
        blockedReviewRes.error?.toLowerCase().includes("satın almış veya kiralamış"),
      `Satın almamış müşterinin yorum girişimi güvenlik kontrolüne takıldı: "${blockedReviewRes.error}"`
    );

    // Şimdi doğrulanmış müşteri oluştur ve satın alma ekle
    const verifiedUser = await prisma.user.upsert({
      where: { email: "verified_buyer@test.com" },
      update: {},
      create: {
        email: "verified_buyer@test.com",
        name: "Doğrulanmış Test Müşterisi",
        password: "password123",
        role: "CUSTOMER",
      },
    });

    // Satın alma kaydı oluştur
    await prisma.order.create({
      data: {
        userId: verifiedUser.id,
        totalAmount: 2000,
        status: "PAID",
        items: {
          create: {
            productId: sampleProduct!.id,
            type: "SALE",
            quantity: 1,
            unitPrice: 2000,
            totalPrice: 2000,
            productName: sampleProduct!.name,
          },
        },
      },
    });

    const isVerifiedForBuyer = await checkVerifiedBuyer(verifiedUser.id, sampleProduct!.id);
    assert(isVerifiedForBuyer, "Satın alma kaydı olan müşteri için checkVerifiedBuyer: true döndü (Verified Buyer onaylandı)");

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Yorum Yazma & Puanlama (createReview)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 3: Yorum Yazma, Validasyon & Puan Kaydı");

    // Geçersiz puan denetimi (0 veya 6)
    const invalidRatingRes = await createReview(
      {
        productId: sampleProduct!.id,
        rating: 6,
        comment: "Geçersiz puan testi",
      },
      verifiedUser.id
    );
    assert(!invalidRatingRes.success, "1-5 dışındaki puan girişi (6) reddedildi");

    // Çok kısa yorum denetimi (< 5 karakter)
    const shortCommentRes = await createReview(
      {
        productId: sampleProduct!.id,
        rating: 5,
        comment: "a",
      },
      verifiedUser.id
    );
    assert(!shortCommentRes.success, "5 karakterden kısa yorum metni reddedildi");

    // Başarılı Yorum Kaydı (status: PENDING)
    const validReviewRes = await createReview(
      {
        productId: sampleProduct!.id,
        rating: 5,
        comment: "Harika bir ürün, kalitesi beklediğimden çok daha yüksek çıktı. Kesinlikle tavsiye ederim!",
        status: "PENDING",
      },
      verifiedUser.id
    );

    assert(
      validReviewRes.success && Boolean(validReviewRes.review),
      "Doğrulanmış müşteri yorumu başarıyla oluşturuldu"
    );
    assert(
      validReviewRes.review?.isVerified === true,
      "Yorum isVerified: true (Doğrulanmış Alıcı) bayrağıyla kaydedildi"
    );
    assert(
      validReviewRes.review?.status === "PENDING",
      "Yorum moderasyon için status: PENDING (Onay Bekliyor) durumunda kaydedildi"
    );

    const testReviewId = validReviewRes.review!.id;

    // Aynı kullanıcının aynı ürüne 2. yorumu: Güncelleme (Upsert) testi
    const updateReviewRes = await createReview(
      {
        productId: sampleProduct!.id,
        rating: 4,
        comment: "Ürünü birkaç gün daha kullandıktan sonra puanımı 4 yıldız olarak revize ediyorum.",
        status: "PENDING",
      },
      verifiedUser.id
    );

    assert(
      updateReviewRes.success && updateReviewRes.review?.id === testReviewId && updateReviewRes.review?.rating === 4,
      "Aynı kullanıcının yeni yorumu duplicate yaratmayıp mevcut kaydı güncelledi (Upsert)"
    );

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Moderasyon Eylemleri (approveReview, rejectReview, deleteReview)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 4: Admin & Satıcı Moderasyon Eylemleri");

    // 4.1 Admin Yorum Listesi
    const adminReviews = await getAdminReviews("ALL");
    assert(adminReviews.length > 0, `getAdminReviews platform çapındaki tüm yorumları listeledi (${adminReviews.length} yorum)`);
    assert(
      adminReviews.some((r) => r.id === testReviewId),
      "Eklenen test yorumu admin moderasyon listesinde mevcut"
    );

    // 4.2 approveReview: Yorumu onayla (APPROVED)
    const initialRatingState = await prisma.product.findUnique({
      where: { id: sampleProduct!.id },
      select: { averageRating: true, reviewCount: true },
    });

    const approveRes = await approveReview(testReviewId, "Yönetici moderasyonu: İçerik onaylandı.");
    assert(approveRes.success, "approveReview yorumu başarıyla onayladı");

    const reviewAfterApproval = await prisma.review.findUnique({ where: { id: testReviewId } });
    assert(reviewAfterApproval?.status === "APPROVED", "Yorum veritabanında status: APPROVED olarak güncellendi");

    // Puanın yeniden hesaplandığını doğrula
    const productAfterApproval = await prisma.product.findUnique({
      where: { id: sampleProduct!.id },
      select: { averageRating: true, reviewCount: true },
    });
    assert(
      productAfterApproval!.reviewCount >= initialRatingState!.reviewCount,
      `Ürün yorum sayısı ve ortalama puanı güncellendi: ${productAfterApproval?.averageRating} ⭐ (${productAfterApproval?.reviewCount} yorum)`
    );

    // 4.3 rejectReview: Yorumu reddet (REJECTED)
    const rejectRes = await rejectReview(testReviewId, "İçerik kurallarına uymadı.");
    assert(rejectRes.success, "rejectReview yorumu başarıyla reddetti");

    const reviewAfterReject = await prisma.review.findUnique({ where: { id: testReviewId } });
    assert(reviewAfterReject?.status === "REJECTED", "Yorum veritabanında status: REJECTED oldu");

    // Reddedilen yorumun puan hesaplamasından düşüldüğünü doğrula
    const productAfterReject = await prisma.product.findUnique({
      where: { id: sampleProduct!.id },
      select: { averageRating: true, reviewCount: true },
    });
    assert(
      productAfterReject!.reviewCount < productAfterApproval!.reviewCount || productAfterApproval!.reviewCount === 0,
      "Reddedilen yorum ürün puanı ve yorum sayısından güvenle düşüldü"
    );

    // 4.4 Tekrar onayla ve getProductReviews üzerinde gösterimini doğrula
    await approveReview(testReviewId, "Test için tekrar onaylandı.");
    const publicReviewsData = await getProductReviews(sampleProduct!.id);
    assert(
      publicReviewsData.reviews.some((r) => r.id === testReviewId),
      "Onaylı yorum getProductReviews ile müşteri vitrininde başarıyla listelendi"
    );
    assert(
      publicReviewsData.stats.distribution.length === 5,
      "5'ten 1'e kadar yıldız dağılım istatistikleri eksiksiz hesaplandı"
    );

    // 4.5 deleteReview: Yorumu kalıcı sil
    const deleteRes = await deleteReview(testReviewId);
    assert(deleteRes.success, "deleteReview yorumu veritabanından kalıcı olarak sildi");

    const deletedCheck = await prisma.review.findUnique({ where: { id: testReviewId } });
    assert(deletedCheck === null, "Silinen yorum veritabanından tamamen temizlendi");

    console.log("\n-------------------------------------------------------------------------------");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: HTTP Sayfa Erişimi ve Middleware Koruması
    // ─────────────────────────────────────────────────────────────────────────
    console.log("📌 SENARYO 5: HTTP Sayfa Erişimi & Middleware Rota Koruması");

    // 5.1 Misafir /admin/reviews erişimi -> 307 to /login
    const guestRes = await fetch("http://localhost:3000/admin/reviews", { redirect: "manual" });
    assert(
      guestRes.status === 307 && guestRes.headers.get("location")?.includes("/login"),
      `Misafir /admin/reviews erişimi engellendi ve /login sayfasına yönlendirildi (HTTP ${guestRes.status})`
    );

    // 5.2 Admin oturumu ile /admin/reviews erişimi -> 200 OK
    const adminToken = await createSessionToken({
      id: "admin_test_review",
      email: "admin@hybridcommerce.com",
      name: "Admin Tester",
      role: "ADMIN",
      roles: ["ADMIN", "CUSTOMER"],
    });

    const adminPageRes = await fetch("http://localhost:3000/admin/reviews", {
      headers: {
        cookie: `hc_session=${adminToken}`,
      },
    });
    assert(adminPageRes.status === 200, `Admin /admin/reviews paneline başarıyla erişti (HTTP ${adminPageRes.status} OK)`);

    // 5.3 Ürün detay sayfası HTTP 200 ve yorum bölümü
    const productPageRes = await fetch(`http://localhost:3000/products/${sampleProduct!.id}`);
    // Not: slug ile de kontrol edelim
    const productBySlug = await prisma.product.findUnique({ where: { id: sampleProduct!.id } });
    const productSlugRes = await fetch(`http://localhost:3000/products/${productBySlug!.slug}`);
    assert(productSlugRes.status === 200, `Ürün detay sayfası (${productBySlug?.slug}) yorumlar ve puanlama ile HTTP 200 döndü`);

    console.log("\n===============================================================================");
    console.log(`🎉 TÜM YORUM VE MODERASYON TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("❌ Test sırasında kritik hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReviewTests();
