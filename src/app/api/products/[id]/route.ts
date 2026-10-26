import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/features/products/services/product.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getById(id);

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
