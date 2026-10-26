import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/features/products/services/product.service";
import type { ProductType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await ProductService.list({
      type: searchParams.get("type") as ProductType | undefined,
      categorySlug: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 12,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
