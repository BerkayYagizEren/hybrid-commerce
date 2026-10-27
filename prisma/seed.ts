import { PrismaClient, ProductType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed başlatılıyor...");

  // ─────────────────────────────────────────────
  // 1. Kullanıcılar ve Roller (Çoklu Rol Desteği)
  // ─────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@hybridcommerce.com" },
    update: {
      role: UserRole.ADMIN,
      roles: [UserRole.ADMIN],
    },
    create: {
      email: "admin@hybridcommerce.com",
      name: "Sistem Yöneticisi",
      password: "hashed_admin_password",
      role: UserRole.ADMIN,
      roles: [UserRole.ADMIN],
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "satici@kampdunyasi.com" },
    update: {
      role: UserRole.VENDOR,
      roles: [UserRole.VENDOR, UserRole.CUSTOMER],
    },
    create: {
      email: "satici@kampdunyasi.com",
      name: "Kamp Dünyası Mağazası",
      password: "hashed_vendor_password",
      role: UserRole.VENDOR,
      roles: [UserRole.VENDOR, UserRole.CUSTOMER], // Hem satıcı hem müşteri
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "ahmet@example.com" },
    update: {
      role: UserRole.CUSTOMER,
      roles: [UserRole.CUSTOMER],
    },
    create: {
      email: "ahmet@example.com",
      name: "Ahmet Yılmaz",
      password: "hashed_customer_password",
      role: UserRole.CUSTOMER,
      roles: [UserRole.CUSTOMER],
    },
  });

  console.log("👥 Kullanıcılar oluşturuldu:", {
    admin: admin.email,
    vendor: vendor.email,
    customer: customer.email,
  });

  // ─────────────────────────────────────────────
  // 2. Kategoriler
  // ─────────────────────────────────────────────
  const elektronik = await prisma.category.upsert({
    where: { slug: "elektronik" },
    update: {},
    create: { name: "Elektronik", slug: "elektronik" },
  });

  const outdoor = await prisma.category.upsert({
    where: { slug: "outdoor" },
    update: {},
    create: { name: "Outdoor & Kamp", slug: "outdoor" },
  });

  // ─────────────────────────────────────────────
  // 3. Ürünler
  // ─────────────────────────────────────────────
  // Satılık Ürün: MacBook Pro 16"
  const laptop = await prisma.product.upsert({
    where: { slug: "macbook-pro-16" },
    update: {
      salePrice: 84999.0,
    },
    create: {
      name: 'MacBook Pro 16"',
      slug: "macbook-pro-16",
      description: "Apple M3 Pro çipli, 18GB RAM, 512GB SSD",
      type: ProductType.SALE,
      salePrice: 84999.0,
      images: [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80"
      ],
      categoryId: elektronik.id,
      inventory: {
        create: {
          totalStock: 25,
          reservedStock: 0,
          rentalQuantity: 0,
        },
      },
    },
  });

  // Kiralık Ürün: Sony A7 IV Kamera
  const kamera = await prisma.product.upsert({
    where: { slug: "sony-a7iv-kamera" },
    update: {
      rentalPricing: {
        update: {
          minDays: 1,
          maxDays: 30,
        },
      },
    },
    create: {
      name: "Sony A7 IV Kamera Seti",
      slug: "sony-a7iv-kamera",
      description: "Full-frame aynasız kamera, 24-70mm lens ile birlikte",
      type: ProductType.RENTAL,
      images: [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80"
      ],
      categoryId: elektronik.id,
      inventory: {
        create: {
          totalStock: 0,
          reservedStock: 0,
          rentalQuantity: 5,
        },
      },
      rentalPricing: {
        create: {
          dailyPrice: 750.0,
          weeklyPrice: 4500.0,
          monthlyPrice: 15000.0,
          depositAmount: 5000.0,
          minDays: 1,
          maxDays: 30,
        },
      },
    },
  });

  // Hem Satılık Hem Kiralık Ürün (Vendor'a bağlı): 4 Mevsim Kamp Çadırı
  const cadir = await prisma.product.upsert({
    where: { slug: "4-mevsim-cadir" },
    update: {
      salePrice: 12500.0,
      vendorId: vendor.id,
      rentalPricing: {
        update: {
          dailyPrice: 250.0,
          weeklyPrice: 1500.0,
          depositAmount: 2000.0,
          minDays: 1,
          maxDays: 30,
        },
      },
    },
    create: {
      name: "4 Mevsim Kamp Çadırı (4 Kişilik)",
      slug: "4-mevsim-cadir",
      description: "Su geçirmez, rüzgar dayanımlı, kolay kurulum",
      type: ProductType.BOTH,
      salePrice: 12500.0,
      images: [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1000&q=80"
      ],
      categoryId: outdoor.id,
      vendorId: vendor.id, // Satıcı ilişkisi
      inventory: {
        create: {
          totalStock: 50,
          reservedStock: 0,
          rentalQuantity: 10,
        },
      },
      rentalPricing: {
        create: {
          dailyPrice: 250.0,
          weeklyPrice: 1500.0,
          depositAmount: 2000.0,
          minDays: 1,
          maxDays: 30,
        },
      },
    },
  });

  // ─────────────────────────────────────────────
  // 6. İndirim Kuponları (Coupons)
  // ─────────────────────────────────────────────
  const coupons = [
    {
      code: "INDIRIM20",
      discountType: "PERCENTAGE" as const,
      discountValue: 20,
      minBasketAmount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2),
    },
    {
      code: "HOSGELDIN",
      discountType: "FIXED" as const,
      discountValue: 250,
      minBasketAmount: 500,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2),
    },
    {
      code: "FIRSAT50",
      discountType: "PERCENTAGE" as const,
      discountValue: 50,
      minBasketAmount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2),
    },
    {
      code: "SUPER100",
      discountType: "FIXED" as const,
      discountValue: 100,
      minBasketAmount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2),
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }

  console.log("✅ Seed tamamlandı:", { laptop: laptop.id, kamera: kamera.id, cadir: cadir.id });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
