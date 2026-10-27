import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class WarehouseService {
  /**
   * Varsayılan ana depoyu getir veya yoksa oluştur (Merkez Depo)
   */
  static async getOrCreateDefaultWarehouse(tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    let defaultWh = await db.warehouse.findFirst({
      where: { isDefault: true },
    });

    if (!defaultWh) {
      defaultWh = await db.warehouse.findFirst({
        orderBy: { createdAt: "asc" },
      });
    }

    if (!defaultWh) {
      defaultWh = await db.warehouse.create({
        data: {
          name: "Merkez Ana Depo (Ana Şube)",
          code: "WH-MAIN-01",
          isDefault: true,
          address: "Lojistik Üssü No:1, İstanbul",
        },
      });
    }

    return defaultWh;
  }

  /**
   * Yeni depo / şube oluştur
   */
  static async createWarehouse(data: {
    name: string;
    code: string;
    address?: string;
    isDefault?: boolean;
  }) {
    const code = data.code.trim().toUpperCase();
    const existing = await prisma.warehouse.findUnique({ where: { code } });
    if (existing) {
      throw new Error(`"${code}" kodlu bir depo zaten mevcut.`);
    }

    if (data.isDefault) {
      await prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.warehouse.create({
      data: {
        name: data.name.trim(),
        code,
        address: data.address?.trim() || null,
        isDefault: Boolean(data.isDefault),
      },
    });
  }

  /**
   * Tüm depoları ve toplam stok kalemlerini getir
   */
  static async getWarehouses() {
    return prisma.warehouse.findMany({
      include: {
        stocks: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, salePrice: true },
            },
          },
        },
        _count: {
          select: { stocks: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  /**
   * Belirli bir depoda ürünün stok miktarını güncelle
   */
  static async setProductWarehouseStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;
    const safeQty = Math.max(0, quantity);

    const stock = await db.stock.upsert({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
      update: { quantity: safeQty },
      create: {
        productId,
        warehouseId,
        quantity: safeQty,
      },
    });

    // Toplam depo stoklarını topla ve ana Inventory tablosuna senkronize et
    const allWarehouseStocks = await db.stock.findMany({
      where: { productId },
    });
    const totalWarehouseQty = allWarehouseStocks.reduce((sum, s) => sum + s.quantity, 0);

    await db.inventory.upsert({
      where: { productId },
      update: { totalStock: totalWarehouseQty },
      create: { productId, totalStock: totalWarehouseQty, reservedStock: 0 },
    });

    return stock;
  }

  /**
   * Sipariş anında depodan stok düşümü (Stok Yetersiz kontrolü)
   */
  static async deductWarehouseStock(
    productId: string,
    quantity: number,
    warehouseId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;

    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const defaultWh = await this.getOrCreateDefaultWarehouse(tx);
      targetWarehouseId = defaultWh.id;
    }

    const currentStock = await db.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId: targetWarehouseId },
      },
    });

    const availableQuantity = currentStock?.quantity ?? 0;

    if (availableQuantity < quantity) {
      throw new Error(
        `Stok Yetersiz: İstenen ${quantity} adet ürün depoda bulunmuyor (Mevcut Depo Stoğu: ${availableQuantity}).`
      );
    }

    // Stok düşümü yap
    const updatedStock = await db.stock.update({
      where: { id: currentStock!.id },
      data: { quantity: { decrement: quantity } },
    });

    // Ana envanterle senkronize et
    await db.inventory.updateMany({
      where: { productId },
      data: { totalStock: { decrement: quantity } },
    });

    return updatedStock;
  }

  /**
   * Ürünün tüm depolardaki toplam stok miktarını getir
   */
  static async getProductTotalStock(productId: string) {
    const stocks = await prisma.stock.findMany({
      where: { productId },
      include: { warehouse: true },
    });
    const total = stocks.reduce((sum, s) => sum + s.quantity, 0);
    return { total, stocks };
  }
}
