import type { Review, ReviewStatus } from "@prisma/client";

export type { Review, ReviewStatus };

export type ReviewWithUser = Review & {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

export type ReviewWithProductAndUser = Review & {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    vendorId: string | null;
  };
};

export interface CreateReviewInput {
  productId: string;
  rating: number; // 1-5
  comment: string;
  status?: ReviewStatus;
}

export interface ReviewActionResult {
  success: boolean;
  message?: string;
  error?: string;
  review?: Review;
}

export interface RatingDistribution {
  star: number;
  count: number;
  percentage: number;
}

export interface ProductRatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution[];
}

export interface ProductReviewsData {
  stats: ProductRatingStats;
  reviews: ReviewWithUser[];
  userReview?: ReviewWithUser | null;
  isVerifiedBuyer: boolean;
  canReview: boolean;
}
