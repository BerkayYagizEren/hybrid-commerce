import type { Favorite, Product } from "@prisma/client";
import type { SerializedProduct } from "@/features/products/types";

export type { Favorite };

export interface FavoriteWithProduct extends Favorite {
  product: SerializedProduct;
}

export interface ToggleFavoriteResult {
  success: boolean;
  isFavorite: boolean;
  message?: string;
  error?: string;
}

export interface SyncFavoritesResult {
  success: boolean;
  syncedCount: number;
  allFavoriteIds: string[];
  error?: string;
}

export interface FavoritesContextType {
  favoriteIds: string[];
  favorites?: string[];
  setFavorites?: (ids: string[]) => void;
  isLoading: boolean;
  isLoggedIn?: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  favoriteCount: number;
  refreshFavorites: () => Promise<void>;
}
