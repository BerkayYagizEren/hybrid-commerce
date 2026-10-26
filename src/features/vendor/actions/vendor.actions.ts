"use server";

import prisma from "@/lib/prisma";
import { ProductType } from "@prisma/client";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside request context
  }
}

export interface CreateProductInput {
  name: string;
  type: "SALE" | "RENTAL" | "BOTH";
  description?: string;
  imageUrl?: string;
  images?: string[];
  salePrice?: number;
  dailyPrice?: number;
  weeklyPrice?: number;
  depositAmount?: number;
  totalStock?: number;
  rentalQuantity?: number;
  categoryName?: string;
  categoryId?: string;
  subCategoryId?: string;
}

export interface UpdateProductInput {
  productId: string;
  name?: string;
  imageUrl?: string;
  images?: string[];
  salePrice?: number;
  dailyPrice?: number;
  depositAmount?: number;
  totalStock?: number;
  rentalQuantity?: number;
  categoryId?: string;
  subCategoryId?: string;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .concat(`-${Date.now().toString().slice(-4)}`);
}

/**
 * Satıcı için yeni ürün ekler (Prisma ile veritabanına kaydeder)
 */
export async function createVendorProduct(data: CreateProductInput) {
  try {
    // 1. Satıcı kullanıcısını bul veya oluştur
    let vendor = await prisma.user.findFirst({
      where: { role: "VENDOR" },
    });

    if (!vendor) {
      vendor = await prisma.user.create({
        data: {
          email: "satici@kampdunyasi.com",
          name: "Kamp Dünyası Mağazası",
          password: "demo_password",
          role: "VENDOR",
          roles: ["VENDOR", "CUSTOMER"],
        },
      });
    }

    // 2. Kategori kontrolü
    let targetCategoryId = data.categoryId;
    let targetSubCategoryId = data.subCategoryId;

    if (!targetCategoryId) {
      const categoryName = data.categoryName || (data.type === "RENTAL" ? "Ekipman Kiralama" : "Outdoor & Kamp");
      const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const category = await prisma.category.upsert({
        where: { slug: categorySlug },
        update: {},
        create: {
          name: categoryName,
          slug: categorySlug,
        },
      });
      targetCategoryId = category.id;
    }

    const slug = slugify(data.name);

    // Görsel URL'lerini belirle (Girilen URL / Dosya Data URL veya türe göre yüksek çözünürlüklü Unsplash görseli)
    const resolvedImages: string[] = [];
    if (data.images && data.images.length > 0) {
      resolvedImages.push(...data.images.filter(Boolean));
    } else if (data.imageUrl && data.imageUrl.trim()) {
      resolvedImages.push(data.imageUrl.trim());
    } else {
      resolvedImages.push(
        data.type === "RENTAL"
          ? "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80"
          : data.type === "SALE"
          ? "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80"
          : "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80"
      );
    }

    // 3. Transaction ile Product, Inventory ve RentalPricing oluştur
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description || `${data.name} - Yüksek kaliteli hibrit platform ürünü.`,
          type: data.type as ProductType,
          salePrice: data.salePrice || (data.type === "RENTAL" ? null : 1000),
          categoryId: targetCategoryId,
          subCategoryId: targetSubCategoryId || null,
          vendorId: vendor.id,
          images: resolvedImages,
        },
      });

      // Envanter oluştur
      await tx.inventory.create({
        data: {
          productId: product.id,
          totalStock: data.totalStock !== undefined ? data.totalStock : (data.type === "RENTAL" ? 0 : 20),
          reservedStock: 0,
          rentalQuantity: data.rentalQuantity !== undefined ? data.rentalQuantity : (data.type === "SALE" ? 0 : 5),
        },
      });

      // Kiralık veya her ikisi ise fiyatlandırma oluştur
      if (data.type === "RENTAL" || data.type === "BOTH") {
        await tx.rentalPricing.create({
          data: {
            productId: product.id,
            dailyPrice: data.dailyPrice || 150,
            weeklyPrice: data.weeklyPrice || (data.dailyPrice ? data.dailyPrice * 6 : 900),
            depositAmount: data.depositAmount || 1000,
            minDays: 1,
            maxDays: 30,
          },
        });
      }

      return product;
    });

    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/vendor/products");
    safeRevalidate("/products");

    return {
      success: true,
      message: `"${newProduct.name}" ürünü başarıyla veritabanına kaydedildi ve mağazanızda yayına alındı!`,
      product: newProduct,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ürün oluşturulamadı.";
    return { success: false, error: msg };
  }
}

/**
 * Satıcının mevcut ürününü ve stoklarını günceller
 */
