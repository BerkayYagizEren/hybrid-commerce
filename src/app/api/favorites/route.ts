import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/actions/auth.actions";
import { FavoritesService } from "@/features/favorites/services/favorites.service";

/**
 * GET /api/favorites
 * Giriş yapmış kullanıcının favorilerini doğrudan veritabanından döner.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        isGuest: true,
        favoriteIds: [],
        products: [],
        message: "Kullanıcı oturumu bulunamadı (Misafir Modu)",
      });
    }

    const [favoriteIds, products] = await Promise.all([
      FavoritesService.getFavoriteProductIds(user.id),
      FavoritesService.getFavoriteProducts(user.id),
    ]);

    return NextResponse.json({
      success: true,
      isGuest: false,
      userId: user.id,
      favoriteIds,
      products,
    });
  } catch (error: any) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Favoriler yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * Favoriye ürün ekler veya favoriden çıkarır (Toggle).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Favori işlemleri için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId zorunludur." },
        { status: 400 }
      );
    }

    const result = await FavoritesService.toggleFavorite(user.id, productId);
    return NextResponse.json({
      ...result,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "İşlem sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
