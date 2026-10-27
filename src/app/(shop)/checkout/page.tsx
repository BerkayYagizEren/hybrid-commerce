import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";
import { CartService } from "@/features/cart/services/cart.service";
import { CheckoutClient } from "./CheckoutClient";
import { B2BService } from "@/features/b2b/services/b2b.service";
import prisma from "@/lib/prisma";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const resolvedParams = await searchParams;
  const initialCoupon = resolvedParams?.coupon || "";

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = await verifySessionToken(token);
  const sessionId = cookieStore.get("session_id")?.value ?? "demo-session";

  let dealerFinancial = null;
  if (sessionUser?.id) {
    const d = await B2BService.getDealerFinancial(sessionUser.id);
    if (d) {
      dealerFinancial = {
        creditLimit: d.creditLimit,
        currentBalance: d.currentBalance,
        availableCredit: d.availableCredit,
        discountRate: d.discountRate,
      };
    }
  }

  let cart = sessionUser?.id
    ? await prisma.cart.findFirst({ where: { userId: sessionUser.id } })
    : null;

  if (!cart) {
    cart = await CartService.getOrCreateCart(undefined, sessionId);
  }

  let summary = null;
  try {
    summary = await CartService.getSummary(cart.id);
  } catch {
    summary = null;
  }

  return (
    <CheckoutClient
      initialSummary={summary}
      initialCouponCode={initialCoupon}
      dealerFinancial={dealerFinancial}
    />
  );
}
