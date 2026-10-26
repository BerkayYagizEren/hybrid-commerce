import { NextRequest, NextResponse } from "next/server";
import { CartService } from "@/features/cart/services/cart.service";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";

/**
 * GET /api/cart
 * Mevcut sepeti ve özetini getir.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = await verifySessionToken(token);
    const sessionId = request.cookies.get("session_id")?.value ?? "demo-session";

    const cart = await CartService.getOrCreateCart(sessionUser?.id, sessionId);
    const summary = await CartService.getSummary(cart.id);

    return NextResponse.json({ cartId: cart.id, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
