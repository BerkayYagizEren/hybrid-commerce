"use server";

import prisma from "@/lib/prisma";
import { ShowcaseType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializeProduct, type SerializedProduct } from "@/features/products/types";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside request context
  }
}

// ─────────────────────────────────────────────
// Slider Yönetimi
// ─────────────────────────────────────────────
export async function getActiveSliders() {
  try {
    return await prisma.slider.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  } catch (error) {
    console.error("getActiveSliders error:", error);
    return [];
  }
}

export async function getAllSliders() {
  try {
    return await prisma.slider.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function createSlider(data: {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
}) {
  try {
    if (!data.title || !data.imageUrl) {
      return { success: false, error: "Başlık ve görsel URL zorunludur." };
    }

    const slider = await prisma.slider.create({
      data: {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        imageUrl: data.imageUrl.trim(),
        linkUrl: data.linkUrl?.trim() || null,
        order: Number(data.order) || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    safeRevalidate("/");
    safeRevalidate("/admin/showcase");
    return { success: true, slider };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Slider oluşturulamadı.";
    return { success: false, error: msg };
  }
}

export async function deleteSlider(id: string) {
  try {
    await prisma.slider.delete({ where: { id } });
    safeRevalidate("/");
    safeRevalidate("/admin/showcase");
    return { success: true };
  } catch {
    return { success: false, error: "Slider silinemedi." };
  }
}

// ─────────────────────────────────────────────
// Vitrin Ürünleri (Showcase Items)
// ─────────────────────────────────────────────
export async function getShowcaseProducts(
  type: ShowcaseType = "TREND"
): Promise<SerializedProduct[]> {
  try {
    const items = await prisma.showcaseItem.findMany({
      where: {
        type,
        product: { isDeleted: false, active: true },
      },
      include: {
        product: {
          include: {
            category: true,
            subCategory: true,
            inventory: true,
            rentalPricing: true,
            reviews: { where: { status: "APPROVED" }, select: { rating: true } },
            _count: { select: { reviews: { where: { status: "APPROVED" } } } },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return items.map((item) => serializeProduct(item.product));
  } catch (error) {
    console.error("getShowcaseProducts error:", error);
    return [];
  }
}

export async function addShowcaseItem(productId: string, type: ShowcaseType = "TREND", order: number = 0) {
  try {
    const existing = await prisma.showcaseItem.findFirst({
      where: { productId, type },
    });

    if (existing) {
      return { success: false, error: "Bu ürün bu vitrinde zaten ekli." };
    }

    const item = await prisma.showcaseItem.create({
      data: {
        productId,
        type,
        order,
      },
      include: { product: true },
    });

    const serializedItem = {
      id: item.id,
      productId: item.productId,
      type: item.type,
      order: item.order,
      createdAt: item.createdAt,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            type: item.product.type,
            images: item.product.images,
            salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
          }
        : null,
    };

    safeRevalidate("/");
    safeRevalidate("/admin/showcase");
    return { success: true, item: serializedItem };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Vitrine eklenemedi.";
    return { success: false, error: msg };
  }
}

export async function removeShowcaseItem(id: string) {
  try {
    await prisma.showcaseItem.delete({ where: { id } });
    safeRevalidate("/");
    safeRevalidate("/admin/showcase");
    return { success: true };
  } catch {
    return { success: false, error: "Vitrinden kaldırılamadı." };
  }
}

export async function getAllShowcaseItems() {
  try {
    const items = await prisma.showcaseItem.findMany({
      include: { product: true },
      orderBy: [{ type: "asc" }, { order: "asc" }],
    });

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      type: item.type,
      order: item.order,
      createdAt: item.createdAt,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            type: item.product.type,
            images: item.product.images,
            salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
          }
        : null,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Instagram Akışı (Instagram Posts)
// ─────────────────────────────────────────────
export async function getActiveInstagramPosts() {
  try {
    return await prisma.instagramPost.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createInstagramPost(data: {
  postUrl: string;
  imageUrl: string;
  caption?: string;
  order?: number;
}) {
  try {
    const post = await prisma.instagramPost.create({
      data: {
        postUrl: data.postUrl.trim(),
        imageUrl: data.imageUrl.trim(),
        caption: data.caption?.trim() || null,
        order: Number(data.order) || 0,
        isActive: true,
      },
    });

    safeRevalidate("/");
    safeRevalidate("/admin/showcase");
    return { success: true, post };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Post eklenemedi.";
    return { success: false, error: msg };
  }
}

export async function deleteInstagramPost(id: string) {
  try {
    await prisma.instagramPost.delete({ where: { id } });
    safeRevalidate("/");
    safeRevalidate("/admin/showcase");
    return { success: true };
  } catch {
    return { success: false, error: "Post silinemedi." };
  }
}
