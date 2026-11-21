import { describe, expect, it } from "vitest";
import { makeProduct, memoryStorage } from "@/test/fixtures";
import { addToCart, CART_STORAGE_KEY, firstAvailableVariant, MAX_LINE_QUANTITY, productImageUrl, readCart } from "./cart";

describe("cart", () => {
  it("stores items in the shape the cart and checkout pages read", () => {
    const storage = memoryStorage();
    const product = makeProduct();
    const variant = firstAvailableVariant(product);
    expect(variant?.id).toBe(100);

    addToCart(storage, product, variant!, 2);

    expect(readCart(storage)).toEqual([
      {
        id: "10-100",
        product_id: 10,
        variant_id: 100,
        variant_label: "1 kg",
        product_name: "Fresh orange basket",
        seller_name: "Local seller",
        price_minor: 325000,
        quantity: 2,
        image_url: "/api/catalogue/products/10/media/7",
        stock_available: MAX_LINE_QUANTITY,
      },
    ]);
  });

  it("merges repeat adds into one line and caps the quantity", () => {
    const storage = memoryStorage();
    const product = makeProduct();
    const variant = product.variants[0];

    addToCart(storage, product, variant, 60);
    const items = addToCart(storage, product, variant, 60);

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("keeps different variants of one product as separate lines", () => {
    const storage = memoryStorage();
    const product = makeProduct();

    addToCart(storage, product, product.variants[0]);
    const items = addToCart(storage, product, product.variants[1]);

    expect(items.map((item) => item.id)).toEqual(["10-100", "10-101"]);
  });

  it("drops malformed entries and treats an unknown stock count as the line cap", () => {
    const storage = memoryStorage({
      [CART_STORAGE_KEY]: JSON.stringify([
        { id: 5, name: "old shape", price: 100, quantity: 1 },
        {
          id: "3-4",
          product_id: 3,
          variant_id: 4,
          variant_label: "Box",
          product_name: "Rice",
          seller_name: "Mama Put",
          price_minor: 500000,
          quantity: 1,
          stock_available: 0,
        },
      ]),
    });

    const items = readCart(storage);

    expect(items).toHaveLength(1);
    expect(items[0].stock_available).toBe(MAX_LINE_QUANTITY);
  });

  it("returns an empty cart for unreadable storage", () => {
    expect(readCart(memoryStorage({ [CART_STORAGE_KEY]: "{not json" }))).toEqual([]);
    expect(readCart(memoryStorage({ [CART_STORAGE_KEY]: JSON.stringify({ not: "a list" }) }))).toEqual([]);
  });

  it("has no image url or available variant when the product has none", () => {
    const product = makeProduct({ media: [], variants: [{ id: 1, label: "Only", is_available: false }] });

    expect(productImageUrl(product)).toBeUndefined();
    expect(firstAvailableVariant(product)).toBeUndefined();
  });
});
