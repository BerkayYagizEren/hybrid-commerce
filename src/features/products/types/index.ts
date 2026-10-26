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
  averageRating: number;
  reviewCount: number;
};

/**
 * Prisma Decimal veya benzeri sayısal değerleri güvenli şekilde JavaScript number tipine dönüştürür.
 * null veya undefined ise null döner.
 */
export function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (typeof (val as { toNumber?: () => number }).toNumber === "function") {
    return (val as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Prisma Product nesnesini React Client Component'lerine aktarmak üzere
 * tüm Decimal alanlarını Number'a dönüştürerek serileştirir.
 * Bu sayede "Decimal objects are not supported" hatası tamamen önlenir.
 */
export function serializeProduct(
  product: ProductWithDetails | SerializedProduct | any
): SerializedProduct {
  if (!product) return product;

  const salePrice = toNumber(product.salePrice);

  const rentalPricing: SerializedRentalPricing | null = product.rentalPricing
    ? {
        ...product.rentalPricing,
        dailyPrice: toNumber(product.rentalPricing.dailyPrice) ?? 0,
        weeklyPrice: toNumber(product.rentalPricing.weeklyPrice),
        monthlyPrice: toNumber(product.rentalPricing.monthlyPrice),
        depositAmount: toNumber(product.rentalPricing.depositAmount) ?? 0,
      }
    : null;

  const averageRating = toNumber(product.averageRating) ?? 0;
  const reviewCount = product.reviewCount || 0;

  return {
    ...product,
    salePrice,
    rentalPricing,
    averageRating,
    reviewCount,
    category: product.category || null,
    subCategory: product.subCategory || null,
    inventory: product.inventory || null,
    vendor: product.vendor || null,
    reviews: product.reviews || [],
    _count: product._count,
  };
}

/**
 * Dizi halindeki ürünleri serileştirir
 */
export function serializeProducts(
  products: (ProductWithDetails | SerializedProduct | any)[]
): SerializedProduct[] {
  return products.map(serializeProduct);
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
  products: SerializedProduct[];
  total: number;
  page: number;
  totalPages: number;
}
