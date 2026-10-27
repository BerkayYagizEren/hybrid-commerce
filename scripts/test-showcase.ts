import prisma from "../src/lib/prisma";
import {
  createSlider,
  getActiveSliders,
  getAllSliders,
  deleteSlider,
  addShowcaseItem,
  getShowcaseProducts,
  removeShowcaseItem,
  createInstagramPost,
  getActiveInstagramPosts,
  deleteInstagramPost,
} from "../src/features/showcase/actions/showcase.actions";

async function runShowcaseTests() {
  console.log("=========================================================================");
  console.log("🖼️  ADIM 4: ADMİN KONTROLLÜ DİNAMİK ANA SAYFA VİTRİNLERİ DOĞRULAMA TESTİ");
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

    // 1. Slider Yönetimi Testleri
    console.log("📌 1. Hero Banner Slider CRUD Testleri");
    const sliderRes = await createSlider({
      title: `Büyük Kış Kampanyası ${timestamp}`,
      subtitle: "Tüm kiralık ve satılık outdoor ürünlerde %30 varan indirim",
      imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80",
      linkUrl: "/products?category=outdoor",
      order: 1,
    });
    assert(sliderRes.success && Boolean(sliderRes.slider), "Hero slider başarıyla oluşturuldu");
    const sliderId = sliderRes.slider!.id;

    const allSliders = await getAllSliders();
    assert(allSliders.some((s) => s.id === sliderId), "getAllSliders listesinde oluşturulan slider mevcut");

    const activeSliders = await getActiveSliders();
    assert(activeSliders.some((s) => s.id === sliderId), "getActiveSliders listesinde aktif slider bulundu");

    // 2. Vitrin Ürünleri (Showcase Items) Testleri
    console.log("\n📌 2. Dinamik Vitrin (Trend & Çok Satanlar) Eşleştirme Testleri");
    const sampleProduct = await prisma.product.findFirst({
      where: { isDeleted: false, active: true },
    });
    assert(sampleProduct !== null, `Test için vitrin ürünü bulundu (${sampleProduct?.name})`);

    const trendRes = await addShowcaseItem(sampleProduct!.id, "TREND", 1);
    assert(trendRes.success && Boolean(trendRes.item), "Ürün 'TREND' vitrinine başarıyla eklendi");
    const trendItemId = trendRes.item!.id;

    // Mükerrer ekleme engeli
    const duplicateTrend = await addShowcaseItem(sampleProduct!.id, "TREND", 2);
    assert(!duplicateTrend.success, "Aynı ürünün aynı vitrine ikinci kez eklenmesi engellendi");

    // Vitrindeki ürünleri sorgula
    const trendProducts = await getShowcaseProducts("TREND");
    assert(trendProducts.some((p) => p.id === sampleProduct!.id), "getShowcaseProducts('TREND') içinde eklenen ürün listelendi");

    // BEST_SELLER vitrini testi
    const bestSellerRes = await addShowcaseItem(sampleProduct!.id, "BEST_SELLER", 1);
    assert(bestSellerRes.success, "Aynı ürün farklı bir vitrine (BEST_SELLER) eklenebildi");
    const bestSellerItemId = bestSellerRes.item!.id;

    const bestSellerProducts = await getShowcaseProducts("BEST_SELLER");
    assert(bestSellerProducts.some((p) => p.id === sampleProduct!.id), "getShowcaseProducts('BEST_SELLER') içinde ürün listelendi");

    // 3. Instagram Akışı Testleri
    console.log("\n📌 3. Dinamik Instagram Gönderileri CRUD Testleri");
    const instaRes = await createInstagramPost({
      postUrl: "https://instagram.com/p/test_camp_post_1",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      caption: `Harika bir kamp deneyimi #${timestamp}`,
      order: 1,
    });
    assert(instaRes.success && Boolean(instaRes.post), "Instagram gönderisi başarıyla eklendi");
    const instaPostId = instaRes.post!.id;

    const activePosts = await getActiveInstagramPosts();
    assert(activePosts.some((p) => p.id === instaPostId), "getActiveInstagramPosts içinde yeni gönderi mevcut");

    // 4. Temizlik ve Silme Testleri
    console.log("\n📌 4. Vitrin, Slider ve Post Silme Testleri");
    const delSlide = await deleteSlider(sliderId);
    assert(delSlide.success, "Slider başarıyla silindi");

    const delTrend = await removeShowcaseItem(trendItemId);
    assert(delTrend.success, "Trend vitrin ürünü kaldırıldı");

    const delBest = await removeShowcaseItem(bestSellerItemId);
    assert(delBest.success, "Çok satanlar vitrin ürünü kaldırıldı");

    const delInsta = await deleteInstagramPost(instaPostId);
    assert(delInsta.success, "Instagram gönderisi silindi");

    console.log("\n=========================================================================");
    console.log(`🎉 ADIM 4: VİTRİN VE MEDYA YÖNETİMİ TESTLERİ BAŞARIYLA TAMAMLANDI! (${passedTests}/${totalTests} Geçti)`);
    console.log("=========================================================================\n");
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runShowcaseTests();
