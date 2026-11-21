import { isRecord, type ProductListing, type ProductVariant } from "@webubble/api-client/products";

export const CART_STORAGE_KEY = "webubble_cart";
// The buyer API reports availability but not stock counts, so one cart line is capped here.
export const MAX_LINE_QUANTITY = 99;

export interface CartItem {
  id: string;
  product_id: number;
  variant_id: number;
  variant_label: string;
  product_name: string;
  seller_name: string;
  price_minor: number;
  quantity: number;
  image_url?: string;
  stock_available: number;
}

function isCartItem(value: unknown): value is CartItem {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.product_id === "number"
    && typeof value.variant_id === "number"
    && typeof value.variant_label === "string"
    && typeof value.product_name === "string"
    && typeof value.seller_name === "string"
    && typeof value.price_minor === "number"
    && typeof value.quantity === "number"
    && typeof value.stock_available === "number";
}

export function readCart(storage: Pick<Storage, "getItem">): CartItem[] {
  const saved = storage.getItem(CART_STORAGE_KEY);
  if (!saved) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }

  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isCartItem)
    .map((item) => (item.stock_available > 0 ? item : { ...item, stock_available: MAX_LINE_QUANTITY }));
}

export function productImageUrl(product: ProductListing): string | undefined {
  const media = product.media[0];
  return media ? `/api/catalogue/products/${product.id}/media/${media.id}` : undefined;
}

export function firstAvailableVariant(product: ProductListing): ProductVariant | undefined {
  return product.variants.find((variant) => variant.is_available);
}

export function addToCart(
  storage: Pick<Storage, "getItem" | "setItem">,
  product: ProductListing,
  variant: ProductVariant,
  quantity = 1,
): CartItem[] {
  const items = readCart(storage);
  const id = `${product.id}-${variant.id}`;
  const existing = items.find((item) => item.id === id);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, MAX_LINE_QUANTITY);
  } else {
    items.push({
      id,
      product_id: product.id,
      variant_id: variant.id,
      variant_label: variant.label,
      product_name: product.name,
      seller_name: product.seller_name,
      price_minor: product.price_minor,
      quantity: Math.min(quantity, MAX_LINE_QUANTITY),
      image_url: productImageUrl(product),
      stock_available: MAX_LINE_QUANTITY,
    });
  }

  storage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  return items;
}
