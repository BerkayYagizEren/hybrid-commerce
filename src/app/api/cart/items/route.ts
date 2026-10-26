import { NextRequest, NextResponse } from "next/server";
import { CartService } from "@/features/cart/services/cart.service";
import type { AddToCartRequest } from "@/features/cart/types";

/**
 * POST /api/cart/items
 * Sepete yeni ürün ekle
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session_id")?.value ?? "demo-session";
    const cart = await CartService.getOrCreateCart(undefined, sessionId);

    const body: AddToCartRequest = await request.json();
    const item = await CartService.addItem(cart.id, body);

    return NextResponse.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * PATCH /api/cart/items
 * Sepet kaleminin miktarını güncelle
 */
export async function PATCH(request: NextRequest) {
  try {
    const { itemId, quantity } = await request.json();
    await CartService.updateItemQuantity(itemId, quantity);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/cart/items?itemId=xxx
 * Sepetten ürün kaldır
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId gereklidir" }, { status: 400 });
    }

    await CartService.removeItem(itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
