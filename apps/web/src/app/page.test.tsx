import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

const liveProduct = {
  id: 17,
  category: { id: 1, name: "Fresh produce", slug: "fresh-produce", is_active: true },
  name: "Fresh orange basket",
  description: "Seasonal oranges from a local grower.",
  attributes: {},
  price_minor: 325000,
  currency: "NGN",
  seller_name: "Local grower",
  seller_cac_verified: true,
  variants: [{ id: 31, label: "Standard", is_available: true }],
  media: [],
};

const groceryProduct = {
  ...liveProduct,
  id: 18,
  category: { id: 2, name: "Food & groceries", slug: "food-groceries", is_active: true },
  name: "Market day grocery bundle",
  description: "A useful bundle of pantry staples.",
  seller_name: "Neighbourhood grocer",
};

const activeCategories = [
  liveProduct.category,
  groceryProduct.category,
];

function stubHomeFetch(
  catalogue = preview.data.catalogue,
  products: unknown[] = [],
  categories: unknown[] = activeCategories,
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const parsedUrl = new URL(url, "http://localhost");
    const payload = url.includes("/api/catalogue-preview")
      ? { data: { catalogue } }
      : url.includes("/api/catalogue/categories")
        ? { data: { categories } }
        : (() => {
          const category = parsedUrl.searchParams.get("category");
          const search = parsedUrl.searchParams.get("q")?.toLocaleLowerCase();
          const matchingProducts = products.filter((product) => {
            if (category && !(
              typeof product === "object" && product !== null
              && "category" in product && typeof product.category === "object" && product.category !== null
              && "slug" in product.category && product.category.slug === category
            )) return false;
            if (!search) return true;
            if (typeof product !== "object" || product === null) return false;
            const text = [
              "name" in product ? product.name : "",
              "description" in product ? product.description : "",
              "seller_name" in product ? product.seller_name : "",
            ].filter((value): value is string => typeof value === "string").join(" ").toLocaleLowerCase();
            return text.includes(search);
          });
          return {
            data: { products: matchingProducts },
            meta: { total: matchingProducts.length },
          };
        })();
    return Promise.resolve(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderHome() {
  stubHomeFetch();
  return render(<Home />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("home page", () => {
  it("renders the Webubble heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: /your neighbourhood is ready to shop/i })).toBeDefined();
    expect(screen.getByRole("searchbox", { name: "Search products and local shops" })).toBeDefined();
    expect(screen.getByRole("link", { name: /explore local listings/i }).getAttribute("href")).toBe("/products");
    expect(screen.getByRole("link", { name: /grow your business/i }).getAttribute("href")).toBe("/seller/onboarding");
  });

  it("shows approved in-stock products on the landing page", async () => {
    stubHomeFetch(preview.data.catalogue, [liveProduct]);
    render(<Home />);

    const productShelf = screen.getByRole("region", { name: "Fresh finds from local sellers." });
    expect(await within(productShelf).findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
    expect(within(productShelf).getByText("Sold by Local grower")).toBeDefined();
    expect(within(productShelf).getByRole("link", { name: /explore product/i }).getAttribute("href")).toBe("/products/17");
    expect(screen.getByText(/orders and checkout are not enabled yet/i)).toBeDefined();
  });

  it("filters the homepage shelf using active marketplace categories", async () => {
    const fetchMock = stubHomeFetch(preview.data.catalogue, [liveProduct, groceryProduct]);
    render(<Home />);

    const initialProductShelf = screen.getByRole("region", { name: "Fresh finds from local sellers." });
    expect(await within(initialProductShelf).findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
    const categoryNavigation = screen.getByRole("navigation", { name: "Filter available products by category" });
    fireEvent.click(within(categoryNavigation).getByRole("button", { name: "Food & groceries" }));

    expect(await screen.findByRole("heading", { name: "Explore Food & groceries" })).toBeDefined();
    const productShelf = screen.getByRole("region", { name: "Explore Food & groceries" });
    expect(await within(productShelf).findByRole("heading", { name: "Market day grocery bundle" })).toBeDefined();
    expect(within(productShelf).queryByRole("heading", { name: "Fresh orange basket" })).toBeNull();
    expect(fetchMock.mock.calls.some(([input]) =>
      new URL(String(input), "http://localhost").searchParams.get("category") === "food-groceries",
    )).toBe(true);

    fireEvent.click(within(categoryNavigation).getByRole("button", { name: "All local finds" }));
    const allProductsShelf = screen.getByRole("region", { name: "Fresh finds from local sellers." });
    expect(await within(allProductsShelf).findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
  });

  it("recommends in-stock listings using recent searches and lets shoppers clear that history", async () => {
    const fetchMock = stubHomeFetch(preview.data.catalogue, [liveProduct, groceryProduct]);
    window.localStorage.setItem("webubble.recent-searches.v1", JSON.stringify(["orange"]));
    render(<Home />);

    expect(await screen.findByRole("heading", { name: "Picked from your recent searches." })).toBeDefined();
    const recommendations = screen.getByRole("region", { name: /picked from your recent searches/i });
    expect(await within(recommendations).findByRole("heading", { name: "Fresh orange basket" })).toBeDefined();
    expect(within(recommendations).queryByRole("heading", { name: "Market day grocery bundle" })).toBeNull();
    expect(within(recommendations).getByText("Stored only on this device.")).toBeDefined();
    expect(fetchMock.mock.calls.some(([input]) =>
      new URL(String(input), "http://localhost").searchParams.get("q") === "orange",
    )).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Clear recent searches" }));
    expect(await screen.findByRole("heading", { name: "Everyday essentials to explore." })).toBeDefined();
    expect(window.localStorage.getItem("webubble.recent-searches.v1")).toBeNull();
    const everydayRecommendations = screen.getByRole("region", { name: /everyday essentials to explore/i });
    expect(await within(everydayRecommendations).findByRole("heading", { name: "Market day grocery bundle" })).toBeDefined();
  });

  it("clearly labels local demo listings as not for sale", async () => {
    stubHomeFetch(preview.data.catalogue, [{
      ...liveProduct,
      name: "DEMO ONLY: Fresh orange basket",
      seller_name: "DEMO ONLY - Local test shop",
      seller_cac_verified: false,
    }]);
    render(<Home />);

    const productShelf = screen.getByRole("region", { name: "Fresh finds from local sellers." });
    expect(await within(productShelf).findByText("DEMO ONLY · NOT FOR SALE")).toBeDefined();
    expect(screen.queryByText("CAC verified")).toBeNull();
  });

  it("explains when there are no approved products instead of showing concepts as offers", async () => {
    renderHome();

    expect(await screen.findByRole("heading", { name: "Your local finds are on the way." })).toBeDefined();
    expect(screen.getByText(/new products will appear here as local sellers join/i)).toBeDefined();
  });

  it("keeps the concept section concise and lets visitors expand it", async () => {
    const catalogue = Array.from({ length: 8 }, (_, index) => ({
      ...preview.data.catalogue[0],
      id: index + 1,
      name: `Local concept ${index + 1}`,
      position: index + 1,
    }));
    stubHomeFetch(catalogue);

    render(<Home />);

    expect(await screen.findByRole("heading", { name: "Local concept 1" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Local concept 6" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Local concept 7" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "See all 8 concepts" }));
    expect(screen.getByRole("heading", { name: "Local concept 8" })).toBeDefined();
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

  it("opens the live category catalogue when a shopper selects a category card", async () => {
    renderHome();

    const groceryCategoryLink = await screen.findByRole("link", { name: "Browse Food & groceries products" });
    expect(groceryCategoryLink.getAttribute("href")).toBe("/products?category=food-groceries");
  });

  it("keeps Food & groceries navigation available when live categories are unavailable", async () => {
    stubHomeFetch(preview.data.catalogue, [liveProduct], []);
    render(<Home />);

    const groceryCategoryLink = await screen.findByRole("link", { name: "Browse Food & groceries products" });
    expect(groceryCategoryLink.getAttribute("href")).toBe("/products?category=food-groceries");
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
