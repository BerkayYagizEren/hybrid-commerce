import prisma from "../src/lib/prisma";
import {
  createVendorProduct,
  updateVendorProduct,
  getVendorProductsList,
} from "../src/features/vendor/actions/vendor.actions";
import { CartService } from "../src/features/cart/services/cart.service";
import { CheckoutService } from "../src/features/checkout/services/checkout.service";
import { OrderService } from "../src/features/orders/services/order.service";

async function testMultiImageAndSnapshot() {
  console.log("===============================================================================");
  console.log("🖼️ ÇOKLU GÖRSEL VE SİPARİŞ SNAPSHOT TUTARLILIK TESTİ");
  console.log("===============================================================================\n");

  // 1. Çoklu görselli test ürünü oluştur
  console.log("--- 1. ÇOKLU GÖRSELLİ YENİ ÜRÜN OLUŞTURMA (createVendorProduct) ---");
  const initialImages = [
    "https://images.unsplash.com/photo-1507582020434-9f0630648888?auto=format&fit=crop&w=1000&q=80", // Drone Açık Alan
    "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1000&q=80", // Drone Havada
    "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1000&q=80", // Drone Kumanda & Kutu
  ];

  const createRes = await createVendorProduct({
    name: "DJI Inspire 3 Profesyonel Sinema Drone Seti",
    type: "BOTH",
    images: initialImages,
    salePrice: 150000,
    dailyPrice: 5000,
    depositAmount: 30000,
    totalStock: 5,
    rentalQuantity: 2,
    categoryName: "Elektronik & Fotoğraf",
  });

  if (!createRes.success || !createRes.product) {
    throw new Error(`Ürün eklenemedi: ${createRes.error}`);
  }

  const productId = createRes.product.id;
  const productSlug = createRes.product.slug;
  console.log(`  ✅ Ürün Oluşturuldu: ID=${productId}, Slug=${productSlug}`);

  // DB kontrolü
  const dbProd = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`  🔍 Veritabanındaki images adedi: ${dbProd?.images.length}`);
  if (!dbProd || dbProd.images.length !== 3) {
    throw new Error("Veritabanında 3 adet görsel kaydedilmedi!");
  }
  console.log(`     İlk Görsel (Kapak): ${dbProd.images[0]}`);
  console.log(`     İkinci Görsel:      ${dbProd.images[1]}`);
  console.log(`     Üçüncü Görsel:      ${dbProd.images[2]}`);

  // 2. Dinamik Görsel Ekleme & Çıkarma (updateVendorProduct)
  console.log("\n--- 2. ÇOKLU GÖRSEL DÜZENLEME & GÜNCELLEME (updateVendorProduct) ---");
  const updatedImages = [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80", // Yeni Kapak
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1000&q=80", // Yeni 2. Görsel
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80", // Yeni 3. Görsel
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=80", // Yeni 4. Görsel
  ];

  const updateRes = await updateVendorProduct({
    productId,
    name: "DJI Inspire 3 Pro (4 Görselli Güncel Paket)",
    images: updatedImages,
    salePrice: 145000,
  });

  if (!updateRes.success) {
    throw new Error(`Güncelleme başarısız: ${updateRes.error}`);
  }

  const updatedDbProd = await prisma.product.findUnique({ where: { id: productId } });
  if (!updatedDbProd || updatedDbProd.images.length !== 4) {
    throw new Error("Güncelleme sonrası 4 görsel veritabanında doğrulanamadı!");
  }
  console.log(`  ✅ [BAŞARILI] Ürün 4 yeni görsel ile güncellendi.`);

  // 3. Sipariş Oluşturma ve Snapshot Doğrulaması
  console.log("\n--- 3. SİPARİŞ SNAPSHOT TUTARLILIĞI TESTİ (CHECKOUT & ORDER ITEM) ---");
  const testUser = await prisma.user.upsert({
    where: { email: "snapshot.test@hybridcommerce.dev" },
    update: {},
    create: {
      email: "snapshot.test@hybridcommerce.dev",
      name: "Kemal Sunal (Snapshot Test)",
      password: "test_password",
      role: "CUSTOMER",
    },
  });

  const cart = await CartService.getOrCreateCart(testUser.id);
  await CartService.clear(cart.id);

  // Sepete bu ürünü ekle (Satın Alma olarak)
  await CartService.addItem(cart.id, {
    productId,
    type: "SALE",
    quantity: 1,
  });

  // Siparişi tamamla (Checkout)
  const checkoutRes = await CheckoutService.process({
    userId: testUser.id,
    cartId: cart.id,
    shippingAddress: {
      fullName: "Kemal Sunal",
      addressLine1: "Moda Cad. No: 10",
      city: "İstanbul",
      state: "Kadıköy",
      postalCode: "34710",
      country: "Türkiye",
      phone: "+90 532 555 4433",
    },
  });

  if (!checkoutRes.success || !checkoutRes.orderId) {
    throw new Error(`Checkout başarısız: ${checkoutRes.error}`);
  }
  const orderId = checkoutRes.orderId;
  console.log(`  ✅ Sipariş Başarıyla Oluşturuldu! Order ID: ${orderId}`);

  // OrderItem tablosundaki snapshot alanlarını kontrol et
  const rawOrderItem = await prisma.orderItem.findFirst({
    where: { orderId },
  });

  console.log("  🔍 Sipariş Anındaki Snapshot Verileri:");
  console.log(`     productName:     "${rawOrderItem?.productName}"`);
  console.log(`     productImage:    "${rawOrderItem?.productImage}"`);
  console.log(`     priceAtPurchase: ₺${Number(rawOrderItem?.priceAtPurchase)}`);

  if (!rawOrderItem?.productName || !rawOrderItem?.productImage || !rawOrderItem?.priceAtPurchase) {
    throw new Error("OrderItem modelinde snapshot alanları doldurulmamış!");
  }
  console.log("  ✅ [BAŞARILI] Sipariş anındaki ürün adı, görseli ve fiyatı snapshot olarak saklandı.");

  // 4. Satıcı Ürünü Değiştirirse Ne Olur? (Fiyat ve Görsel Manipülasyonu)
  console.log("\n--- 4. SATICININ ÜRÜNÜ SONRADAN DEĞİŞTİRMESİ SİMÜLASYONU ---");
  console.log("  Satıcı mağazada ürünün adını, fiyatını ve görselini tamamen değiştiriyor...");
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: "ÇOK FARKLI BİR ÜRÜN: Plastik Çocuk Drone (Revize)",
      salePrice: 999.0, // Fiyat 145.000 TL'den 999 TL'ye düşürüldü
      images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80"],
    },
  });

  // 5. Müşteri Siparişi Görüntülediğinde Orijinal Veri Korundu mu?
  console.log("\n--- 5. SİPARİŞ GEÇMİŞİ VE TUTARLILIK DOĞRULAMASI ---");
  const userOrder = await OrderService.getById(orderId);
  const orderItemDisplay = userOrder?.items[0];

  console.log(`  Sipariş Edilen Kalem Adı:     "${orderItemDisplay?.productName}"`);
  console.log(`  Sipariş Edilen Kalem Görseli: "${orderItemDisplay?.productImage}"`);
  console.log(`  Sipariş Edilen Kalem Fiyatı:  ₺${orderItemDisplay?.unitPrice}`);

  if (
    orderItemDisplay?.productName !== "DJI Inspire 3 Pro (4 Görselli Güncel Paket)" ||
    orderItemDisplay?.productImage !== updatedImages[0] ||
    orderItemDisplay?.unitPrice !== 145000
  ) {
    throw new Error(
      "HATA: Sipariş anındaki snapshot korunamadı! Üründeki son değişiklikler siparişi bozdu!"
    );
  }

  console.log("  🎉 [MÜKEMMEL] Satıcı mağazadaki ürünü değiştirse dahi, müşterinin siparişindeki");
  console.log("               ürün adı, satın alma anındaki görsel ve fiyat %100 KORUNDU!");

  // 6. Sayfa Yanıtları
  console.log("\n--- 6. HTTP ENDPOINT DOĞRULAMALARI ---");
  const [catalogRes, detailRes, ordersRes] = await Promise.all([
    fetch("http://localhost:3000/products"),
    fetch(`http://localhost:3000/products/${productSlug}`),
    fetch("http://localhost:3000/orders"),
  ]);

  console.log(`  /products:           ${catalogRes.status} OK`);
  console.log(`  /products/[slug]:    ${detailRes.status} OK`);
  console.log(`  /orders:             ${ordersRes.status} OK`);

  if (catalogRes.status !== 200 || detailRes.status !== 200 || ordersRes.status !== 200) {
    throw new Error("Sayfalardan biri 200 OK dönmedi!");
  }

  console.log("\n===============================================================================");
  console.log("✨ TÜM ÇOKLU GÖRSEL VE SİPARİŞ TUTARLILIK TESTLERİ BAŞARIYLA TAMAMLANDI!");
  console.log("===============================================================================\n");
}

testMultiImageAndSnapshot()
  .catch((e) => {
    console.error("Test Hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
