import prisma from "@/lib/prisma";
import type { OrderDisplay } from "../types";

/**
 * Sipariş Servisi
 * Sipariş sorgulama ve durum yönetimi.
 */
export class OrderService {
  /**
   * Sipariş detayını getir
   */
  static async getById(orderId: string): Promise<OrderDisplay | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            rental: true,
          },
        },
      },
    });

    if (!order) return null;

    return {
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName || item.product.name,
        productImage: item.productImage || item.product.images[0] || "",
        type: item.type,
        quantity: item.quantity,
        unitPrice: Number(item.priceAtPurchase || item.unitPrice),
        priceAtPurchase: Number(item.priceAtPurchase || item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalInfo: item.rental
          ? {
              rentalId: item.rental.id,
              startDate: item.rental.startDate,
              endDate: item.rental.endDate,
              status: item.rental.status,
            }
          : undefined,
      })),
    };
  }

  /**
   * Kullanıcının siparişlerini listele
   */
  static async getUserOrders(userId: string): Promise<OrderDisplay[]> {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            rental: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName || item.product.name,
        productImage: item.productImage || item.product.images[0] || "",
        type: item.type,
        quantity: item.quantity,
        unitPrice: Number(item.priceAtPurchase || item.unitPrice),
        priceAtPurchase: Number(item.priceAtPurchase || item.unitPrice),
        totalPrice: Number(item.totalPrice),
        rentalInfo: item.rental
          ? {
              rentalId: item.rental.id,
              startDate: item.rental.startDate,
              endDate: item.rental.endDate,
              status: item.rental.status,
            }
          : undefined,
      })),
    }));
  }

  /**
   * Sipariş durumunu güncelle
   */
  static async updateStatus(orderId: string, status: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED") {
    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
