import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlobalProductSearch from "./GlobalProductSearch";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("global product search", () => {
  it("offers live in-stock product suggestions as shoppers type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        products: [{
          id: 17,
          category: { id: 1, name: "Fresh produce", slug: "fresh-produce", is_active: true },
          name: "Fresh orange basket",
          description: "Seasonal oranges.",
          attributes: {},
          price_minor: 325000,
          currency: "NGN",
          seller_name: "Local grower",
          seller_cac_verified: true,
          variants: [{ id: 31, label: "Standard", is_available: true }],
          media: [],
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    window.history.replaceState({}, "", "/?q=rice");
    render(<GlobalProductSearch />);

    const form = screen.getByRole("search");
    const input = await screen.findByRole("searchbox", { name: "Search products and local shops" });
    fireEvent.focus(input);

    expect(form.getAttribute("action")).toBe("/products");
    expect(form.getAttribute("method")).toBe("get");
    expect(input).toHaveProperty("name", "q");
    expect(input).toHaveProperty("value", "rice");
    expect(input.getAttribute("maxLength")).toBe("80");
    expect(await screen.findByText("Fresh orange basket")).toBeDefined();
    expect(screen.getByRole("link", { name: /fresh orange basket/i }).getAttribute("href")).toBe("/products/17");
  });

  it("explains when there are no in-stock search suggestions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { products: [] },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    render(<GlobalProductSearch />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search products and local shops" }), {
      target: { value: "cocoa" },
    });

    expect(await screen.findByText(/no in-stock matches for “cocoa” yet/i)).toBeDefined();
    expect(screen.getByRole("link", { name: "Browse search results" }).getAttribute("href")).toBe("/products?q=cocoa");
  });

  it("remembers a small, deduplicated recent-search list on this device", () => {
    render(<GlobalProductSearch />);
    const input = screen.getByRole("searchbox", { name: "Search products and local shops" });
    const form = screen.getByRole("search");

    fireEvent.change(input, { target: { value: "rice" } });
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: "beans" } });
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: "RICE" } });
    fireEvent.submit(form);

    expect(JSON.parse(window.localStorage.getItem("webubble.recent-searches.v1") ?? "[]"))
      .toEqual(["RICE", "beans"]);
  });
});
