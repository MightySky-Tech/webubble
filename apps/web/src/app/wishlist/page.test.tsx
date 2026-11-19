import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatProductPrice } from "@webubble/api-client/products";
import { makeProduct } from "@/test/fixtures";
import WishlistPage from "./page";

const oranges = makeProduct({ id: 1, name: "Fresh orange basket" });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("webubble_wishlist_data", JSON.stringify([oranges]));
  localStorage.setItem("product_reviews_1", JSON.stringify([{ rating: 5 }, { rating: 4 }]));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("wishlist page", () => {
  it("shows saved products with their real price and review rating", async () => {
    render(<WishlistPage />);

    expect(await screen.findByText("Fresh orange basket")).toBeDefined();
    expect(screen.getByText(formatProductPrice(325000))).toBeDefined();
    expect(screen.getByText("(4.5)")).toBeDefined();
    expect(screen.getByText("1 item saved")).toBeDefined();
  });

  it("adds a saved product to the cart in the shape the cart page reads", async () => {
    render(<WishlistPage />);

    fireEvent.click(await screen.findByRole("button", { name: /add to cart/i }));

    expect(JSON.parse(localStorage.getItem("webubble_cart") ?? "[]")).toEqual([
      expect.objectContaining({ id: "1-100", product_name: "Fresh orange basket", price_minor: 325000, quantity: 1 }),
    ]);
  });

  it("removes a product and shows the empty state", async () => {
    render(<WishlistPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove Fresh orange basket from wishlist" }));

    expect(await screen.findByText("Your wishlist is empty")).toBeDefined();
    expect(JSON.parse(localStorage.getItem("webubble_wishlist_data") ?? "[]")).toEqual([]);
  });
});
