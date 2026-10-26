"use server";

import prisma from "@/lib/prisma";

export interface CustomerOrderDisplay {
  id: string;
  date: string;
  status: "CONFIRMED" | "DELIVERED" | "PROCESSING" | "COMPLETED";
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: {
    id: string;
    name: string;
    type: "SALE" | "RENTAL";
    productImage?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rentalId?: string;
    rentalStart?: string;
    rentalEnd?: string;
    remainingDays?: number;
    depositAmount?: number;
    rentalStatus?: "ACTIVE" | "COMPLETED" | "UPCOMING" | "RETURN_REQUESTED";
  }[];
}

/**
 * Müşterinin gerçek siparişlerini snapshot verileriyle birlikte getirir
 */
export async function getCustomerOrdersList(userEmail?: string): Promise<CustomerOrderDisplay[]> {
  try {
    let user = userEmail
      ? await prisma.user.findUnique({ where: { email: userEmail } })
      : await prisma.user.findFirst({ where: { role: "CUSTOMER" } });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    const orders = await prisma.order.findMany({
      where: user ? { userId: user.id } : undefined,
      include: {
        user: true,
        items: {
          include: {
            product: true,
            rental: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => {
      return {
        id: order.id,
        date: order.createdAt.toISOString(),
        status: order.status as any,
        totalAmount: Number(order.totalAmount),
        customerName: order.user?.name || "Müşteri",
        customerEmail: order.user?.email || "musteri@example.com",
        customerAddress: "İstanbul, Türkiye",
        items: order.items.map((item) => {
          // SNAPSHOT KORUMASI:
          // Satıcı sonradan ürünü güncellese bile, sipariş anındaki snapshot verileri kullanılır!
          const snapshotName = item.productName || item.product.name;
          const snapshotImage =
            item.productImage || (item.product.images && item.product.images[0]) || "";
          const snapshotPrice = Number(item.priceAtPurchase || item.unitPrice);

          let remainingDays = 0;
          let rentalStatus = item.rental?.status as any;
          if (item.rental) {
            const diff = new Date(item.rental.endDate).getTime() - Date.now();
            remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
          }

          return {
            id: item.id,
            name: snapshotName,
            type: item.type as "SALE" | "RENTAL",
            productImage: snapshotImage,
            quantity: item.quantity,
            unitPrice: snapshotPrice,
            totalPrice: Number(item.totalPrice),
            rentalId: item.rental?.id,
            rentalStart: item.rental?.startDate.toISOString(),
            rentalEnd: item.rental?.endDate.toISOString(),
            remainingDays,
            depositAmount: item.rental ? Number(item.rental.depositAmount) : 0,
            rentalStatus,
          };
        }),
      };
    });
  } catch (err) {
    console.error("getCustomerOrdersList error:", err);
    return [];
  }
}
