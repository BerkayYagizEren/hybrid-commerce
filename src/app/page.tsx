import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";

/**
 * Ana Sayfa
 * Hero section ve öne çıkan özellikler.
 */
export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Satın Al{" "}
              <span className="text-primary-200">veya</span>{" "}
              Kirala
            </h1>
            <p className="mt-6 text-lg text-primary-100">
              İhtiyacınız olan ürünleri satın alın veya ihtiyacınız olduğu süre
              boyunca kiralayın. Her iki seçenek de tek bir platformda.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/products?type=SALE">
                <Button
                  size="lg"
                  className="bg-sale-500 hover:bg-sale-600 focus-visible:ring-sale-400"
                >
                  💰 Satın Alınabilir Ürünler
                </Button>
              </Link>
              <Link href="/products?type=RENTAL">
                <Button
                  size="lg"
                  className="bg-rental-500 hover:bg-rental-600 focus-visible:ring-rental-400"
                >
                  📅 Kiralanabilir Ürünler
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Nasıl Çalışır?
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {/* Adım 1 */}
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                1. Ürünü Seçin
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Katalogdan istediğiniz ürünü bulun. Satılık, kiralık veya her
                ikisi de olabilir.
              </p>
            </div>

            {/* Adım 2 */}
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rental-100">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                2. Seçeneği Belirleyin
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Satın almak mı kiralama mı istediğinize karar verin. Kiralama
                için tarih aralığı seçin.
              </p>
            </div>

            {/* Adım 3 */}
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sale-100">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                3. Siparişi Tamamlayın
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Satış ve kiralama kalemlerini tek bir sepette toplayıp ödemenizi
                yapın.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold">Tüm ürünleri keşfedin</h2>
          <p className="mt-3 text-gray-400">
            Satılık ve kiralık tüm ürünleri tek bir katalogda bulun.
          </p>
          <Link href="/products" className="mt-6 inline-block">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Ürünlere Göz At →
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
