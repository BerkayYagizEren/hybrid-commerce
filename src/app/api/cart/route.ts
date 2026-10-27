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
    let sessionId = request.cookies.get("session_id")?.value;
    let shouldSetCookie = false;

    if (!sessionId && !sessionUser) {
      sessionId = crypto.randomUUID();
      shouldSetCookie = true;
    } else if (!sessionId) {
      sessionId = `sess_${sessionUser?.id || "demo"}`;
    }

    const cart = await CartService.getOrCreateCart(sessionUser?.id, sessionId);
    const summary = await CartService.getSummary(cart.id);

    const response = NextResponse.json({ cartId: cart.id, summary });
    if (shouldSetCookie && sessionId) {
      response.cookies.set("session_id", sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 gün
      });
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
