import { isProductListing, type ProductListing } from "@webubble/api-client/products";

export const WISHLIST_STORAGE_KEY = "webubble_wishlist_data";

export function readWishlist(storage: Pick<Storage, "getItem">): ProductListing[] {
  const saved = storage.getItem(WISHLIST_STORAGE_KEY);
  if (!saved) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }

  return Array.isArray(parsed) ? parsed.filter(isProductListing) : [];
}

export function toggleWishlist(
  storage: Pick<Storage, "getItem" | "setItem">,
  product: ProductListing,
): { items: ProductListing[]; added: boolean } {
  const items = readWishlist(storage);
  const added = !items.some((item) => item.id === product.id);
  const updated = added ? [...items, product] : items.filter((item) => item.id !== product.id);
  storage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
  return { items: updated, added };
}

export function removeFromWishlist(
  storage: Pick<Storage, "getItem" | "setItem">,
  productId: number,
): ProductListing[] {
  const updated = readWishlist(storage).filter((item) => item.id !== productId);
  storage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
