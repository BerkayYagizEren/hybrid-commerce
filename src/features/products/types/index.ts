import type { Product, Category, Inventory, RentalPricing, ProductType } from "@prisma/client";

/** Ürün ile birlikte ilişkili verileri içeren genişletilmiş tip (Prisma Decimal içerir) */
export type ProductWithDetails = Product & {
  category: Category | null;
  subCategory?: Category | null;
  inventory: Inventory | null;
  rentalPricing: RentalPricing | null;
  vendor?: { id: string; name: string | null } | null;
  reviews?: { rating: number }[];
  _count?: { reviews?: number };
};

/**
 * Client Component'lere güvenle aktarılabilen,
 * tüm Decimal alanları number tipine dönüştürülmüş kiralama fiyat tipi
 */
export type SerializedRentalPricing = Omit<
  RentalPricing,
  "dailyPrice" | "weeklyPrice" | "monthlyPrice" | "depositAmount"
> & {
  dailyPrice: number;
  weeklyPrice: number | null;
  monthlyPrice: number | null;
  depositAmount: number;
};

/**
 * Client Component'lere aktarılabilen serileştirilmiş ürün tipi
 */
export type SerializedProduct = Omit<
  Product,
  "salePrice"
> & {
  salePrice: number | null;
  category: Category | null;
  subCategory?: Category | null;
  inventory: Inventory | null;
  rentalPricing: SerializedRentalPricing | null;
  vendor?: { id: string; name: string | null } | null;
  reviews?: { rating: number }[];
  _count?: { reviews?: number };
};

/**
 * Prisma Product nesnesini React Client Component'lerine aktarmak üzere
 * tüm Decimal alanlarını Number'a dönüştürerek serileştirir.
 */
export function serializeProduct(product: ProductWithDetails): SerializedProduct {
  return {
    ...product,
    salePrice: product.salePrice !== null && product.salePrice !== undefined
      ? Number(product.salePrice)
      : null,
    subCategory: product.subCategory || null,
    vendor: product.vendor || null,
    reviews: product.reviews || [],
    _count: product._count,
    averageRating: product.averageRating !== null && product.averageRating !== undefined
      ? Number(product.averageRating)
      : 0,
    reviewCount: product.reviewCount || 0,
    rentalPricing: product.rentalPricing
      ? {
          ...product.rentalPricing,
          dailyPrice: Number(product.rentalPricing.dailyPrice),
          weeklyPrice:
            product.rentalPricing.weeklyPrice !== null && product.rentalPricing.weeklyPrice !== undefined
              ? Number(product.rentalPricing.weeklyPrice)
              : null,
          monthlyPrice:
            product.rentalPricing.monthlyPrice !== null && product.rentalPricing.monthlyPrice !== undefined
              ? Number(product.rentalPricing.monthlyPrice)
              : null,
          depositAmount: Number(product.rentalPricing.depositAmount),
        }
      : null,
  };
}

/** Ürün listeleme için filtre parametreleri */
export interface ProductFilterParams {
  type?: ProductType;
  categorySlug?: string;
  subCategorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

/** Ürün listesi sonucu (pagination ile) */
export interface ProductListResult {
  products: ProductWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}
