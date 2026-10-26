import { NextRequest, NextResponse } from "next/server";
import { AvailabilityService } from "@/features/rental/services/availability.service";

/**
 * GET /api/rentals/availability?productId=xxx&year=2026&month=10
 * Belirtilen ay için bloklanmış tarih aralıklarını getir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");

    if (!productId || isNaN(year) || isNaN(month)) {
      return NextResponse.json(
        { error: "productId, year ve month parametreleri gereklidir" },
        { status: 400 }
      );
    }

    const blocks = await AvailabilityService.getBlockedDatesForMonth(
      productId,
      year,
      month
    );

    return NextResponse.json({ blocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/rentals/availability
 * Müsaitlik kontrolü yap
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await AvailabilityService.check(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
