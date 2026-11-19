import { isRecord } from "@webubble/api-client/products";

// Reviews are stored per browser until the reviews API exists, so ratings come from there.
export function reviewsStorageKey(productId: number | string): string {
  return `product_reviews_${productId}`;
}

export function getAverageRating(storage: Pick<Storage, "getItem">, productId: number): number | null {
  const saved = storage.getItem(reviewsStorageKey(productId));
  if (!saved) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  if (!Array.isArray(parsed)) return null;

  const ratings = parsed
    .map((review) => (isRecord(review) ? review.rating : undefined))
    .filter((rating): rating is number => typeof rating === "number" && rating >= 1 && rating <= 5);
  if (ratings.length === 0) return null;

  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return Math.round(average * 10) / 10;
}
