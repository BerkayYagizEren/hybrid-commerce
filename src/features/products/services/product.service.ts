import prisma from "@/lib/prisma";
import type { ProductFilterParams, ProductListResult, ProductWithDetails } from "../types";

/**
 * Ürün Servisi
 * Medusa/Vendure headless mimari yaklaşımından esinlenmiştir.
 */
export class ProductService {
  /**
   * Ürünleri filtrele ve listele (pagination destekli)
   */
  static async list(params: ProductFilterParams = {}): Promise<ProductListResult> {
    const { type, categorySlug, subCategorySlug, search, minPrice, maxPrice, page = 1, limit = 12 } = params;
    const skip = (page - 1) * limit;

    const where: any = { active: true };
    const andConditions: any[] = [];

    if (type) where.type = type;

    if (subCategorySlug) {
      where.subCategory = { slug: subCategorySlug };
      if (categorySlug) {
        where.category = { slug: categorySlug };
      }
    } else if (categorySlug) {
      andConditions.push({
        OR: [
          { category: { slug: categorySlug } },
          { category: { parent: { slug: categorySlug } } },
          { subCategory: { slug: categorySlug } },
          { subCategory: { parent: { slug: categorySlug } } },
        ],
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (minPrice || maxPrice) {
      where.salePrice = {};
      if (minPrice) where.salePrice.gte = minPrice;
      if (maxPrice) where.salePrice.lte = maxPrice;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
          inventory: true,
          rentalPricing: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products as ProductWithDetails[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Slug ile tekil ürün getir
   */
  static async getBySlug(slug: string): Promise<ProductWithDetails | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        subCategory: true,
        inventory: true,
        rentalPricing: true,
      },
    }) as Promise<ProductWithDetails | null>;
  }

  /**
   * ID ile tekil ürün getir
   */
  static async getById(id: string): Promise<ProductWithDetails | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        inventory: true,
        rentalPricing: true,
      },
    }) as Promise<ProductWithDetails | null>;
  }
}
