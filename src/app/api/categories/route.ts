import { NextResponse } from "next/server";
import { getCategoriesTree } from "@/features/categories/actions/category.actions";

export async function GET() {
  try {
    const tree = await getCategoriesTree();
    return NextResponse.json({ categories: tree });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kategoriler getirilemedi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
