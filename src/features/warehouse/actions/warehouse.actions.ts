"use server";

import { WarehouseService } from "../services/warehouse.service";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export async function getWarehousesAction() {
  try {
    return await WarehouseService.getWarehouses();
  } catch (error) {
    console.error("getWarehousesAction error:", error);
    return [];
  }
}

export async function createWarehouseAction(data: {
  name: string;
  code: string;
  address?: string;
  isDefault?: boolean;
}) {
  try {
    const wh = await WarehouseService.createWarehouse(data);
    safeRevalidate("/admin/warehouses");
    return { success: true, warehouse: wh };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Depo oluşturulamadı.";
    return { success: false, error: msg };
  }
}

export async function setWarehouseStockAction(data: {
  productId: string;
  warehouseId: string;
  quantity: number;
}) {
  try {
    const stock = await WarehouseService.setProductWarehouseStock(
      data.productId,
      data.warehouseId,
      data.quantity
    );
    safeRevalidate("/admin/warehouses");
    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/products");
    return { success: true, stock };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stok güncellenemedi.";
    return { success: false, error: msg };
  }
}
