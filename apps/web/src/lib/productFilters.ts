import { isRecord, type ProductListing } from "@webubble/api-client/products";

export interface ProductFilters {
  category: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  inStockOnly: boolean;
}

// Naira. A max price at this value means "no upper limit".
export const FILTER_PRICE_MAX = 500000;

export const DEFAULT_FILTERS: ProductFilters = {
  category: "",
  minPrice: 0,
  maxPrice: FILTER_PRICE_MAX,
  minRating: 0,
  inStockOnly: false,
};

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

export function parseFilters(saved: string | null): ProductFilters {
  if (!saved) return DEFAULT_FILTERS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    if (error instanceof SyntaxError) return DEFAULT_FILTERS;
    throw error;
  }
  if (!isRecord(parsed)) return DEFAULT_FILTERS;

  return {
    category: typeof parsed.category === "string" ? parsed.category : DEFAULT_FILTERS.category,
    minPrice: numberInRange(parsed.minPrice, 0, FILTER_PRICE_MAX, DEFAULT_FILTERS.minPrice),
    maxPrice: numberInRange(parsed.maxPrice, 0, FILTER_PRICE_MAX, DEFAULT_FILTERS.maxPrice),
    minRating: numberInRange(parsed.minRating, 0, 5, DEFAULT_FILTERS.minRating),
    inStockOnly: parsed.inStockOnly === true,
  };
}

export function categoryOptions(products: ProductListing[]): { slug: string; name: string }[] {
  const categories = new Map<string, string>();
  for (const product of products) {
    if (!categories.has(product.category.slug)) categories.set(product.category.slug, product.category.name);
  }
  return [...categories]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterProducts(
  products: ProductListing[],
  filters: ProductFilters,
  ratingFor: (productId: number) => number | null,
): ProductListing[] {
  // A category left over from an earlier search must not hide every result of this one.
  const categories = new Set(products.map((product) => product.category.slug));
  const categoryFilter = categories.has(filters.category) ? filters.category : "";

  return products.filter((product) => {
    if (categoryFilter && product.category.slug !== categoryFilter) return false;

    const naira = product.price_minor / 100;
    if (naira < filters.minPrice) return false;
    if (filters.maxPrice < FILTER_PRICE_MAX && naira > filters.maxPrice) return false;

    if (filters.minRating > 0 && (ratingFor(product.id) ?? 0) < filters.minRating) return false;

    if (filters.inStockOnly && !product.variants.some((variant) => variant.is_available)) return false;

    return true;
  });
}
