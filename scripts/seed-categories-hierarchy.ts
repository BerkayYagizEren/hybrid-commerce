import prisma from "../src/lib/prisma";

async function seedCategories() {
  console.log("🌱 Kategori hiyerarşisi tohumlanıyor...");

  // 1. Ana Kategoriler
  const outdoorMain = await prisma.category.upsert({
    where: { slug: "outdoor" },
    update: { name: "Outdoor & Kamp", description: "Kamp, doğa sporları ve karavan ekipmanları" },
    create: {
      name: "Outdoor & Kamp",
      slug: "outdoor",
      description: "Kamp, doğa sporları ve karavan ekipmanları",
    },
  });

  const electronicMain = await prisma.category.upsert({
    where: { slug: "elektronik" },
    update: { name: "Elektronik & Bilgisayar", description: "Dizüstü bilgisayarlar, ses ve görüntü sistemleri" },
    create: {
      name: "Elektronik & Bilgisayar",
      slug: "elektronik",
      description: "Dizüstü bilgisayarlar, ses ve görüntü sistemleri",
    },
  });

  const photoMain = await prisma.category.upsert({
    where: { slug: "fotograf-video" },
    update: { name: "Fotoğraf & Kamera", description: "Profesyonel kameralar, sinema lensleri ve drone setleri" },
    create: {
      name: "Fotoğraf & Kamera",
      slug: "fotograf-video",
      description: "Profesyonel kameralar, sinema lensleri ve drone setleri",
    },
  });

  // 2. Alt Kategoriler
  // Outdoor alt kategorileri
  const cadirSub = await prisma.category.upsert({
    where: { slug: "cadir-barinma" },
    update: { parentId: outdoorMain.id },
    create: {
      name: "Çadır & Barınma",
      slug: "cadir-barinma",
      description: "4 mevsim, aile ve kamp çadırları",
      parentId: outdoorMain.id,
    },
  });

  const uykuSub = await prisma.category.upsert({
    where: { slug: "uyku-tulumlari" },
    update: { parentId: outdoorMain.id },
    create: {
      name: "Uyku Tulumları & Matlar",
      slug: "uyku-tulumlari",
      description: "Termal tulumlar ve konforlu şişme matlar",
      parentId: outdoorMain.id,
    },
  });

  const kampMutfakSub = await prisma.category.upsert({
    where: { slug: "kamp-mutfagi" },
    update: { parentId: outdoorMain.id },
    create: {
      name: "Kamp Mutfağı & Ocaklar",
      slug: "kamp-mutfagi",
      description: "Gaz ocakları, termoslar ve pişirme setleri",
      parentId: outdoorMain.id,
    },
  });

  // Elektronik alt kategorileri
  const laptopSub = await prisma.category.upsert({
    where: { slug: "bilgisayar-laptop" },
    update: { parentId: electronicMain.id },
    create: {
      name: "Bilgisayar & Laptop",
      slug: "bilgisayar-laptop",
      description: "MacBook, oyun ve iş istasyonu bilgisayarları",
      parentId: electronicMain.id,
    },
  });

  const sesSub = await prisma.category.upsert({
    where: { slug: "ses-kulaklik" },
    update: { parentId: electronicMain.id },
    create: {
      name: "Ses Sistemleri & Kulaklık",
      slug: "ses-kulaklik",
      description: "Kablosuz kulaklıklar ve stüdyo monitörleri",
      parentId: electronicMain.id,
    },
  });

  // Fotoğraf & Kamera alt kategorileri
  const kameraSub = await prisma.category.upsert({
    where: { slug: "kamera-govdeleri" },
    update: { parentId: photoMain.id },
    create: {
      name: "Kamera & Aynasız Gövdeler",
      slug: "kamera-govdeleri",
      description: "Sony, Canon, RED ve Blackmagic profesyonel kameralar",
      parentId: photoMain.id,
    },
  });

  const lensSub = await prisma.category.upsert({
    where: { slug: "lensler-optik" },
    update: { parentId: photoMain.id },
    create: {
      name: "Lensler & Optik",
      slug: "lensler-optik",
      description: "Prime ve zoom sinema ve fotoğraf objektifleri",
      parentId: photoMain.id,
    },
  });

  const droneSub = await prisma.category.upsert({
    where: { slug: "drone-gimbal" },
    update: { parentId: photoMain.id },
    create: {
      name: "Drone & Gimbal Sistemleri",
      slug: "drone-gimbal",
      description: "DJI drone ve el gimbal sabitleyicileri",
      parentId: photoMain.id,
    },
  });

  console.log("✅ Ana ve alt kategoriler başarıyla oluşturuldu.");

  // 3. Mevcut ürünleri kategori ve alt kategoriler ile eşleştir
  // Çadır
  await prisma.product.updateMany({
    where: { name: { contains: "Çadır", mode: "insensitive" } },
    data: {
      categoryId: outdoorMain.id,
      subCategoryId: cadirSub.id,
    },
  });

  // MacBook
  await prisma.product.updateMany({
    where: { name: { contains: "MacBook", mode: "insensitive" } },
    data: {
      categoryId: electronicMain.id,
      subCategoryId: laptopSub.id,
    },
  });

  // Kulaklık
  await prisma.product.updateMany({
    where: { name: { contains: "Kulaklık", mode: "insensitive" } },
    data: {
      categoryId: electronicMain.id,
      subCategoryId: sesSub.id,
    },
  });

  // Drone
  await prisma.product.updateMany({
    where: { name: { contains: "Drone", mode: "insensitive" } },
    data: {
      categoryId: photoMain.id,
      subCategoryId: droneSub.id,
    },
  });

  // Kamera & Fotoğraf makineleri
  await prisma.product.updateMany({
    where: {
      OR: [
        { name: { contains: "Sony A7", mode: "insensitive" } },
        { name: { contains: "Canon EOS", mode: "insensitive" } },
        { name: { contains: "RED Komodo", mode: "insensitive" } },
        { name: { contains: "DJI Ronin", mode: "insensitive" } },
      ],
    },
    data: {
      categoryId: photoMain.id,
      subCategoryId: kameraSub.id,
    },
  });

  // Lens
  await prisma.product.updateMany({
    where: { name: { contains: "Lens", mode: "insensitive" } },
    data: {
      categoryId: photoMain.id,
      subCategoryId: lensSub.id,
    },
  });

  console.log("✅ Ürünler kategori ve alt kategoriler ile başarılı şekilde eşleştirildi!");
}

seedCategories()
  .catch((err) => {
    console.error("Hata:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
