import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductsPage from "./page";

const category = {
  id: 1,
  name: "Fresh produce",
  slug: "fresh-produce",
  is_active: true,
};

const product = {
  id: 10,
  category,
  name: "Fresh orange basket",
  description: "Seasonal oranges selected by a local grower.",
  attributes: { Origin: "Lagos" },
  price_minor: 325000,
  currency: "NGN",
  seller_name: "Local seller",
  seller_cac_verified: true,
  media: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("products page", () => {
  it("shows only the live product feed and the verified CAC badge", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.includes("/categories")
        ? { data: { categories: [category] } }
        : { data: { products: [product] }, meta: { current_page: 1, last_page: 1, per_page: 24, total: 1 } };
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }));

    render(<ProductsPage />);

    expect(await screen.findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
    expect(screen.getByText("CAC verified")).toBeDefined();
    expect(screen.getByText(/checkout is not available yet/i)).toBeDefined();
    await waitFor(() => expect(screen.getByText("1 approved listing")).toBeDefined());
  });
});
