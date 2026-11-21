import { describe, expect, it } from "vitest";
import { memoryStorage } from "@/test/fixtures";
import { getAverageRating, reviewsStorageKey } from "./reviews";

describe("getAverageRating", () => {
  it("averages the stored review ratings to one decimal place", () => {
    const storage = memoryStorage({
      [reviewsStorageKey(10)]: JSON.stringify([{ rating: 5 }, { rating: 4 }, { rating: 4 }]),
    });

    expect(getAverageRating(storage, 10)).toBe(4.3);
  });

  it("is null when a product has no usable reviews", () => {
    const storage = memoryStorage({
      [reviewsStorageKey(2)]: JSON.stringify([{ rating: 9 }, { text: "no rating" }]),
      [reviewsStorageKey(3)]: "not json",
    });

    expect(getAverageRating(storage, 1)).toBeNull();
    expect(getAverageRating(storage, 2)).toBeNull();
    expect(getAverageRating(storage, 3)).toBeNull();
  });
});
