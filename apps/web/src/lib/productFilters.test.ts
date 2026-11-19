import { describe, expect, it } from "vitest";
import { makeProduct } from "@/test/fixtures";
import {
  categoryOptions,
  DEFAULT_FILTERS,
  FILTER_PRICE_MAX,
  filterProducts,
  parseFilters,
} from "./productFilters";

const oranges = makeProduct({ id: 1, name: "Oranges", price_minor: 325000 });
const rice = makeProduct({
  id: 2,
  name: "Rice",
  category: { id: 2, name: "Groceries", slug: "groceries", is_active: true },
  price_minor: 4500000,
  variants: [{ id: 20, label: "Bag", is_available: false }],
});
const products = [oranges, rice];
const noRatings = () => null;

describe("filterProducts", () => {
  it("returns everything with the default filters", () => {
    expect(filterProducts(products, DEFAULT_FILTERS, noRatings)).toEqual(products);
  });

  it("filters by category slug", () => {
    const result = filterProducts(products, { ...DEFAULT_FILTERS, category: "groceries" }, noRatings);

    expect(result.map((product) => product.id)).toEqual([2]);
  });

  it("ignores a category that is not part of these results", () => {
    const result = filterProducts(products, { ...DEFAULT_FILTERS, category: "electronics" }, noRatings);

    expect(result).toHaveLength(2);
  });

  it("compares prices in naira against the price in kobo", () => {
    const cheap = filterProducts(products, { ...DEFAULT_FILTERS, maxPrice: 10000 }, noRatings);
    const pricey = filterProducts(products, { ...DEFAULT_FILTERS, minPrice: 10000 }, noRatings);

    expect(cheap.map((product) => product.id)).toEqual([1]);
    expect(pricey.map((product) => product.id)).toEqual([2]);
  });

  it("treats the top of the price slider as no upper limit", () => {
    const expensive = makeProduct({ id: 3, price_minor: (FILTER_PRICE_MAX + 100000) * 100 });

    expect(filterProducts([expensive], DEFAULT_FILTERS, noRatings)).toHaveLength(1);
  });

  it("uses review ratings and treats unreviewed products as unrated", () => {
    const ratings = new Map([[1, 4.5]]);
    const result = filterProducts(products, { ...DEFAULT_FILTERS, minRating: 4 }, (id) => ratings.get(id) ?? null);

    expect(result.map((product) => product.id)).toEqual([1]);
  });

  it("hides products with no available variant when in-stock only is on", () => {
    const result = filterProducts(products, { ...DEFAULT_FILTERS, inStockOnly: true }, noRatings);

    expect(result.map((product) => product.id)).toEqual([1]);
  });
});

describe("categoryOptions", () => {
  it("lists each category once, sorted by name", () => {
    expect(categoryOptions([...products, makeProduct({ id: 3 })])).toEqual([
      { slug: "fresh-produce", name: "Fresh produce" },
      { slug: "groceries", name: "Groceries" },
    ]);
  });
});

describe("parseFilters", () => {
  it("restores saved filters and clamps old out-of-range values", () => {
    const saved = JSON.stringify({ category: "groceries", minPrice: 500, maxPrice: 1000000, minRating: 4, inStockOnly: true });

    expect(parseFilters(saved)).toEqual({
      category: "groceries",
      minPrice: 500,
      maxPrice: FILTER_PRICE_MAX,
      minRating: 4,
      inStockOnly: true,
    });
  });

  it("falls back to the defaults for missing or corrupt data", () => {
    expect(parseFilters(null)).toEqual(DEFAULT_FILTERS);
    expect(parseFilters("{bad")).toEqual(DEFAULT_FILTERS);
    expect(parseFilters("[]")).toEqual(DEFAULT_FILTERS);
  });
});
