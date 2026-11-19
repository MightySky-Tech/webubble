import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatProductPrice } from "@webubble/api-client/products";
import { makeProduct } from "@/test/fixtures";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import ShoppingMinimalPage from "./page";

const oranges = makeProduct({ id: 1, name: "Fresh orange basket" });
const rice = makeProduct({
  id: 2,
  name: "Local rice",
  category: { id: 2, name: "Groceries", slug: "groceries", is_active: true },
  price_minor: 4500000,
  variants: [{ id: 20, label: "Bag", is_available: false }],
  media: [],
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(orders: () => Response = () => json({ message: "Not authenticated" }, 401)) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = String(input);
    if (url.startsWith("/api/catalogue/products")) {
      return Promise.resolve(json({ data: { products: [oranges, rice] } }));
    }
    if (url === "/api/orders") return Promise.resolve(orders());
    return Promise.resolve(json({ message: "Unexpected request" }, 500));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function searchFor(term: string) {
  fireEvent.change(screen.getByLabelText("Search products"), { target: { value: term } });
  fireEvent.submit(screen.getByRole("search"));
  await screen.findByText(oranges.name);
}

function fillDelivery() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Obi" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "08012345678" } });
  fireEvent.change(screen.getByLabelText("Address"), { target: { value: "12 Market Road" } });
  fireEvent.change(screen.getByLabelText("City or area"), { target: { value: "Ikeja" } });
  fireEvent.change(screen.getByLabelText("State"), { target: { value: "Lagos" } });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("minimal shopping page", () => {
  it("searches the catalogue and shows each product's real price", async () => {
    const fetchMock = stubFetch();
    render(<ShoppingMinimalPage />);

    await searchFor("orange");

    expect(fetchMock).toHaveBeenCalledWith("/api/catalogue/products?q=orange", expect.anything());
    expect(screen.getByText(formatProductPrice(oranges.price_minor))).toBeDefined();
    expect(screen.getByText(formatProductPrice(rice.price_minor))).toBeDefined();
  });

  it("says so when the catalogue is unavailable instead of reporting no matches", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ message: "Catalogue service is unavailable." }, 502))));
    render(<ShoppingMinimalPage />);

    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "orange" } });
    fireEvent.submit(screen.getByRole("search"));

    expect((await screen.findAllByText("Catalogue service is unavailable.")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/no products found/i)).toBeNull();
  });

  it("adds the first available option to the cart in the shape the cart page reads", async () => {
    stubFetch();
    render(<ShoppingMinimalPage />);
    await searchFor("orange");

    fireEvent.click(screen.getByRole("button", { name: "Add Fresh orange basket to cart" }));

    expect(JSON.parse(localStorage.getItem("webubble_cart") ?? "[]")).toEqual([
      expect.objectContaining({
        id: "1-100",
        product_id: 1,
        variant_id: 100,
        product_name: "Fresh orange basket",
        price_minor: 325000,
        quantity: 1,
      }),
    ]);
    expect(screen.getByText("🛒 Cart (1)")).toBeDefined();
  });

  it("does not add a product with no available option", async () => {
    stubFetch();
    render(<ShoppingMinimalPage />);
    await searchFor("orange");

    fireEvent.click(screen.getByRole("button", { name: "Add Local rice to cart" }));

    expect(await screen.findByText(/"Local rice" is out of stock/)).toBeDefined();
    expect(localStorage.getItem("webubble_cart")).toBeNull();
  });

  it("applies filters to the current results without searching again", async () => {
    const fetchMock = stubFetch();
    render(<ShoppingMinimalPage />);
    await searchFor("orange");

    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    fireEvent.click(screen.getByLabelText("In Stock Only"));

    expect(screen.queryByText("Local rice")).toBeNull();
    expect(screen.getByText("Fresh orange basket")).toBeDefined();

    fireEvent.click(screen.getByLabelText("In Stock Only"));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "groceries" } });

    expect(screen.queryByText("Fresh orange basket")).toBeNull();
    expect(screen.getByText("Local rice")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("saves a product to the wishlist", async () => {
    stubFetch();
    render(<ShoppingMinimalPage />);
    await searchFor("orange");

    fireEvent.click(screen.getByRole("button", { name: "Add Fresh orange basket to wishlist" }));

    expect(JSON.parse(localStorage.getItem("webubble_wishlist_data") ?? "[]")).toHaveLength(1);
    expect(screen.getByText("❤️ Wishlist (1)")).toBeDefined();
  });

  it("sends a quick purchase through the order API with the chosen provider", async () => {
    const fetchMock = stubFetch(() => json({ order: { id: "ord_1" } }));
    render(<ShoppingMinimalPage />);
    await searchFor("orange");

    fireEvent.click(screen.getByRole("button", { name: "Pay for Fresh orange basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    fillDelivery();
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    fireEvent.click(screen.getByLabelText("💳 Flutterwave"));
    fireEvent.click(screen.getByRole("button", { name: "🔒 Pay" }));

    expect(await screen.findByText("Order Placed!")).toBeDefined();
    const call = fetchMock.mock.calls.find(([url]) => String(url) === "/api/orders");
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body).toMatchObject({
      payment_provider: "flutterwave",
      total_amount_minor: 650000,
      cart_items: [expect.objectContaining({ product_id: 1, variant_id: 100, quantity: 2, price_minor: 325000 })],
      shipping_address: expect.objectContaining({ full_name: "Ada Obi", phone_number: "08012345678", state: "Lagos" }),
    });
  });

  it("keeps the item in the cart and asks a guest to sign in before ordering", async () => {
    stubFetch();
    render(<ShoppingMinimalPage />);
    await searchFor("orange");

    fireEvent.click(screen.getByRole("button", { name: "Pay for Fresh orange basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    fillDelivery();
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    fireEvent.click(screen.getByRole("button", { name: "🔒 Pay" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/sign-in"));
    expect(JSON.parse(localStorage.getItem("webubble_cart") ?? "[]")).toHaveLength(1);
  });
});