export async function updateVendorProduct(data: UpdateProductInput) {
  try {
    const {
      productId,
      name,
      imageUrl,
      images,
      salePrice,
      dailyPrice,
      depositAmount,
      totalStock,
      rentalQuantity,
      categoryId,
      subCategoryId,
    } = data;

    await prisma.$transaction(async (tx) => {
      // 1. Ürün temel bilgilerini güncelle
      const productUpdate: any = {
        ...(name ? { name } : {}),
        ...(salePrice !== undefined ? { salePrice } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(subCategoryId !== undefined ? { subCategoryId: subCategoryId || null } : {}),
      };

      if (imageUrl && imageUrl.trim()) {
        productUpdate.images = [imageUrl.trim()];
      } else if (images && images.length > 0) {
        productUpdate.images = images.filter(Boolean);
      }

      await tx.product.update({
        where: { id: productId },
        data: productUpdate,
      });

      // 2. Envanter güncelle
      if (totalStock !== undefined || rentalQuantity !== undefined) {
        await tx.inventory.upsert({
          where: { productId },
          update: {
            ...(totalStock !== undefined ? { totalStock } : {}),
            ...(rentalQuantity !== undefined ? { rentalQuantity } : {}),
          },
          create: {
            productId,
            totalStock: totalStock || 0,
            rentalQuantity: rentalQuantity || 0,
          },
        });
      }

      // 3. Kiralama fiyatı güncelle
      if (dailyPrice !== undefined || depositAmount !== undefined) {
        await tx.rentalPricing.upsert({
          where: { productId },
          update: {
            ...(dailyPrice !== undefined ? { dailyPrice, weeklyPrice: dailyPrice * 6 } : {}),
            ...(depositAmount !== undefined ? { depositAmount } : {}),
          },
          create: {
            productId,
            dailyPrice: dailyPrice || 150,
            weeklyPrice: dailyPrice ? dailyPrice * 6 : 900,
            depositAmount: depositAmount || 1000,
            minDays: 1,
            maxDays: 30,
          },
        });
      }
    });

    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/vendor/products");
    safeRevalidate("/products");

    return {
      success: true,
      message: "Ürün bilgileri, görseli ve stoklar başarıyla güncellendi.",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Güncelleme başarısız.";
    return { success: false, error: msg };
  }
}

/**
 * Satıcı ürünlerinin güncel veritabanı listesini çeker
 */
export async function getVendorProductsList() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: true,
        rentalPricing: true,
        category: true,
        subCategory: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map((p) => {
      const primaryImage =
        p.images && p.images.length > 0
          ? p.images[0]
          : p.type === "RENTAL"
          ? "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80"
          : "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80";

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type as "SALE" | "RENTAL" | "BOTH",
        images: p.images,
        imageUrl: primaryImage,
        categoryId: p.categoryId,
        categoryName: p.category?.name || "Outdoor & Kamp",
        subCategoryId: p.subCategoryId,
        subCategoryName: p.subCategory?.name || undefined,
        saleStock: p.inventory?.totalStock || 0,
        rentalUnits: p.inventory?.rentalQuantity || 0,
        activeRented: 0,
        salePrice: p.salePrice ? Number(p.salePrice) : undefined,
        dailyPrice: p.rentalPricing?.dailyPrice ? Number(p.rentalPricing.dailyPrice) : undefined,
        weeklyPrice: p.rentalPricing?.weeklyPrice ? Number(p.rentalPricing.weeklyPrice) : undefined,
        depositAmount: p.rentalPricing?.depositAmount ? Number(p.rentalPricing.depositAmount) : undefined,
        occupancyRate: 0,
      };
    });
  } catch {
    return [];
  }
}


export interface UpdateProductStockInput {
  productId: string;
  totalStock: number;
  rentalQuantity: number;
}

/**
 * Satıcı ürününün satış stoku ve kiralık birim sayısını günceller
 */
export async function updateProductStock(data: UpdateProductStockInput) {
  try {
    const { productId, totalStock, rentalQuantity } = data;

    if (!productId) {
      return { success: false, error: "Geçersiz ürün kimliği." };
    }

    const parsedTotal = Math.max(0, parseInt(String(totalStock), 10) || 0);
    const parsedRental = Math.max(0, parseInt(String(rentalQuantity), 10) || 0);

    const inventory = await prisma.inventory.upsert({
      where: { productId },
      update: {
        totalStock: parsedTotal,
        rentalQuantity: parsedRental,
      },
      create: {
        productId,
        totalStock: parsedTotal,
        rentalQuantity: parsedRental,
        reservedStock: 0,
      },
      include: {
        product: {
          select: { name: true, type: true },
        },
      },
    });

    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/vendor/products");
    safeRevalidate("/products");

    return {
      success: true,
      message: `"${inventory.product?.name || "Ürün"}" stoku başarıyla güncellendi (Satış: ${parsedTotal}, Kiralık: ${parsedRental}).`,
      inventory,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stok güncellenemedi.";
    return { success: false, error: msg };
  }
}
