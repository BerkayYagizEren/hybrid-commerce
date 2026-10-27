import { getCurrentUser } from "@/features/auth/actions/auth.actions";
import { getFavoriteProducts } from "@/features/favorites/actions/favorite.actions";
import { FavoritesClient } from "./FavoritesClient";

export const metadata = {
  title: "Favorilerim — HybridCommerce",
  description: "Beğendiğiniz satın alınabilir ve kiralanabilir ürünler listeniz.",
};

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  let initialProducts: any[] = [];
  try {
    initialProducts = user ? await getFavoriteProducts(user.id) : [];
  } catch (err) {
    console.error("FavoritesPage getFavoriteProducts error:", err);
    initialProducts = [];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FavoritesClient
        initialProducts={initialProducts}
        isInitialUser={Boolean(user)}
      />
    </div>
  );
}
