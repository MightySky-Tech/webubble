import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductCategory } from "@webubble/api-client/products";
import CatalogueFinder from "./CatalogueFinder";

const categories: ProductCategory[] = [
  { id: 1, name: "Fresh produce", slug: "fresh-produce", is_active: true },
  { id: 2, name: "Food & groceries", slug: "food-groceries", is_active: true },
];

const availableProduct = {
  id: 17,
  category: categories[0],
  name: "Fresh orange basket",
  description: "Seasonal oranges.",
  attributes: {},
  price_minor: 325000,
  currency: "NGN",
  seller_name: "Local grower",
  seller_cac_verified: true,
  variants: [{ id: 31, label: "Standard", is_available: true }],
  media: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("catalogue product finder", () => {
  it("searches live stock from a guided category and links to the product page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { products: [availableProduct] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<CatalogueFinder categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Help me find something" }));
    const finder = screen.getByRole("region", { name: "What are you looking for?" });
    expect(within(finder).getByText(/I can’t reserve items or take payment/i)).toBeDefined();
    fireEvent.click(within(finder).getByRole("button", { name: "Fresh produce" }));

    expect(await within(finder).findByRole("link", { name: /fresh orange basket/i })).toBeDefined();
    expect(within(finder).getByRole("link", { name: /fresh orange basket/i }).getAttribute("href")).toBe("/products/17");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("q=Fresh+produce"),
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("does not claim availability or promise alerts when a search has no stock", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { products: [] },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    render(<CatalogueFinder categories={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Help me find something" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Describe a product" }), {
      target: { value: "cocoa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));

    expect(await screen.findByText(/nothing in stock matches that search right now/i)).toBeDefined();
    expect(screen.getByText(/restock alerts aren’t available yet/i)).toBeDefined();
    expect(screen.getByRole("link", { name: "Browse catalogue results" }).getAttribute("href")).toBe("/products?q=cocoa");
  });
});
