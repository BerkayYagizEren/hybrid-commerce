import { ProductDetail } from "@/features/products/components/ProductDetail";
import { ProductService } from "@/features/products/services/product.service";
import { serializeProduct } from "@/features/products/types";
import { notFound } from "next/navigation";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const rawProduct = await ProductService.getBySlug(slug);

  if (!rawProduct) {
    notFound();
  }

  // Prisma Decimal alanları Client Component sınırından önce Number'a dönüştürülüyor
  const product = serializeProduct(rawProduct);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProductDetail product={product} />
    </div>
  );
}
