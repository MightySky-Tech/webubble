import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductDetailsPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ productId: "10" }),
  useRouter: () => ({ push: vi.fn() }),
}));

const product = {
  id: 10,
  category: { id: 1, name: "Fresh produce", slug: "fresh-produce", is_active: true },
  name: "Fresh orange basket",
  description: "Seasonal oranges selected by a local grower.",
  attributes: { Origin: "Lagos" },
  price_minor: 325000,
  currency: "NGN" as const,
  seller_name: "Local seller",
  seller_cac_verified: false,
  variants: [
    { id: 100, label: "1 kg", is_available: true },
    { id: 101, label: "2 kg", is_available: false },
  ],
  media: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function stubProductResponse() {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
    data: { product },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }))));
}

describe("product details", () => {
  it("shows options, availability and the add-to-cart actions", async () => {
    stubProductResponse();

    render(<ProductDetailsPage />);

    expect(await screen.findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
    expect(screen.getByRole("radio", { name: /1 kg available/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /2 kg out of stock/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /^add 1 fresh orange basket to cart$/i })).toBeDefined();
  });

  it("adds the selected option to the cart in the shape the cart page reads", async () => {
    stubProductResponse();

    render(<ProductDetailsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /^add 1 fresh orange basket to cart$/i }));

    expect(JSON.parse(localStorage.getItem("webubble_cart") ?? "[]")).toEqual([
      expect.objectContaining({
        id: "10-100",
        product_id: 10,
        variant_id: 100,
        variant_label: "1 kg",
        price_minor: 325000,
        quantity: 1,
        stock_available: 99,
      }),
    ]);
  });

  it("labels the local demo seller and listing as fictional and not for sale", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      data: {
        product: {
          ...product,
          name: "DEMO ONLY: Fresh orange basket",
          seller_name: "DEMO ONLY - Local test shop",
        },
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))));

    render(<ProductDetailsPage />);

    expect(await screen.findByText(/demo only · fictional test data · not for sale/i)).toBeDefined();
    expect(screen.queryByText("CAC verified")).toBeNull();
  });
});
