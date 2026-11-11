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

  it("updates stock through an audited inventory adjustment", async () => {
    let listing = sellerProduct("draft");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/catalogue/categories") {
        return Promise.resolve(new Response(JSON.stringify({ data: { categories: [category] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }
      if (url.endsWith("/inventory-adjustments")) {
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            adjustments: [{
              id: 1,
              variant_label: "Standard",
              previous_stock_quantity: 0,
              new_stock_quantity: 8,
              previous_low_stock_threshold: 5,
              new_low_stock_threshold: 3,
              reason: "Restocked from supplier",
              actor: { name: "Local seller", email: "seller@example.com" },
              created_at: "2026-11-11T12:00:00.000Z",
            }],
          },
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      if (url.endsWith("/inventory")) {
        listing = {
          ...listing,
          inventory_variants: [{
            id: 100,
            label: "Standard",
            sku: null,
            stock_quantity: 8,
            low_stock_threshold: 3,
            is_low_stock: false,
          }],
          variants: [{ id: 100, label: "Standard", is_available: true }],
        };
        return Promise.resolve(new Response(JSON.stringify({ data: { variant: listing.inventory_variants[0] } }), {
          status: 200,
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

    fireEvent.change(await screen.findByLabelText("Stock on hand"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Low-stock alert at"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Reason for change"), { target: { value: "Restocked from supplier" } });
    fireEvent.click(screen.getByRole("button", { name: "Update stock" }));

    expect(await screen.findByText("Standard inventory updated.")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/seller/products/10/variants/100/inventory",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          expected_stock_quantity: 0,
          stock_quantity: 8,
          expected_low_stock_threshold: 5,
          low_stock_threshold: 3,
          reason: "Restocked from supplier",
        }),
      }),
    );

    fireEvent.click(screen.getByText("Inventory change history"));
    expect(await screen.findByText("Restocked from supplier")).toBeDefined();
    expect(screen.getByText("By seller@example.com")).toBeDefined();
  });
});
