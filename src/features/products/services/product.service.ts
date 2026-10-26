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

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
          inventory: true,
          rentalPricing: true,
          vendor: {
            select: { id: true, name: true },
          },
          reviews: {
            where: { status: "APPROVED" },
            select: { rating: true },
          },
          _count: {
            select: {
              reviews: { where: { status: "APPROVED" } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    // Dinamik ortalama puan ve onaylanmış yorum miktarını hesapla
    const products = rawProducts.map((p) => {
      const reviewCount = p._count?.reviews ?? p.reviews?.length ?? p.reviewCount ?? 0;
      let averageRating = p.averageRating ? Number(p.averageRating) : 0;

      if (p.reviews && p.reviews.length > 0) {
        const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
        averageRating = Number((sum / p.reviews.length).toFixed(1));
      }

      return {
        ...p,
        averageRating,
        reviewCount,
      };
    });

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
    const p = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        subCategory: true,
        inventory: true,
        rentalPricing: true,
        vendor: {
          select: { id: true, name: true },
        },
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        _count: {
          select: {
            reviews: { where: { status: "APPROVED" } },
          },
        },
      },
    });

    if (!p) return null;

    const reviewCount = p._count?.reviews ?? p.reviews?.length ?? p.reviewCount ?? 0;
    let averageRating = p.averageRating ? Number(p.averageRating) : 0;
    if (p.reviews && p.reviews.length > 0) {
      const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Number((sum / p.reviews.length).toFixed(1));
    }

    return {
      ...p,
      averageRating,
      reviewCount,
    } as ProductWithDetails;
  }

  /**
   * ID ile tekil ürün getir
   */
  static async getById(id: string): Promise<ProductWithDetails | null> {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        inventory: true,
        rentalPricing: true,
        vendor: {
          select: { id: true, name: true },
        },
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        _count: {
          select: {
            reviews: { where: { status: "APPROVED" } },
          },
        },
      },
    });

    if (!p) return null;

    const reviewCount = p._count?.reviews ?? p.reviews?.length ?? p.reviewCount ?? 0;
    let averageRating = p.averageRating ? Number(p.averageRating) : 0;
    if (p.reviews && p.reviews.length > 0) {
      const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Number((sum / p.reviews.length).toFixed(1));
    }

    return {
      ...p,
      averageRating,
      reviewCount,
    } as ProductWithDetails;
  }
}
