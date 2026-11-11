import type { components } from "./schema";

export type ProductCategory = components["schemas"]["ProductCategory"];
export type ProductListing = components["schemas"]["ProductListing"];
export type SellerProduct = components["schemas"]["SellerProduct"];
export type AdminProduct = components["schemas"]["AdminProduct"];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isProductCategory(value: unknown): value is ProductCategory {
  return isRecord(value)
    && typeof value.id === "number"
    && typeof value.name === "string"
    && typeof value.slug === "string"
    && typeof value.is_active === "boolean";
}

export function isProductListing(value: unknown): value is ProductListing {
  if (!isRecord(value) || !isProductCategory(value.category) || !Array.isArray(value.media)) return false;
  const attributes = value.attributes;
  return typeof value.id === "number"
    && typeof value.name === "string"
    && typeof value.description === "string"
    && typeof value.price_minor === "number"
    && value.currency === "NGN"
    && typeof value.seller_name === "string"
    && typeof value.seller_cac_verified === "boolean"
    && isRecord(attributes)
    && Object.values(attributes).every((attribute) => typeof attribute === "string")
    && value.media.every((media) => isRecord(media)
      && typeof media.id === "number"
      && ["image/jpeg", "image/png", "image/webp"].includes(String(media.mime_type)));
}

export function isSellerProduct(value: unknown): value is SellerProduct {
  if (!isRecord(value)) return false;
  const item = value;
  return isProductListing(value)
    && ["draft", "pending", "approved", "rejected", "needs_more_info", "archived"].includes(String(item.status))
    && (typeof item.review_notes === "string" || item.review_notes === null)
    && (typeof item.submitted_at === "string" || item.submitted_at === null)
    && (typeof item.reviewed_at === "string" || item.reviewed_at === null);
}

export function isAdminProduct(value: unknown): value is AdminProduct {
  if (!isRecord(value)) return false;
  const item = value;
  return isSellerProduct(value)
    && isRecord(item.seller)
    && typeof item.seller.id === "number"
    && typeof item.seller.name === "string"
    && typeof item.seller.email === "string";
}

export function productError(payload: unknown, fallback: string): string {
  return isRecord(payload) && typeof payload.message === "string" ? payload.message : fallback;
}

export function formatProductPrice(priceMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(priceMinor / 100);
}
