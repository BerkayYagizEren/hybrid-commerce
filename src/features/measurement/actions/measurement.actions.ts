"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface MeasurementItem {
  id: string;
  name: string;
  code: string;
  _count?: {
    products: number;
  };
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI or non-request context
  }
}

/**
 * Tüm ölçü birimlerini listele
 */
export async function getMeasurements(): Promise<MeasurementItem[]> {
  try {
    const list = await prisma.measurement.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return list as MeasurementItem[];
  } catch (error) {
    console.error("getMeasurements error:", error);
    return [];
  }
}

/**
 * Yeni ölçü birimi ekle
 */
export async function createMeasurement(data: { name: string; code: string }) {
  try {
    const name = data.name.trim();
    const code = data.code.trim().toUpperCase();

    if (!name || !code) {
      return { success: false, error: "Birim adı ve kodu zorunludur." };
    }

    const existing = await prisma.measurement.findUnique({
      where: { code },
    });
    if (existing) {
      return { success: false, error: `"${code}" kodlu ölçü birimi zaten mevcut.` };
    }

    const measurement = await prisma.measurement.create({
      data: { name, code },
    });

    safeRevalidate("/admin/measurements");
    safeRevalidate("/vendor/products/new");
    safeRevalidate("/vendor/dashboard");

    return {
      success: true,
      message: `"${measurement.name}" (${measurement.code}) ölçü birimi başarıyla eklendi.`,
      measurement,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ölçü birimi oluşturulamadı.";
    return { success: false, error: msg };
  }
}

/**
 * Ölçü birimi güncelle
 */
export async function updateMeasurement(id: string, data: { name: string; code: string }) {
  try {
    const name = data.name.trim();
    const code = data.code.trim().toUpperCase();

    if (!id || !name || !code) {
      return { success: false, error: "Tüm alanlar zorunludur." };
    }

    const existing = await prisma.measurement.findFirst({
      where: { code, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: `"${code}" kodlu başka bir ölçü birimi mevcut.` };
    }

    const updated = await prisma.measurement.update({
      where: { id },
      data: { name, code },
    });

    safeRevalidate("/admin/measurements");
    return {
      success: true,
      message: `Ölçü birimi "${updated.name}" olarak güncellendi.`,
      measurement: updated,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Güncelleme başarısız.";
    return { success: false, error: msg };
  }
}

/**
 * Ölçü birimi sil
 */
export async function deleteMeasurement(id: string) {
  try {
    if (!id) return { success: false, error: "Geçersiz kimlik." };

    // Bağlı ürünlerin measurementId referansını null yap
    await prisma.product.updateMany({
      where: { measurementId: id },
      data: { measurementId: null },
    });

    await prisma.measurement.delete({
      where: { id },
    });

    safeRevalidate("/admin/measurements");
    return { success: true, message: "Ölçü birimi başarıyla silindi." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Silme işlemi başarısız.";
    return { success: false, error: msg };
  }
}
