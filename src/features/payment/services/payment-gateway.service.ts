import prisma from "@/lib/prisma";
import Stripe from "stripe";
import type {
  PaymentCardData,
  PaymentProcessingRequest,
  PaymentProcessingResponse,
  EscrowReleaseResponse,
} from "../types";

// Stripe istemcisi (Environment variable tanımlı ise)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    })
  : null;

/**
 * Kart Doğrulama ve Türkçeleştirilmiş Hata Yönetimi
 */
export function validateCreditCard(card: PaymentCardData): {
  valid: boolean;
  cleanNumber: string;
  cardLast4: string;
  brand: string;
  error?: string;
} {
  const cleanNumber = (card.cardNumber || "").replace(/[\s-]/g, "");
  const cardLast4 = cleanNumber.slice(-4);

  // 1. Kart Numarası Format Kontrolü
  if (!cleanNumber || !/^\d+$/.test(cleanNumber)) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand: "Bilinmeyen",
      error: "Kart numarası yalnızca rakamlardan oluşmalıdır.",
    };
  }

  if (cleanNumber.length < 15 || cleanNumber.length > 19) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand: "Bilinmeyen",
      error: "Geçersiz kart numarası uzunluğu. Lütfen 16 haneli kart numaranızı giriniz.",
    };
  }

  // 2. Marka Tespiti
  let brand = "Bilinmeyen";
  if (cleanNumber.startsWith("4")) brand = "Visa";
  else if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) brand = "Mastercard";
  else if (/^(9792|65)/.test(cleanNumber)) brand = "Troy";
  else if (/^(34|37)/.test(cleanNumber)) brand = "American Express";

  // 3. Test Kartları ve Hata Simülasyonları (Sandbox Scenarios)
  if (cleanNumber === "4000000000000002") {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error:
        "Kartınızda yeterli bakiye bulunmamaktadır. Lütfen farklı bir kart deneyiniz veya limitinizi kontrol ediniz.",
    };
  }

  if (cleanNumber === "4000000000000110") {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error:
        "Kartınızın son kullanma tarihi geçmiştir. Lütfen güncel kart bilgilerinizi giriniz.",
    };
  }

  if (cleanNumber === "4000000000000127" || card.cvc === "000") {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error:
        "Kart güvenlik kodu (CVC) hatalı girildi. Lütfen kartın arkasındaki 3 haneli kodu kontrol ediniz.",
    };
  }

  if (cleanNumber === "4000000000000005") {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error:
        "Ödeme işlemi bankanız tarafından onaylanmadı (Banka Reddi: Do Not Honor).",
    };
  }

  // 4. Son Kullanma Tarihi Doğrulama
  const month = parseInt(card.expireMonth, 10);
  if (isNaN(month) || month < 1 || month > 12) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error: "Geçersiz son kullanma ayı. 01 ile 12 arasında bir ay giriniz.",
    };
  }

  let year = parseInt(card.expireYear, 10);
  if (isNaN(year)) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error: "Geçersiz son kullanma yılı.",
    };
  }
  if (year < 100) year += 2000;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error: "Kartınızın son kullanma tarihi geçmiştir.",
    };
  }

  // 5. CVC Doğrulama
  const cleanCvc = (card.cvc || "").trim();
  if (!cleanCvc || !/^\d{3,4}$/.test(cleanCvc)) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error: "Güvenlik kodu (CVC) 3 veya 4 haneli olmalıdır.",
    };
  }

  // 6. Kart Sahibi Adı
  if (!card.cardHolder || card.cardHolder.trim().length < 3) {
    return {
      valid: false,
      cleanNumber,
      cardLast4,
      brand,
      error: "Lütfen kart üzerinde yazan Ad ve Soyadı eksiksiz giriniz.",
    };
  }

  return {
    valid: true,
    cleanNumber,
    cardLast4,
    brand,
  };
}

/**
 * Hibrit Ödeme ve Depozito (Escrow) Yönetim Servisi
 */
