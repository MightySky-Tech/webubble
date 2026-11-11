import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const preview = {
  data: {
    catalogue: [
      {
        id: 1,
        category: "Fresh produce",
        name: "Seasonal citrus mix",
        description: "An example preview card.",
        icon: "🍊",
        position: 10,
        currency: "NGN",
        price_minor: 325000,
        stock_quantity: 12,
        seller_name: "Demo Produce Stand",
        seller_claim: "Fictional seller profile for design review.",
        preview_only: true,
        demo_data: true,
      },
      {
        id: 2,
        category: "Fashion & fabrics",
        name: "Everyday Ankara tote",
        description: "Another example preview card.",
        icon: "👜",
        position: 20,
        currency: "NGN",
        price_minor: 4800000,
        stock_quantity: 7,
        seller_name: "Demo Fashion Studio",
        seller_claim: "Fictional seller profile for design review.",
        preview_only: true,
        demo_data: true,
      },
      {
        id: 3,
        category: "Street food",
        name: "Sample akara snack pack",
        description: "An owner-added demo category.",
        icon: "🥙",
        position: 30,
        currency: "NGN",
        price_minor: 150000,
        stock_quantity: 9,
        seller_name: "Demo Street Stall",
        seller_claim: "Fictional seller profile for design review.",
        preview_only: true,
        demo_data: true,
      },
    ],
  },
};

function renderHome() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(JSON.stringify(preview), { status: 200, headers: { "Content-Type": "application/json" } }),
  ));
  return render(<Home />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("home page", () => {
  it("renders the Webubble heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: /good things are closer/i })).toBeDefined();
  });

  it("makes primary navigation available through the mobile menu", () => {
    renderHome();

    const toggle = screen.getByRole("button", { name: "Open main navigation" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Close main navigation" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("navigation", { name: "Main navigation" }).textContent).toContain("Sell on Webubble");
  });

  it("filters proposed shopping categories as the visitor searches", () => {
    renderHome();

    fireEvent.change(screen.getByRole("searchbox", { name: "Find a shopping category" }), {
      target: { value: "fashion" },
    });

    expect(screen.getByRole("button", { name: /fashion & fabrics/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /food & groceries/i })).toBeNull();
  });

  it("filters concept catalogue ideas and keeps them clearly marked as previews", async () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /fresh produce/i }));

    expect(screen.getByText(/proposed category/i)).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Seasonal citrus mix" })).toBeDefined();
    expect(screen.getByText(/Demo price:/)).toBeDefined();
    expect(screen.getByText(/Demo stock:/)).toBeDefined();
    expect(screen.getByText(/Fictional seller:/)).toBeDefined();
    expect(screen.getByText(/not real offers or businesses, and are not verified seller claims/i)).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Everyday Ankara tote" })).toBeNull();
  });

  it("makes admin-added catalogue categories available in storefront filters", async () => {
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: /street food/i }));

    expect(await screen.findByRole("heading", { name: "Sample akara snack pack" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Seasonal citrus mix" })).toBeNull();
  });
});
