import prisma from "@/lib/prisma";
import {
  serializeProduct,
  type ProductFilterParams,
  type ProductListResult,
  type ProductWithDetails,
  type SerializedProduct,
  type ProductSortOption,
} from "../types";

/**
 * Ürün Servisi
 * Medusa/Vendure headless mimari yaklaşımından esinlenmiştir.
 */
export class ProductService {
  /**
   * sortBy parametresine göre Prisma dinamik orderBy koşullarını döner
   * 
   * recommended -> Önerilen Sıralama (updatedAt: 'desc')
   * price_asc -> Fiyat: Düşükten Yükseğe (salePrice: 'asc')
   * price_desc -> Fiyat: Yüksekten Düşüğe (salePrice: 'desc')
   * newest -> En Yeniler (createdAt: 'desc')
   * best_seller -> En Çok Satanlar (orderItems: { _count: 'desc' })
   * most_rented -> En Çok Kiralananlar (rentals: { _count: 'desc' })
   * most_favorited -> En Favoriler (favorites: { _count: 'desc' })
   * rating -> En Yüksek Puanlılar (averageRating: 'desc')
   */
  static getOrderBy(sortBy?: ProductSortOption | string): any {
    switch (sortBy) {
      case "price_asc":
      case "price-asc":
        return { salePrice: { sort: "asc", nulls: "last" } };
      case "price_desc":
      case "price-desc":
        return { salePrice: { sort: "desc", nulls: "last" } };
      case "newest":
        return { createdAt: "desc" };
      case "best_seller":
      case "bestseller":
      case "best-seller":
        return { orderItems: { _count: "desc" } };
      case "most_rented":
      case "most-rented":
        return { rentals: { _count: "desc" } };
      case "most_favorited":
      case "most-favorited":
      case "favorites":
        return { favorites: { _count: "desc" } };
      case "rating":
      case "rating_desc":
        return [{ averageRating: "desc" }, { reviewCount: "desc" }];
      case "recommended":
      default:
        return { updatedAt: "desc" };
    }
  }

  /**
   * Ürünleri filtrele ve listele (pagination ve dinamik sıralama destekli)
   */
  static async list(params: ProductFilterParams = {}): Promise<ProductListResult> {
    const {
      type,
      categorySlug,
      subCategorySlug,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
      showcaseType,
      showcaseTitle,
      sortBy = "recommended",
    } = params;
    const skip = (page - 1) * limit;

    const where: any = { active: true, isDeleted: false };
    const andConditions: any[] = [];

    if (showcaseType) {
      where.showcaseItems = {
        some: {
          type: showcaseType,
          ...(showcaseType === "CUSTOM" && showcaseTitle ? { title: showcaseTitle } : {}),
        },
      };
    }

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

    const orderBy = ProductService.getOrderBy(sortBy);

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
              orderItems: true,
              rentals: true,
              favorites: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    // Dinamik ortalama puan ve onaylanmış yorum miktarını hesapla ve Decimal alanları serileştir
    const products: SerializedProduct[] = rawProducts.map((p) => {
      const reviewCount = p._count?.reviews ?? p.reviews?.length ?? p.reviewCount ?? 0;
      let averageRating = p.averageRating ? Number(p.averageRating) : 0;

      if (p.reviews && p.reviews.length > 0) {
        const sum = p.reviews.reduce((acc, r) => acc + r.rating, 0);
        averageRating = Number((sum / p.reviews.length).toFixed(1));
      }

      return serializeProduct({
        ...p,
        averageRating,
        reviewCount,
      });
    });

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Slug ile tekil ürün getir (Decimal alanları serileştirilmiş)
   */
  static async getBySlug(slug: string): Promise<SerializedProduct | null> {
    const p = await prisma.product.findFirst({
      where: { slug, isDeleted: false },
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

    return serializeProduct({
      ...p,
      averageRating,
      reviewCount,
    });
  }

  /**
   * ID ile tekil ürün getir (Decimal alanları serileştirilmiş)
   */
  static async getById(id: string): Promise<SerializedProduct | null> {
    const p = await prisma.product.findFirst({
      where: { id, isDeleted: false },
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

    return serializeProduct({
      ...p,
      averageRating,
      reviewCount,
    });
  }
}
