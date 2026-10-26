# 🚀 Hybrid Commerce Platform

Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ve PostgreSQL kullanılarak geliştirilmiş, **Ürün Satışı** ve **Ürün Kiralaması** iş modellerini tek bir çatıda birleştiren hibrit e-ticaret platformu.

---

## 🏛️ Mimari Referanslar

Platform mimarisi iki temel açık kaynak standardına dayanır:

1. **Kiralama & Takvim Rezervasyon Modeli (Louez & Sharetribe):**
   - **Tarih Aralığı Bazlı Bloklama (Date-Range Overlap Blocking):** `RentalAvailability` tablosu üzerinde `existing.startDate < requested.endDate AND existing.endDate > requested.startDate` sorgusu ile çakışan rezervasyonların engellenmesi.
   - **Dinamik Fiyat Kırılımı (Tiered Pricing Breakdown):** Günlük, haftalık ve aylık çarpanlara göre optimize edilmiş esnek fiyatlandırma ve depozito (security deposit) yönetimi.
   - **Etkileşimli Müsaitlik Takvimi:** Bloklu günleri visual feedback ile gösteren, min/maks gün kısıtlarını denetleyen rezervasyon takvimi.

2. **Headless E-Ticaret & Hibrit Sepet/Checkout (Medusa & Vendure):**
   - **Hibrit Sepet (Hybrid Cart):** Aynı sepette hem normal satış (`SALE`) hem de tarih aralıklı kiralama (`RENTAL`) kalemlerinin bağımsız yönetimi.
   - **Atomik Checkout Transaction:** Tek bir siparişte satış stokunun rezerve edilmesi (`reservedStock`), kiralama kaydının (`Rental`) oluşturulması ve takvim kilidinin (`RentalAvailability`) aynı Prisma transaction (`tx`) içinde atomik olarak kilitlenmesi.
   - **Feature-Based Modüler Mimari:** Domain bazlı klasör yapısı (`products`, `rental`, `cart`, `checkout`, `orders`).

---

## 📁 Proje Klasör Yapısı

```
hybrid-commerce/
├── prisma/
│   ├── schema.prisma              # 12 model + 5 enum (Product, Inventory, Rental, Cart...)
│   └── seed.ts                    # Elektronik ve Outdoor örnek ürünler & fiyat tarifeleri
│
├── src/
│   ├── app/                       # Next.js App Router (RSC & API Handlers)
│   │   ├── layout.tsx             # Root layout (Header + Footer)
│   │   ├── page.tsx               # Landing / Hero sayfası
│   │   ├── (shop)/
│   │   │   ├── products/          # Ürün kataloğu (SALE / RENTAL filtreleri)
│   │   │   │   └── [slug]/        # Ürün detay (Satış miktarı veya Kiralama takvimi)
│   │   │   ├── cart/              # Hibrit sepet sayfası
│   │   │   └── checkout/          # Teslimat ve hibrit ödeme sayfası
│   │   └── api/
│   │       ├── products/          # GET filtreli ürünler, GET [id]
│   │       ├── cart/              # GET sepet, POST/PATCH/DELETE cart items
│   │       ├── rentals/           # GET/POST müsaitlik ve bloklu tarihler
│   │       └── checkout/          # POST atomik sipariş tamamlama
│   │
│   ├── features/                  # Domain-Driven / Feature Modülleri
│   │   ├── products/              # ProductCard, ProductGrid, ProductDetail, ProductService
│   │   ├── rental/                # RentalCalendar, RentalPriceSummary, AvailabilityService, PricingService, RentalService
│   │   ├── cart/                  # CartItem, CartSummary, useCart hook, CartService
│   │   ├── checkout/              # CheckoutForm, OrderSummary, CheckoutService
│   │   └── orders/                # OrderService, Order types
│   │
│   ├── shared/                    # Ortak Bileşenler & Yardımcılar
│   │   ├── components/ui/         # Button, Badge
│   │   ├── layout/                # Header, Footer
│   │   └── utils/                 # cn (clsx + twMerge), format (TRY para birimi, tarih)
│   │
│   └── lib/
│       └── prisma.ts              # Prisma Client Singleton
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

---

## ⚡ Kurulum ve Çalıştırma

### 1. Gereksinimler
- Node.js 18+ veya 20+
- PostgreSQL Veritabanı

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Çevre Değişkenlerini Tanımlayın
```bash
cp .env.example .env
# .env dosyasındaki DATABASE_URL bağlantısını düzenleyin
```

### 4. Veritabanını Hazırlayın ve Seed Edin
```bash
# Prisma istemcisini derleyin
npx prisma generate

# Şemayı veritabanına uygulayın
npx prisma db push

# Başlangıç verilerini (Satılık MacBook, Kiralık Sony A7IV, Hibrit Çadır) ekleyin
npm run db:seed
```

### 5. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```

Platform `http://localhost:3000` adresinde çalışacaktır:
- Katalog: `http://localhost:3000/products`
- Sepet: `http://localhost:3000/cart`
- Checkout: `http://localhost:3000/checkout`
