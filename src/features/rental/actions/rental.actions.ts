"use server";

import prisma from "@/lib/prisma";
import { AvailabilityService } from "@/features/rental/services/availability.service";
import { PaymentGatewayService } from "@/features/payment/services/payment-gateway.service";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI veya test senaryolarında request context olmadığı durumlar için güvenli pas geçme
  }
}

/**
 * Kiralık ürün için iade sürecini başlatır (Müşteri)
 */
export async function requestRentalReturn(rentalId: string) {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { product: true },
    });

    if (!rental) {
      return { success: false, error: "Kiralama kaydı bulunamadı." };
    }

    if (rental.status === "RETURNED" || rental.status === "CANCELLED") {
      return { success: false, error: `Bu kiralama zaten ${rental.status} durumunda.` };
    }

    // Durumu RETURN_REQUESTED yap
    const updated = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: "RETURN_REQUESTED",
      },
    });

    safeRevalidate("/orders");
    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/admin/dashboard");

    return {
      success: true,
      message: `"${rental.product.name}" için iade talebi oluşturuldu. Ürün teslim alınıp kontrol edildikten sonra ₺${Number(rental.depositAmount)} tutarındaki güvence depozitonuz kartınıza iade edilecektir.`,
      status: updated.status,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "İade talebi oluşturulamadı.";
    return { success: false, error: msg };
  }
}

/**
 * Satıcı veya Admin tarafından iadeyi onaylar:
 * - Rental durumunu RETURNED yapar
 * - Takvimdeki müsaitlik kilidini kaldırır (Availability unblock)
 * - Müşterinin güvence depozitosunu serbest bırakır/iade eder
 */
export async function approveRentalReturn(rentalId: string) {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { product: true, user: true },
    });

    if (!rental) {
      return { success: false, error: "Kiralama kaydı bulunamadı." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Kiralama durumunu RETURNED yap
      await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: "RETURNED",
        },
      });

      // 2. Takvim müsaitlik kilidini kaldır (ürün yeniden kiralamaya açılsın)
      await tx.rentalAvailability.deleteMany({
        where: { rentalId },
      });
    });

    // 3. Ödeme Sağlayıcı İade & Blokaj Çözme API'si (Escrow Release / Provizyon İptali)
    const escrowResult = await PaymentGatewayService.releaseDeposit(rentalId);

    safeRevalidate("/vendor/dashboard");
    safeRevalidate("/admin/dashboard");
    safeRevalidate("/admin/orders");
    safeRevalidate("/orders");

    const depositFormatted = Number(rental.depositAmount).toLocaleString("tr-TR");
    const customerName = rental.user?.name || rental.user?.email || "Müşteri";
    const txInfo = escrowResult.releaseTxId ? ` (İade Dekont No: ${escrowResult.releaseTxId})` : "";

    return {
      success: true,
      message: `"${rental.product.name}" için iade başarıyla onaylandı! ₺${depositFormatted} tutarındaki güvence depozitosu ödeme sağlayıcı üzerinden${txInfo} ${customerName} kartına serbest bırakıldı ve ürün takvimi tekrar kiralamaya açıldı.`,
      rentalId,
      depositAmount: Number(rental.depositAmount),
      releaseTxId: escrowResult.releaseTxId,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "İade onaylama işlemi başarısız.";
    return { success: false, error: msg };
  }
}

/**
 * Kiralama süresini ek gün sayısı ile uzatır
 */
export async function extendRentalDuration(rentalId: string, additionalDays: number) {
  try {
    if (additionalDays <= 0) {
      return { success: false, error: "Geçerli bir ek gün sayısı belirtiniz." };
    }

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        product: {
          include: { rentalPricing: true },
        },
      },
    });

    if (!rental) {
      return { success: false, error: "Kiralama kaydı bulunamadı." };
    }

    const currentEnd = new Date(rental.endDate);
    const newEnd = addDays(currentEnd, additionalDays);

    // 1. Ek süre için müsaitlik kontrolü yap (çakışma var mı?)
    const availabilityCheck = await AvailabilityService.check({
      productId: rental.productId,
      startDate: currentEnd.toISOString(),
      endDate: newEnd.toISOString(),
    });

    if (!availabilityCheck.available) {
      return {
        success: false,
        error: "Seçtiğiniz ek tarihlerde ürün başka bir kullanıcı tarafından rezerve edilmiş. Lütfen daha kısa bir süre seçin.",
      };
    }

    // 2. Ek süre ücretini hesapla
    const pricing = rental.product.rentalPricing;
    const dailyPrice = Number(rental.dailyRate || pricing?.dailyPrice || 100);
    const additionalPrice = dailyPrice * additionalDays;
    const newTotalPrice = Number(rental.totalPrice) + additionalPrice;

    // 3. Atomik işlem: Kiralama bitiş tarihini ve bloke kaydını güncelle
    await prisma.$transaction(async (tx) => {
      // Rental güncelle
      await tx.rental.update({
        where: { id: rentalId },
        data: {
          endDate: newEnd,
          totalPrice: newTotalPrice,
        },
      });

      // RentalAvailability blocking kaydını güncelle
      const existingBlock = await tx.rentalAvailability.findFirst({
        where: { rentalId },
      });

      if (existingBlock) {
        await tx.rentalAvailability.update({
          where: { id: existingBlock.id },
          data: { endDate: newEnd },
        });
      } else {
        await tx.rentalAvailability.create({
          data: {
            productId: rental.productId,
            startDate: rental.startDate,
            endDate: newEnd,
            rentalId: rental.id,
          },
        });
      }
    });

    safeRevalidate("/orders");
    return {
      success: true,
      message: `Kiralama süresi +${additionalDays} gün uzatıldı. Yeni bitiş tarihi: ${newEnd.toLocaleDateString("tr-TR")}. Ek Tutar: ₺${additionalPrice.toLocaleString("tr-TR")}`,
      newEndDate: newEnd.toISOString(),
      additionalCost: additionalPrice,
      totalPrice: newTotalPrice,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Süre uzatma işlemi başarısız.";
    return { success: false, error: msg };
  }
}

/**
 * Bekleyen veya tamamlanan kiralama iadelerini getirir
 */
export async function getRentalReturnsList() {
  try {
    const rentals = await prisma.rental.findMany({
      where: {
        status: {
          in: ["RETURN_REQUESTED", "RETURNED", "ACTIVE"],
        },
      },
      include: {
        product: true,
        user: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return rentals.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      customerName: r.user.name || r.user.email,
      customerEmail: r.user.email,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      dailyRate: Number(r.dailyRate),
      totalPrice: Number(r.totalPrice),
      depositAmount: Number(r.depositAmount),
      status: r.status,
    }));
  } catch {
    return [];
  }
}
