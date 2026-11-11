import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductModerationPage from "./page";

const category = {
  id: 1,
  name: "Fresh produce",
  slug: "fresh-produce",
  is_active: true,
};

const pendingProduct = {
  id: 10,
  category,
  name: "Fresh orange basket",
  description: "Seasonal oranges selected by a local grower.",
  attributes: { Origin: "Lagos" },
  price_minor: 325000,
  currency: "NGN",
  seller_name: "Local seller",
  seller_cac_verified: false,
  variants: [{ id: 100, label: "Standard", is_available: false }],
  media: [],
  inventory_variants: [{
    id: 100,
    label: "Standard",
    sku: null,
    stock_quantity: 0,
    low_stock_threshold: 5,
    is_low_stock: true,
  }],
  status: "pending",
  review_notes: null,
  submitted_at: "2026-11-11T12:00:00.000Z",
  reviewed_at: null,
  seller: { id: 2, name: "Local seller", email: "seller@example.com" },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("product moderation", () => {
  it("publishes a pending seller listing through the admin review action", async () => {
    let hasPendingProduct = true;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const data = url === "/api/auth/me"
        ? { data: { user: { id: 1, name: "Admin", email: "admin@example.com", roles: ["admin"] } } }
        : url === "/api/products/categories"
          ? { data: { categories: [category] } }
          : { data: { products: hasPendingProduct ? [pendingProduct] : [] } };
      if (url.endsWith("/review")) hasPendingProduct = false;
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: url.endsWith("/review") ? 200 : 200,
        headers: { "Content-Type": "application/json" },
      }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductModerationPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Approve and publish" }));

    expect((await screen.findByRole("status")).textContent).toMatch(/was published/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/10/review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ status: "approved", note: "" }),
      }),
    );
  });
});
