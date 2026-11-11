import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SellerProductsPage from "./page";

const category = {
  id: 1,
  name: "Fresh produce",
  slug: "fresh-produce",
  is_active: true,
};

function sellerProduct(status: "draft" | "pending") {
  return {
    id: 10,
    category,
    name: "Fresh orange basket",
    description: "Seasonal oranges selected by a local grower.",
    attributes: { Origin: "Lagos" },
    price_minor: 325000,
    currency: "NGN" as const,
    seller_name: "Local seller",
    seller_cac_verified: false,
    media: [],
    status,
    review_notes: null,
    submitted_at: status === "pending" ? "2026-11-11T12:00:00.000Z" : null,
    reviewed_at: null,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("seller product listings", () => {
  it("submits a seller's draft for moderation", async () => {
    let listing = sellerProduct("draft");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/catalogue/categories") {
        return Promise.resolve(new Response(JSON.stringify({ data: { categories: [category] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }
      if (url.endsWith("/submit")) {
        listing = sellerProduct("pending");
        return Promise.resolve(new Response(JSON.stringify({ data: { product: listing } }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({ data: { products: [listing] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SellerProductsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Submit for review" }));

    expect((await screen.findByRole("status")).textContent).toMatch(/submitted/i);
    await waitFor(() => expect(screen.getByText("pending")).toBeDefined());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/seller/products/10/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
