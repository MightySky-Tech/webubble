import type { ProductListing } from "@webubble/api-client/products";

export function makeProduct(overrides: Partial<ProductListing> = {}): ProductListing {
  return {
    id: 10,
    category: { id: 1, name: "Fresh produce", slug: "fresh-produce", is_active: true },
    name: "Fresh orange basket",
    description: "Seasonal oranges selected by a local grower.",
    attributes: { Origin: "Lagos" },
    price_minor: 325000,
    currency: "NGN",
    seller_name: "Local seller",
    seller_id: 5,
    seller_cac_verified: false,
    variants: [
      { id: 100, label: "1 kg", is_available: true },
      { id: 101, label: "2 kg", is_available: false },
    ],
    media: [{ id: 7, mime_type: "image/jpeg" }],
    ...overrides,
  };
}

export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
