"use client";

import { useState } from "react";

interface StarRatingProps {
  rating: number; // 0-5
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showScore?: boolean;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  showScore = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  const currentRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const isFilled = currentRating >= starValue;
          const isHalf = !isFilled && currentRating >= starValue - 0.5;

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={`${interactive ? "cursor-pointer transition-transform hover:scale-115" : "cursor-default"} focus:outline-hidden`}
              aria-label={`${starValue} yıldız ver`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`${starSizes[size]} transition-colors ${
                  isFilled
                    ? "fill-amber-400 text-amber-400"
                    : isHalf
                    ? "fill-amber-400/50 text-amber-400"
                    : "fill-gray-200 text-gray-200"
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            </button>
          );
        })}
      </div>

      {showScore && (
        <span className="font-bold text-gray-800 text-sm">
          {rating > 0 ? rating.toFixed(1) : "0.0"}
        </span>
      )}
    </div>
  );
}
