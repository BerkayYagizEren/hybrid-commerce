import { NextRequest, NextResponse } from "next/server";
import { CheckoutService } from "@/features/checkout/services/checkout.service";
import { CartService } from "@/features/cart/services/cart.service";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";
import prisma from "@/lib/prisma";

/**
 * POST /api/checkout
 * Checkout işlemini gerçekleştir, ödemeyi tahsil et,
 * depozitoyu provoke/escrow et ve siparişi PAID durumuna getir.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = await verifySessionToken(token);

    let userId = sessionUser?.id || body.userId;

    // Eğer geçerli bir userId yoksa demo müşteri kullanıcısını bul veya oluştur
    if (!userId || userId === "demo-user") {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "CUSTOMER" },
      });
      if (defaultUser) {
        userId = defaultUser.id;
      } else {
        const createdUser = await prisma.user.create({
          data: {
            email: "demo-customer@hybridcommerce.dev",
            name: "Demo Müşteri",
            password: "hashed_dummy_password",
            role: "CUSTOMER",
          },
        });
        userId = createdUser.id;
      }
    }

    const sessionId = request.cookies.get("session_id")?.value ?? "demo-session";

    // Sepeti bul (Önce kullanıcının sepeti, yoksa session sepeti)
    let cart = sessionUser?.id
      ? await prisma.cart.findFirst({ where: { userId: sessionUser.id } })
      : null;

    if (!cart) {
      cart = await CartService.getOrCreateCart(undefined, sessionId);
    }

    const result = await CheckoutService.process({
      userId,
      cartId: cart.id,
      shippingAddress: body.shippingAddress,
      paymentCard: body.paymentCard,
      paymentMethod: body.paymentMethod,
      couponCode: body.couponCode,
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