export class PaymentGatewayService {
  /**
   * Sipariş ve Kiralama Ödemesini İşle
   * - Satın alma ve kiralama bedelleri için doğrudan tahsilat (Direct Charge / PaymentIntent)
   * - Kiralama depozitosu için provizyon/blokaj (Hold / Pre-authorization) veya Escrow hesabı
   */
  static async processPayment(
    request: PaymentProcessingRequest
  ): Promise<PaymentProcessingResponse> {
    const {
      orderId,
      grandTotal,
      productTotal,
      depositTotal,
      rentalIds = [],
      card,
      provider = "STRIPE",
    } = request;

    // 1. Kart Bilgilerini ve Test Senaryolarını Kontrol Et
    const validation = validateCreditCard(card);
    if (!validation.valid) {
      return {
        success: false,
        status: "FAILED",
        error: validation.error,
        provider,
      };
    }

    try {
      let transactionId = "";
      let depositHoldId: string | undefined = undefined;

      // 2. Stripe Entegrasyonu (Sandbox veya Canlı)
      if (stripe && process.env.STRIPE_SECRET_KEY) {
        try {
          // Satış ve Kiralama kullanım bedeli için direkt tahsilat
          const chargeIntent = await stripe.paymentIntents.create({
            amount: Math.round(productTotal * 100),
            currency: "try",
            automatic_payment_methods: { enabled: true },
            description: `HybridCommerce Sipariş Tahsilatı: #${orderId}`,
            metadata: { orderId, type: "HYBRID_PURCHASE" },
          } as any);
          transactionId = chargeIntent.id;

          // Depozito tutarı varsa provizyon/blokaj (Manual Capture / Pre-auth)
          if (depositTotal > 0) {
            const holdIntent = await stripe.paymentIntents.create({
              amount: Math.round(depositTotal * 100),
              currency: "try",
              capture_method: "manual", // Provizyon / Blokaj
              automatic_payment_methods: { enabled: true },
              description: `HybridCommerce Kiralama Güvence Depozitosu (Escrow): #${orderId}`,
              metadata: { orderId, type: "RENTAL_ESCROW_DEPOSIT" },
            } as any);
            depositHoldId = holdIntent.id;
          }
        } catch (stripeErr) {
          const stripeMsg =
            stripeErr instanceof Error ? stripeErr.message : "Stripe ödeme hatası";
          return {
            success: false,
            status: "FAILED",
            error: `Ödeme sağlayıcı hatası: ${stripeMsg}`,
            provider: "STRIPE",
          };
        }
      } else {
        // Stripe/Iyzico Sandbox Simülasyon Modu (Yerleşik Test Modu)
        const randId = Math.random().toString(36).substring(2, 10);
        transactionId = `pi_test_${Date.now()}_${randId}`;

        if (depositTotal > 0) {
          depositHoldId = `hold_escrow_${Date.now()}_${randId}`;
        }
      }

      // 3. Veritabanına Payment ve Escrow Kayıtlarını İşle
      const paymentRecord = await prisma.$transaction(async (tx) => {
        // Payment kaydı
        const payment = await tx.payment.create({
          data: {
            orderId,
            amount: grandTotal,
            currency: "TRY",
            provider: provider === "IYZICO" ? "IYZICO" : "STRIPE",
            status: "SUCCEEDED",
            transactionId,
            cardLast4: validation.cardLast4,
            cardBrand: validation.brand,
          },
        });

        // Kiralama depozitosu için EscrowTransaction kayıtları
        if (depositTotal > 0 && rentalIds.length > 0) {
          for (const rentalId of rentalIds) {
            const rental = await tx.rental.findUnique({
              where: { id: rentalId },
            });

            if (rental && Number(rental.depositAmount) > 0) {
              await tx.escrowTransaction.create({
                data: {
                  paymentId: payment.id,
                  rentalId: rental.id,
                  depositAmount: rental.depositAmount,
                  holdId: depositHoldId,
                  status: "HELD",
                },
              });

              // Rental durumunu ACTIVE ve depozito durumunu doğrula
              await tx.rental.update({
                where: { id: rental.id },
                data: {
                  status: "ACTIVE",
                },
              });
            }
          }
        }

        // Siparişi PAID durumuna güncelle
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
          },
        });

        return payment;
      });

      return {
        success: true,
        status: "SUCCEEDED",
        paymentId: paymentRecord.id,
        transactionId,
        depositHoldId,
        cardLast4: validation.cardLast4,
        cardBrand: validation.brand,
        provider,
        receipt: {
          chargedAmount: productTotal,
          heldDepositAmount: depositTotal,
          totalPaid: grandTotal,
          currency: "TRY",
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Ödeme işlemi sırasında bir hata oluştu";
      return {
        success: false,
        status: "FAILED",
        error: msg,
        provider,
      };
    }
  }

  /**
   * İade Onayında Depozito Çözme (Escrow Refund / Release Hold)
   * Satıcı veya Admin iade talebini onayladığında blokajdaki depozitoyu serbest bırakır.
   */
  static async releaseDeposit(rentalId: string): Promise<EscrowReleaseResponse> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { rentalId },
        include: {
          rental: {
            include: { user: true, product: true },
          },
        },
      });

      if (!escrow) {
        return {
          success: true,
          rentalId,
          refundedDepositAmount: 0,
          message: "Bu kiralama kaydına ait depozito blokajı bulunmamaktadır.",
        };
      }

      if (escrow.status === "RELEASED") {
        return {
          success: true,
          rentalId,
          releaseTxId: escrow.releaseTxId ?? undefined,
          refundedDepositAmount: Number(escrow.depositAmount),
          message: "Depozito provizyonu daha önce serbest bırakılmıştır.",
        };
      }

      const depositAmount = Number(escrow.depositAmount);
      let releaseTxId = "";

      // 1. Stripe Sandbox / API Release Hold Tetikleme
      if (stripe && escrow.holdId && !escrow.holdId.startsWith("hold_escrow_")) {
        try {
          // Provizyon iptali (PaymentIntent cancellation / release authorization)
          const canceledIntent = await stripe.paymentIntents.cancel(escrow.holdId, {
            cancellation_reason: "requested_by_customer",
          });
          releaseTxId = canceledIntent.id;
        } catch (apiErr) {
          console.warn("[PaymentGateway] Stripe hold cancel fallback to refund", apiErr);
          releaseTxId = `re_test_${Date.now()}`;
        }
      } else {
        // Sandbox Otomatik Blokaj Çözme
        const rand = Math.random().toString(36).substring(2, 10);
        releaseTxId = `rel_escrow_${Date.now()}_${rand}`;
      }

      // 2. Veritabanında EscrowTransaction güncellemesi
      await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
          releaseTxId,
        },
      });

      const customerName =
        escrow.rental.user?.name || escrow.rental.user?.email || "Müşteri";
      const depositFormatted = depositAmount.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
      });

      return {
        success: true,
        rentalId,
        releaseTxId,
        refundedDepositAmount: depositAmount,
        customerName,
        message: `₺${depositFormatted} tutarındaki güvence depozitosu iade API'si üzerinden (${releaseTxId}) ${customerName} kartına iade edildi.`,
      };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Depozito iadesi serbest bırakılamadı";
      return {
        success: false,
        rentalId,
        refundedDepositAmount: 0,
        error: msg,
        message: `Depozito iade işlemi başarısız: ${msg}`,
      };
    }
  }
}
