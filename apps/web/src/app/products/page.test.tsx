import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  variants: [{ id: 100, label: "Standard", is_available: true }],
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

  it("applies discovery filters and clears them", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      const data = url.includes("/categories")
        ? { data: { categories: [category] } }
        : { data: { products: [product] }, meta: { current_page: 1, last_page: 1, per_page: 24, total: 1 } };
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }));

    render(<ProductsPage />);
    await screen.findByRole("heading", { name: "Fresh orange basket" });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search live products" }), {
      target: { value: "orange" },
    });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: category.slug } });
    fireEvent.change(screen.getByLabelText("Availability"), { target: { value: "in_stock" } });
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price_asc" } });
    fireEvent.change(screen.getByLabelText("Minimum price (₦)"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Maximum price (₦)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      const request = requests
        .filter((url) => url.includes("/api/catalogue/products?"))
        .map((url) => new URL(url, "http://localhost"))
        .find((url) => url.searchParams.get("q") === "orange");
      expect(request?.searchParams.get("category")).toBe(category.slug);
      expect(request?.searchParams.get("availability")).toBe("in_stock");
      expect(request?.searchParams.get("sort")).toBe("price_asc");
      expect(request?.searchParams.get("min_price_minor")).toBe("100000");
      expect(request?.searchParams.get("max_price_minor")).toBe("500000");
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => {
      const request = requests
        .filter((url) => url.includes("/api/catalogue/products?"))
        .map((url) => new URL(url, "http://localhost"))
        .at(-1);
      expect(request?.searchParams.has("q")).toBe(false);
      expect(request?.searchParams.has("category")).toBe(false);
      expect(request?.searchParams.has("availability")).toBe(false);
      expect(request?.searchParams.get("page")).toBe("1");
    });
  });
});
