import prisma from "../src/lib/prisma";
import { recalculateProductRating } from "../src/features/reviews/actions/review.actions";

async function seedReviews() {
  console.log("⭐ Örnek yorumlar ve puanlamalar ekleniyor...");

  // 1. Müşteri kullanıcıları bul veya oluştur
  let customer1 = await prisma.user.findFirst({
    where: { email: "ahmet@example.com" },
  });
  if (!customer1) {
    customer1 = await prisma.user.create({
      data: {
        email: "ahmet@example.com",
        name: "Ahmet Yılmaz",
        password: "password123",
        role: "CUSTOMER",
      },
    });
  }

  let customer2 = await prisma.user.findFirst({
    where: { email: "elif@example.com" },
  });
  if (!customer2) {
    customer2 = await prisma.user.create({
      data: {
        email: "elif@example.com",
        name: "Elif Demir",
        password: "password123",
        role: "CUSTOMER",
      },
    });
  }

  let customer3 = await prisma.user.findFirst({
    where: { email: "selin@example.com" },
  });
  if (!customer3) {
    customer3 = await prisma.user.create({
      data: {
        email: "selin@example.com",
        name: "Selin Yıldız",
        password: "password123",
        role: "CUSTOMER",
      },
    });
  }

  // 2. Ürünleri bul
  const cadirProduct = await prisma.product.findFirst({
    where: { name: { contains: "Çadır", mode: "insensitive" } },
  });

  const macbookProduct = await prisma.product.findFirst({
    where: { name: { contains: "MacBook", mode: "insensitive" } },
  });

  const cameraProduct = await prisma.product.findFirst({
    where: { name: { contains: "Sony", mode: "insensitive" } },
  });

  // 3. Doğrulanmış müşteri sipariş kayıtlarını garantiye al (Verified Buyer)
  if (cadirProduct) {
    // Ahmet Yılmaz için Çadır siparişi
    const existingOrder = await prisma.order.findFirst({
      where: { userId: customer1.id, items: { some: { productId: cadirProduct.id } } },
    });
    if (!existingOrder) {
      await prisma.order.create({
        data: {
          userId: customer1.id,
          totalAmount: 3500,
          status: "PAID",
          items: {
            create: {
              productId: cadirProduct.id,
              type: "SALE",
              quantity: 1,
              unitPrice: 3500,
              totalPrice: 3500,
              productName: cadirProduct.name,
            },
          },
        },
      });
    }

    // Ahmet Yılmaz Yorumu (APPROVED, 5 Yıldız)
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer1.id,
          productId: cadirProduct.id,
        },
      },
      update: {
        rating: 5,
        comment: "Uludağ kampında fırtınada kullandık. Rüzgarda ve yoğun yağmurda sıfır su aldı. Kurulumu da çift bagetle 10 dakika bile sürmedi. Kesinlikle tavsiye ederim!",
        status: "APPROVED",
        isVerified: true,
      },
      create: {
        userId: customer1.id,
        productId: cadirProduct.id,
        rating: 5,
        comment: "Uludağ kampında fırtınada kullandık. Rüzgarda ve yoğun yağmurda sıfır su aldı. Kurulumu da çift bagetle 10 dakika bile sürmedi. Kesinlikle tavsiye ederim!",
        status: "APPROVED",
        isVerified: true,
      },
    });

    // Elif Demir için de Çadır kiralama kaydı ve Yorumu (APPROVED, 4 Yıldız)
    const existingRental = await prisma.rental.findFirst({
      where: { userId: customer2.id, productId: cadirProduct.id },
    });
    if (!existingRental) {
      await prisma.rental.create({
        data: {
          userId: customer2.id,
          productId: cadirProduct.id,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-09-05"),
          dailyRate: 200,
          totalPrice: 800,
          depositAmount: 1500,
          status: "RETURNED",
        },
      });
    }

    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer2.id,
          productId: cadirProduct.id,
        },
      },
      update: {
        rating: 4,
        comment: "Kiralama süreci sorunsuzdu, depozito iadem ürün satıcıya ulaştığı gün kartıma geri yansıtıldı. Malzeme çok temiz ve eksiksiz teslim edildi.",
        status: "APPROVED",
        isVerified: true,
      },
      create: {
        userId: customer2.id,
        productId: cadirProduct.id,
        rating: 4,
        comment: "Kiralama süreci sorunsuzdu, depozito iadem ürün satıcıya ulaştığı gün kartıma geri yansıtıldı. Malzeme çok temiz ve eksiksiz teslim edildi.",
        status: "APPROVED",
        isVerified: true,
      },
    });

    await recalculateProductRating(cadirProduct.id);
  }

  // MacBook için Selin Yıldız yorumu
  if (macbookProduct) {
    const existingOrder = await prisma.order.findFirst({
      where: { userId: customer3.id, items: { some: { productId: macbookProduct.id } } },
    });
    if (!existingOrder) {
      await prisma.order.create({
        data: {
          userId: customer3.id,
          totalAmount: 85000,
          status: "PAID",
          items: {
            create: {
              productId: macbookProduct.id,
              type: "SALE",
              quantity: 1,
              unitPrice: 85000,
              totalPrice: 85000,
              productName: macbookProduct.name,
            },
          },
        },
      });
    }

    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer3.id,
          productId: macbookProduct.id,
        },
      },
      update: {
        rating: 5,
        comment: "M4 çipli model render ve yazılım geliştirme için canavar gibi çalışıyor. Orijinal kutusunda ve tüm aksesuarlarıyla geldi. Teşekkürler!",
        status: "APPROVED",
        isVerified: true,
      },
      create: {
        userId: customer3.id,
        productId: macbookProduct.id,
        rating: 5,
        comment: "M4 çipli model render ve yazılım geliştirme için canavar gibi çalışıyor. Orijinal kutusunda ve tüm aksesuarlarıyla geldi. Teşekkürler!",
        status: "APPROVED",
        isVerified: true,
      },
    });

    await recalculateProductRating(macbookProduct.id);
  }

  // Moderasyon için 1 adet PENDING yorum ekle
  if (cameraProduct) {
    const existingOrder = await prisma.order.findFirst({
      where: { userId: customer1.id, items: { some: { productId: cameraProduct.id } } },
    });
    if (!existingOrder) {
      await prisma.order.create({
        data: {
          userId: customer1.id,
          totalAmount: 12000,
          status: "PAID",
          items: {
            create: {
              productId: cameraProduct.id,
              type: "RENTAL",
              quantity: 1,
              unitPrice: 12000,
              totalPrice: 12000,
              productName: cameraProduct.name,
            },
          },
        },
      });
    }

    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: customer1.id,
          productId: cameraProduct.id,
        },
      },
      update: {
        rating: 5,
        comment: "Çekim için 3 gün kiraladım. Sensör temizliği harikaydı, yanında 2 adet yedek batarya ile gönderilmiş. Çok memnun kaldım.",
        status: "PENDING",
        isVerified: true,
      },
      create: {
        userId: customer1.id,
        productId: cameraProduct.id,
        rating: 5,
        comment: "Çekim için 3 gün kiraladım. Sensör temizliği harikaydı, yanında 2 adet yedek batarya ile gönderilmiş. Çok memnun kaldım.",
        status: "PENDING",
        isVerified: true,
      },
    });
  }

  console.log("✅ Örnek yorumlar ve ürün puanları başarıyla eklendi!");
}

seedReviews()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
