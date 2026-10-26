"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  CategoryItem,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryActionResult,
} from "../types";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI veya test senaryolarında request context olmadığı durumlar için güvenli pas geçme
  }
}

function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  return text
    .split("")
    .map((char) => trMap[char] || char)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Mega Menü ve Kategori Ağacı için Ana Kategorileri ve Alt Kategorilerini Getir
 */
export async function getCategoriesTree(): Promise<CategoryItem[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            _count: {
              select: {
                products: true,
                subProducts: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            products: true,
            subProducts: true,
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return categories as unknown as CategoryItem[];
  } catch (error) {
    console.error("getCategoriesTree error:", error);
    return [];
  }
}

/**
 * Dropdown seçimleri için tüm kategorileri düz liste olarak getir
 */
export async function getAllCategories(): Promise<CategoryItem[]> {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
            subProducts: true,
            children: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return categories as unknown as CategoryItem[];
  } catch (error) {
    console.error("getAllCategories error:", error);
    return [];
  }
}

/**
 * Yeni Kategori veya Alt Kategori Oluştur
 */
export async function createCategory(
  data: CreateCategoryInput
): Promise<CategoryActionResult> {
  try {
    if (!data.name || !data.name.trim()) {
      return { success: false, error: "Kategori adı zorunludur." };
    }

    let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);
    if (!slug) {
      slug = `kat-${Date.now().toString().slice(-6)}`;
    }

    // Slug çakışması kontrolü
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Parent kontrolü (Eğer verilmişse var mı?)
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        return { success: false, error: "Seçilen üst ana kategori bulunamadı." };
      }
    }

    const newCategory = await prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        parentId: data.parentId || null,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    safeRevalidate("/admin/categories");
    safeRevalidate("/admin/dashboard");
    safeRevalidate("/products");
    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/vendor/products");

    const categoryType = newCategory.parentId ? "Alt Kategori" : "Ana Kategori";

    return {
      success: true,
      message: `"${newCategory.name}" adlı ${categoryType} başarıyla oluşturuldu!`,
      category: newCategory as unknown as CategoryItem,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kategori oluşturulamadı.";
    return { success: false, error: msg };
  }
}

/**
 * Kategori Güncelle
 */
export async function updateCategory(
  data: UpdateCategoryInput
): Promise<CategoryActionResult> {
  try {
    if (!data.id) {
      return { success: false, error: "Kategori kimliği eksik." };
    }
    if (!data.name || !data.name.trim()) {
      return { success: false, error: "Kategori adı boş bırakılamaz." };
    }

    // Kendini kendi üst kategorisi yapamaz
    if (data.parentId && data.parentId === data.id) {
      return { success: false, error: "Bir kategori kendi kendisinin üst kategorisi olamaz." };
    }

    let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);

    // Kendi dışındaki başka bir kategori bu slug'ı kullanıyor mu?
    const existing = await prisma.category.findFirst({
      where: {
        slug,
        NOT: { id: data.id },
      },
    });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const updated = await prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        slug,
        description: data.description !== undefined ? data.description : undefined,
        ...(data.parentId !== undefined ? { parentId: data.parentId || null } : {}),
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    safeRevalidate("/admin/categories");
    safeRevalidate("/admin/dashboard");
    safeRevalidate("/products");
    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/vendor/products");

    return {
      success: true,
      message: `"${updated.name}" kategorisi başarıyla güncellendi.`,
      category: updated as unknown as CategoryItem,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kategori güncellenemedi.";
    return { success: false, error: msg };
  }
}

/**
 * Kategori Sil
 */
export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  try {
    if (!id) {
      return { success: false, error: "Kategori kimliği belirtilmelidir." };
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: { products: true, subProducts: true },
        },
      },
    });

    if (!category) {
      return { success: false, error: "Silinmek istenen kategori bulunamadı." };
    }

    // Bağlı ürünlerin categoryId veya subCategoryId referanslarını güvenle sıfırla
    await prisma.$transaction(async (tx) => {
      // 1. Doğrudan bu kategoriye bağlı ürünlerin kategorisini null yap
      await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });

      await tx.product.updateMany({
        where: { subCategoryId: id },
        data: { subCategoryId: null },
      });

      // 2. Varsa alt kategorilerin de ürün bağlantılarını sıfırla
      if (category.children.length > 0) {
        const childIds = category.children.map((c) => c.id);
        await tx.product.updateMany({
          where: {
            OR: [
              { categoryId: { in: childIds } },
              { subCategoryId: { in: childIds } },
            ],
          },
          data: {
            subCategoryId: null,
          },
        });
      }

      // 3. Kategoriyi sil (Cascade ile alt kategoriler de silinir)
      await tx.category.delete({
        where: { id },
      });
    });

    safeRevalidate("/admin/categories");
    safeRevalidate("/admin/dashboard");
    safeRevalidate("/products");
    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/vendor/products");

    return {
      success: true,
      message: `"${category.name}" kategorisi ve bağlı alt kırılımları başarıyla silindi.`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kategori silinemedi.";
    return { success: false, error: msg };
  }
}
