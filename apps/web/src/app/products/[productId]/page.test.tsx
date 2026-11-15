import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductDetailsPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ productId: "10" }),
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
});

describe("product details", () => {
  it("shows options and availability without offering checkout", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      data: { product },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))));

    render(<ProductDetailsPage />);

    expect(await screen.findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
    expect(screen.getByRole("radio", { name: /1 kg available/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /2 kg out of stock/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: /checkout|buy|cart/i })).toBeNull();
    expect(screen.getByText(/ordering is not available yet/i)).toBeDefined();
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
