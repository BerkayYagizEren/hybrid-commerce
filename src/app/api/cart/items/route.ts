import { NextRequest, NextResponse } from "next/server";
import { CartService } from "@/features/cart/services/cart.service";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";
import type { AddToCartRequest } from "@/features/cart/types";

/**
 * POST /api/cart/items
 * Sepete yeni ürün ekle
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = await verifySessionToken(token);
    const sessionId = request.cookies.get("session_id")?.value ?? "demo-session";
    const cart = await CartService.getOrCreateCart(sessionUser?.id, sessionId);

    const body: AddToCartRequest = await request.json();
    const item = await CartService.addItem(cart.id, body);
    const summary = await CartService.getSummary(cart.id);

    return NextResponse.json({ success: true, item, summary });
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
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = await verifySessionToken(token);
    const sessionId = request.cookies.get("session_id")?.value ?? "demo-session";
    const cart = await CartService.getOrCreateCart(sessionUser?.id, sessionId);

    const { itemId, quantity } = await request.json();
    await CartService.updateItemQuantity(itemId, quantity);
    const summary = await CartService.getSummary(cart.id);

    return NextResponse.json({ success: true, summary });
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
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = await verifySessionToken(token);
    const sessionId = request.cookies.get("session_id")?.value ?? "demo-session";
    const cart = await CartService.getOrCreateCart(sessionUser?.id, sessionId);

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId gereklidir" }, { status: 400 });
    }

    await CartService.removeItem(itemId);
    const summary = await CartService.getSummary(cart.id);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
