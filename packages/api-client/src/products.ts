import type { components } from "./schema";

export type ProductCategory = components["schemas"]["ProductCategory"];
export type ProductListing = components["schemas"]["ProductListing"];
export type ProductVariant = components["schemas"]["ProductVariant"];
export type SellerProduct = components["schemas"]["SellerProduct"];
export type SellerProductVariant = components["schemas"]["SellerProductVariant"];
export type InventoryAdjustment = components["schemas"]["InventoryAdjustment"];
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

export function isProductVariant(value: unknown): value is ProductVariant {
  return isRecord(value)
    && typeof value.id === "number"
    && typeof value.label === "string"
    && typeof value.is_available === "boolean";
}

export function isSellerProductVariant(value: unknown): value is SellerProductVariant {
  return isRecord(value)
    && typeof value.id === "number"
    && typeof value.label === "string"
    && (typeof value.sku === "string" || value.sku === null)
    && typeof value.stock_quantity === "number"
    && typeof value.low_stock_threshold === "number"
    && typeof value.is_low_stock === "boolean";
}

export function isInventoryAdjustment(value: unknown): value is InventoryAdjustment {
  return isRecord(value)
    && typeof value.id === "number"
    && typeof value.variant_label === "string"
    && typeof value.previous_stock_quantity === "number"
    && typeof value.new_stock_quantity === "number"
    && typeof value.previous_low_stock_threshold === "number"
    && typeof value.new_low_stock_threshold === "number"
    && typeof value.reason === "string"
    && (value.actor === null || (
      isRecord(value.actor)
      && typeof value.actor.name === "string"
      && typeof value.actor.email === "string"
    ))
    && typeof value.created_at === "string";
}

export function isProductListing(value: unknown): value is ProductListing {
  if (
    !isRecord(value) || !isProductCategory(value.category)
    || !Array.isArray(value.media) || !Array.isArray(value.variants)
  ) return false;
  const attributes = value.attributes;
  return typeof value.id === "number"
    && typeof value.name === "string"
    && typeof value.description === "string"
    && typeof value.price_minor === "number"
    && value.currency === "NGN"
    && typeof value.seller_name === "string"
    && typeof value.seller_cac_verified === "boolean"
    && value.variants.every(isProductVariant)
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
    && Array.isArray(item.inventory_variants)
    && item.inventory_variants.every(isSellerProductVariant)
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
