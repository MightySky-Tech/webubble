import { describe, expect, it } from "vitest";
import { makeProduct, memoryStorage } from "@/test/fixtures";
import { readWishlist, removeFromWishlist, toggleWishlist, WISHLIST_STORAGE_KEY } from "./wishlist";

describe("wishlist", () => {
  it("adds a product the first time and removes it the second", () => {
    const storage = memoryStorage();
    const product = makeProduct();

    const first = toggleWishlist(storage, product);
    expect(first.added).toBe(true);
    expect(readWishlist(storage).map((item) => item.id)).toEqual([10]);

    const second = toggleWishlist(storage, product);
    expect(second.added).toBe(false);
    expect(readWishlist(storage)).toEqual([]);
  });

  it("removes one product without touching the others", () => {
    const storage = memoryStorage();
    toggleWishlist(storage, makeProduct({ id: 1 }));
    toggleWishlist(storage, makeProduct({ id: 2 }));

    const remaining = removeFromWishlist(storage, 1);

    expect(remaining.map((item) => item.id)).toEqual([2]);
    expect(readWishlist(storage).map((item) => item.id)).toEqual([2]);
  });

  it("ignores entries that are not real products", () => {
    const storage = memoryStorage({
      [WISHLIST_STORAGE_KEY]: JSON.stringify([{ id: "x", name: "legacy", price: 10 }, makeProduct({ id: 3 })]),
    });

    expect(readWishlist(storage).map((item) => item.id)).toEqual([3]);
  });

  it("returns an empty list for unreadable storage", () => {
    expect(readWishlist(memoryStorage({ [WISHLIST_STORAGE_KEY]: "oops" }))).toEqual([]);
  });
});
