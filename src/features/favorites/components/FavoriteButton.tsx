"use client";

import { useFavorites } from "../context/FavoritesContext";
import { useState } from "react";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({
  productId,
  className = "",
  size = "md",
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(productId);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Kalbe tıklandığında kart yönlendirmesinin (link tıklamasının) tetiklenmemesi için
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    await toggleFavorite(productId);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
      title={favorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
      className={`group/fav relative flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-md p-2 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer border border-gray-100/80 ${
        favorite
          ? "fill-red-500 text-red-500"
          : "text-gray-600 hover:text-red-500"
      } ${isAnimating ? "scale-125" : ""} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        strokeWidth={favorite ? "0" : "1.8"}
        stroke="currentColor"
        className={`${iconSizes} transition-colors duration-200 ${
          favorite
            ? "fill-red-500 text-red-500"
            : "fill-none text-gray-600 group-hover/fav:text-red-500"
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}

export default FavoriteButton;
