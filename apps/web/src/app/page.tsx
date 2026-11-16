"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@webubble/api-client";
import {
  formatProductPrice,
  isDemoProductListing,
  isProductCategory,
  isProductListing,
  isRecord,
  productError,
} from "@webubble/api-client/products";
import type { ProductCategory, ProductListing } from "@webubble/api-client/products";
import GlobalProductSearch from "./GlobalProductSearch";
import CatalogueFinder from "./CatalogueFinder";
import TrendingProducts from "./TrendingProducts";
import QuickCategories from "./QuickCategories";
import WhatPeopleBuy from "./WhatPeopleBuy";
import { clearRecentSearches, getRecentSearches } from "@/lib/searchHistory";

type CataloguePreviewCard = components["schemas"]["CataloguePreviewCard"];

function isCataloguePreviewCard(value: unknown): value is CataloguePreviewCard {
  return typeof value === "object" && value !== null
    && "id" in value && typeof value.id === "number"
    && "category" in value && typeof value.category === "string"
    && "name" in value && typeof value.name === "string"
    && "description" in value && typeof value.description === "string"
    && "icon" in value && typeof value.icon === "string"
    && "position" in value && typeof value.position === "number"
    && "currency" in value && value.currency === "NGN"
    && "price_minor" in value && typeof value.price_minor === "number"
    && "stock_quantity" in value && typeof value.stock_quantity === "number"
    && "seller_name" in value && typeof value.seller_name === "string"
    && "seller_claim" in value && typeof value.seller_claim === "string"
    && "preview_only" in value && value.preview_only === true
    && "demo_data" in value && value.demo_data === true;
}

function formatPrice(priceMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(priceMinor / 100);
}

function productIcon(categorySlug: string): string {
  const icons: Record<string, string> = {
    "food-groceries": "🧺",
    "fresh-produce": "🍊",
    "fashion-fabrics": "🧵",
    "home-living": "🏺",
    "beauty-care": "🧴",
    "electronics-accessories": "🎧",
    "street-food": "🥙",
  };
  return icons[categorySlug] ?? "🛍️";
}

function parseProductResults(payload: unknown): { products: ProductListing[]; total: number } {
  if (
    !isRecord(payload) || !isRecord(payload.data)
    || !Array.isArray(payload.data.products)
    || !payload.data.products.every(isProductListing)
    || !isRecord(payload.meta) || typeof payload.meta.total !== "number"
  ) {
    throw new Error("The server returned an invalid local product list.");
  }
  return { products: payload.data.products, total: payload.meta.total };
}

function rankSearchRecommendations(products: ProductListing[], searches: string[]): ProductListing[] {
  const searchTerms = searches.map((search) => ({
    phrase: search.trim().toLocaleLowerCase(),
    tokens: search.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1),
  }));
  return products
    .map((product, index) => {
      const searchableText = [
        product.name,
        product.description,
        product.category.name,
        product.seller_name,
      ].join(" ").toLocaleLowerCase();
      const score = searchTerms.reduce((total, search, searchIndex) => {
        const recencyWeight = searchTerms.length - searchIndex;
        const matchingTokens = search.tokens.filter((token) => searchableText.includes(token)).length;
        const phraseMatch = search.phrase.length > 0 && searchableText.includes(search.phrase);
        return total + matchingTokens * recencyWeight + (phraseMatch ? 3 * recencyWeight : 0);
      }, 0);
      return { product, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ product }) => product);
}

function HomeProductGrid({ products }: { products: ProductListing[] }) {
  return (
    <div className="wb-live-product-grid wb-home-products__grid">
      {products.map((product) => (
        <article className="wb-live-product-card" key={product.id}>
          {product.media[0] ? (
            <Image
              src={`/api/catalogue/products/${product.id}/media/${product.media[0].id}`}
              alt={product.name}
              width={800}
              height={600}
              unoptimized
              loading="lazy"
            />
          ) : (
            <div className="wb-live-product-card__placeholder" aria-hidden="true">
              {productIcon(product.category.slug)}
            </div>
          )}
          <div className="wb-live-product-card__details">
            <p className="wb-product-eyebrow">{product.category.name}</p>
            <span className="wb-admin-approved-badge"><span aria-hidden="true">✓</span> Admin approved</span>
            <h3><Link href={`/products/${product.id}`}>{product.name}</Link></h3>
            <p className="wb-live-product-card__seller">
              Sold by {product.seller_name}
              {product.seller_cac_verified && <span className="wb-cac-badge">CAC verified</span>}
            </p>
            {isDemoProductListing(product) && (
              <span className="wb-demo-badge">DEMO ONLY · NOT FOR SALE</span>
            )}
            <p className="wb-live-product-card__price">{formatProductPrice(product.price_minor)}</p>
            <p className="wb-live-product-card__note">
              {product.variants.filter((variant) => variant.is_available).length} options available
            </p>
            <Link className="wb-text-link" href={`/products/${product.id}`}>
              Explore product <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

const categoryIdeas = [
  { name: "Food & groceries", icon: "🥬", detail: "Market runs and everyday essentials", tone: "green" },
  { name: "Fresh produce", icon: "🍊", detail: "Seasonal picks from local sellers", tone: "orange" },
  { name: "Fashion & fabrics", icon: "🧵", detail: "Personal style, made close by", tone: "pink" },
  { name: "Home & living", icon: "🏺", detail: "Thoughtful finds for your space", tone: "blue" },
  { name: "Beauty & care", icon: "🧴", detail: "Everyday care and feel-good finds", tone: "purple" },
  { name: "Electronics & accessories", icon: "🎧", detail: "Useful things for work and play", tone: "yellow" },
] as const;

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<CataloguePreviewCard[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState("");
  const [featuredProducts, setFeaturedProducts] = useState<ProductListing[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductListing[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchHistoryReady, setSearchHistoryReady] = useState(false);
  const [searchHistoryError, setSearchHistoryError] = useState("");
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productCategoriesReady, setProductCategoriesReady] = useState(false);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [approvedProductCount, setApprovedProductCount] = useState(0);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [showAllConcepts, setShowAllConcepts] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/catalogue/categories", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load shopping categories."));
        if (
          !isRecord(payload) || !isRecord(payload.data)
          || !Array.isArray(payload.data.categories)
          || !payload.data.categories.every(isProductCategory)
        ) {
          throw new Error("The server returned an invalid shopping category list.");
        }
        if (active) setProductCategories(payload.data.categories);
      })
      .catch((reason: unknown) => {
        if (active) setCategoriesError(reason instanceof Error ? reason.message : "Unable to load shopping categories.");
      })
      .finally(() => {
        if (active) setProductCategoriesReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setProductsLoading(true);
    const params = new URLSearchParams({
      availability: "in_stock",
      sort: "newest",
    });
    if (selectedProductCategory) params.set("category", selectedProductCategory);
    fetch(`/api/catalogue/products?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load local listings."));
        if (
          !isRecord(payload)
        ) throw new Error("The server returned an invalid local product list.");
        const result = parseProductResults(payload);
        if (active) {
          setFeaturedProducts(result.products.slice(0, 8));
          setApprovedProductCount(result.total);
          setProductsError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setProductsError(reason instanceof Error ? reason.message : "Unable to load local listings.");
          setFeaturedProducts([]);
          setApprovedProductCount(0);
        }
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProductCategory]);

  useEffect(() => {
    try {
      setRecentSearches(getRecentSearches(window.localStorage));
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      setSearchHistoryError("Recent-search recommendations are unavailable in this browser.");
    } finally {
      setSearchHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!searchHistoryReady || !productCategoriesReady) return;
    let active = true;
    setRecommendationsLoading(true);
    setRecommendationsError("");

    const searches = recentSearches.slice(0, 3);
    const everydayCategories = productCategories.filter((category) =>
      ["food-groceries", "fresh-produce"].includes(category.slug),
    );
    const params = searches.length > 0
      ? searches.map((search) => new URLSearchParams({
        q: search,
        availability: "in_stock",
        sort: "newest",
      }))
      : (everydayCategories.length > 0 ? everydayCategories : [null]).map((category) => {
        const query = new URLSearchParams({ availability: "in_stock", sort: "newest" });
        if (category) query.set("category", category.slug);
        return query;
      });

    Promise.all(params.map(async (query) => {
      const response = await fetch(`/api/catalogue/products?${query.toString()}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Unable to load your recommendations."));
      return parseProductResults(payload).products;
    }))
      .then((results) => {
        if (!active) return;
        const uniqueProducts = [...new Map(results.flat().map((product) => [product.id, product])).values()];
        setRecommendedProducts(
          searches.length > 0
            ? rankSearchRecommendations(uniqueProducts, searches).slice(0, 8)
            : uniqueProducts.slice(0, 8),
        );
      })
      .catch((reason: unknown) => {
        if (active) {
          setRecommendationsError(reason instanceof Error ? reason.message : "Unable to load your recommendations.");
          setRecommendedProducts([]);
        }
      })
      .finally(() => {
        if (active) setRecommendationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productCategories, productCategoriesReady, recentSearches, searchHistoryReady]);

  useEffect(() => {
    let active = true;
    fetch("/api/catalogue-preview", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = typeof payload === "object" && payload !== null
            && "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "Unable to load the catalogue preview.";
          throw new Error(message);
        }
        if (
          typeof payload !== "object" || payload === null
          || !("data" in payload) || typeof payload.data !== "object" || payload.data === null
          || !("catalogue" in payload.data) || !Array.isArray(payload.data.catalogue)
          || !payload.data.catalogue.every(isCataloguePreviewCard)
        ) {
          throw new Error("The server returned an invalid catalogue preview.");
        }
        if (active) setCatalogue(payload.data.catalogue);
      })
      .catch((reason: unknown) => {
        if (active) {
          setCatalogueError(reason instanceof Error ? reason.message : "Unable to load the catalogue preview.");
        }
      })
      .finally(() => {
        if (active) setCatalogueLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const displayedCategories = useMemo(() => {
    const knownCategories = new Set<string>(categoryIdeas.map((category) => category.name));
    const addedCategories = [...new Set(catalogue.map((card) => card.category))]
      .filter((name) => !knownCategories.has(name))
      .map((name) => ({ name, icon: "🧺", detail: "An owner-added category idea", tone: "green" }));
    return [...categoryIdeas, ...addedCategories];
  }, [catalogue]);
  const visibleCategories = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return displayedCategories.filter((category) =>
      `${category.name} ${category.detail}`.toLocaleLowerCase().includes(search),
    );
  }, [displayedCategories, query]);
  const visibleCatalogue = catalogue.filter((card) =>
    selectedCategory === null || card.category === selectedCategory,
  );
  const featuredCatalogue = showAllConcepts ? visibleCatalogue : visibleCatalogue.slice(0, 6);

  return (
    <main className="wb-storefront">
      <header className="wb-site-header">
        <Link className="wb-wordmark" href="/" aria-label="Webubble home">
          <Image className="wb-wordmark__image" src="/webubble_logo.jpg" alt="" width={32} height={32} priority />
          webubble
        </Link>
        <GlobalProductSearch />
        <button
          className="wb-mobile-nav-toggle"
          type="button"
          aria-label={mobileNavigationOpen ? "Close main navigation" : "Open main navigation"}
          aria-expanded={mobileNavigationOpen}
          aria-controls="main-navigation"
          onClick={() => setMobileNavigationOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileNavigationOpen ? "×" : "☰"}</span>
        </button>
        <nav
          id="main-navigation"
          className={`wb-site-nav${mobileNavigationOpen ? " wb-site-nav--open" : ""}`}
          aria-label="Main navigation"
        >
          <Link href="/products" onClick={() => setMobileNavigationOpen(false)}>Explore live listings</Link>
          <a href="#how-it-works" onClick={() => setMobileNavigationOpen(false)}>How it works</a>
          <Link href="/seller/onboarding" onClick={() => setMobileNavigationOpen(false)}>Sell on Webubble</Link>
        </nav>
        <Link className="wb-account-link" href="/account">My account <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="wb-hero" aria-labelledby="hero-title">
        <div className="wb-hero__copy">
          <p className="wb-kicker"><span aria-hidden="true">✳</span> LOCAL COMMERCE, MADE EASIER</p>
          <h1 id="hero-title">Your neighbourhood is ready to <em>shop.</em></h1>
          <p className="wb-hero__description">
            Find everyday essentials, explore local sellers, and see what is available now.
            Your next neighbourhood favourite is just a search away.
          </p>
          <div className="wb-hero__actions">
            <Link className="wb-primary-link" href="/products">Explore local listings <span aria-hidden="true">→</span></Link>
            <Link className="wb-hero__secondary-link" href="/seller/onboarding">Grow your business</Link>
          </div>
          <div className="wb-hero__note">
            <span className="wb-hero__note-icon" aria-hidden="true">⌖</span>
            <span>One marketplace. Independent local sellers.</span>
          </div>
        </div>
        <div className="wb-hero-art" aria-label="Illustration of a bright warehouse market with stocked shelves" role="img">
          <Image
            className="wb-hero-art__warehouse"
            src="/warehouse-market.svg"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 48vw"
          />
          <div className="wb-market-card wb-market-card--top">
            <span aria-hidden="true">⌕</span>
            <span>Find what you need<br /><strong>Shop local, all in one place</strong></span>
          </div>
          <div className="wb-market-card wb-market-card--bottom">
            <span className="wb-market-card__badge" aria-hidden="true">✓</span>
            <span>Real approved listings<br /><strong>From independent sellers</strong></span>
          </div>
        </div>
      </section>

      {/* NEW: Trending Products Section */}
      <TrendingProducts />

      {/* NEW: Quick Category Navigation */}
      <QuickCategories />

      <section className="wb-recommendations" aria-labelledby="recommendations-title">
        <div className="wb-section-heading">
          <div>
            <p className="wb-kicker">{recentSearches.length > 0 ? "PERSONALISED FROM YOUR SEARCHES" : "EVERYDAY SHOPPING"}</p>
            <h2 id="recommendations-title">
              {recentSearches.length > 0 ? "Picked from your recent searches." : "Everyday essentials to explore."}
            </h2>
            <p>
              {recentSearches.length > 0
                ? "Relevant approved listings, based on searches saved only in this browser."
                : "Useful food and fresh-produce listings, selected from approved local stock."}
            </p>
          </div>
          {recentSearches.length > 0 && (
            <button
              className="wb-recommendations__clear"
              type="button"
              onClick={() => {
                try {
                  clearRecentSearches(window.localStorage);
                  setRecentSearches([]);
                  setSearchHistoryError("");
                } catch (error) {
                  if (!(error instanceof DOMException)) throw error;
                  setSearchHistoryError("Recent searches could not be cleared in this browser.");
                }
              }}
            >
              Clear recent searches
            </button>
          )}
        </div>
        {recentSearches.length > 0 && (
          <div className="wb-recommendations__searches" aria-label="Recent searches used for these recommendations">
            <span>Based on</span>
            {recentSearches.slice(0, 3).map((search) => (
              <Link key={search} href={`/products?q=${encodeURIComponent(search)}`}>{search}</Link>
            ))}
            <span className="wb-recommendations__privacy">Stored only on this device.</span>
          </div>
        )}
        {searchHistoryError && <p className="wb-catalogue-error" role="status">{searchHistoryError}</p>}
        {recommendationsError ? (
          <p className="wb-catalogue-error" role="alert">{recommendationsError}</p>
        ) : recommendationsLoading ? (
          <p className="wb-catalogue-status" aria-live="polite">Finding suggestions for you…</p>
        ) : recommendedProducts.length > 0 ? (
          <HomeProductGrid products={recommendedProducts} />
        ) : (
          <div className="wb-recommendations__empty" role="status">
            <span aria-hidden="true">⌕</span>
            <p>
              {recentSearches.length > 0
                ? "No in-stock products match your recent searches yet. Try another search or browse all listings."
                : "Everyday picks will appear here as local sellers add approved, in-stock products."}
            </p>
            <Link className="wb-text-link" href="/products">Browse all listings <span aria-hidden="true">→</span></Link>
          </div>
        )}
      </section>

      {/* NEW: What People Buy Section - Shows related products based on recent searches */}
      {recentSearches.length > 0 && (
        <WhatPeopleBuy searchQuery={recentSearches[0]} />
      )}

      <section className="wb-home-products" id="local-picks" aria-labelledby="local-picks-title">
        <div className="wb-section-heading">
          <div>
            <p className="wb-kicker">SHOP WHAT’S AVAILABLE</p>
            <h2 id="local-picks-title">
              {selectedProductCategory
                ? `Explore ${productCategories.find((category) => category.slug === selectedProductCategory)?.name ?? "local finds"}`
                : "Fresh finds from local sellers."}
            </h2>
            <p>Browse admin-approved listings with stock available. Verified-purchase ratings will appear when customer reviews are supported.</p>
          </div>
          <Link className="wb-text-link" href="/products">See all listings <span aria-hidden="true">→</span></Link>
        </div>
        <nav className="wb-home-categories" aria-label="Filter available products by category">
          <button
            className="wb-home-category"
            type="button"
            aria-pressed={selectedProductCategory === null}
            onClick={() => setSelectedProductCategory(null)}
          >
            <span aria-hidden="true">✳</span> All local finds
          </button>
          {productCategories.map((category) => (
            <button
              className="wb-home-category"
              type="button"
              key={category.id}
              aria-pressed={selectedProductCategory === category.slug}
              onClick={() => setSelectedProductCategory(category.slug)}
            >
              <span aria-hidden="true">{productIcon(category.slug)}</span> {category.name}
            </button>
          ))}
        </nav>
        {categoriesError && <p className="wb-catalogue-error" role="alert">{categoriesError}</p>}
        {productsError ? (
          <p className="wb-catalogue-error" role="alert">{productsError}</p>
        ) : productsLoading ? (
          <p className="wb-catalogue-status" aria-live="polite">Finding available local products…</p>
        ) : featuredProducts.length === 0 ? (
          <div className="wb-home-products__empty" role="status">
            <span aria-hidden="true">🧺</span>
            <div>
            <h3>{selectedProductCategory ? "No in-stock finds in this category yet." : "Your local finds are on the way."}</h3>
              <p>
                {approvedProductCount > 0
                ? "There are approved listings, but none in this selection are currently marked in stock."
                : selectedProductCategory
                  ? "Try another category or explore all local finds."
                  : "New products will appear here as local sellers join and their listings are approved."}
            </p>
            {selectedProductCategory && (
              <button className="wb-home-category-reset" type="button" onClick={() => setSelectedProductCategory(null)}>
                Show all local finds
              </button>
            )}
            </div>
            {!selectedProductCategory && (
            <Link className="wb-primary-link" href="/seller/onboarding">Become a seller <span aria-hidden="true">→</span></Link>
            )}
          </div>
        ) : (
          <>
            <HomeProductGrid products={featuredProducts} />
            <p className="wb-home-products__note">
              {approvedProductCount > featuredProducts.length
                ? `Showing ${featuredProducts.length} of ${approvedProductCount} available listings.`
                : `${approvedProductCount} ${approvedProductCount === 1 ? "local listing" : "local listings"} available.`}
              {" "}Orders and checkout are not enabled yet.
            </p>
          </>
        )}
      </section>

      <section className="wb-value-strip" aria-label="How Webubble helps you shop">
        <article>
          <span aria-hidden="true">⌕</span>
          <div><strong>Find it faster</strong><p>Search products, categories, and local shops together.</p></div>
        </article>
        <article>
          <span aria-hidden="true">✓</span>
          <div><strong>Know who sells it</strong><p>See seller details and verification badges where applicable.</p></div>
        </article>
        <article>
          <span aria-hidden="true">◷</span>
          <div><strong>Check availability</strong><p>See which product options are currently available.</p></div>
        </article>
      </section>

      <section className="wb-discovery" id="shop" aria-labelledby="shop-title">
        <div className="wb-section-heading">
          <div>
            <p className="wb-kicker">EXPLORE THE MARKETPLACE</p>
            <h2 id="shop-title">Shop by what you need.</h2>
            <p>Choose a category to explore the current storefront direction.</p>
          </div>
          <span className="wb-draft-label">Proposed categories · for review</span>
        </div>

        <label className="wb-discovery-search">
          <span aria-hidden="true">⌕</span>
          <span className="wb-visually-hidden">Find a shopping category</span>
          <input
            type="search"
            placeholder="Find a shopping category..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedCategory(null);
              setShowAllConcepts(false);
            }}
          />
        </label>

        {visibleCategories.length > 0 ? (
          <div className="wb-category-grid">
            {visibleCategories.map((category) => {
              const liveCategory = productCategories.find(
                (item) => item.name.toLocaleLowerCase() === category.name.toLocaleLowerCase(),
              );
              const fallbackCategorySlug = category.name.toLocaleLowerCase() === "food & groceries"
                ? "food-groceries"
                : null;
              const targetCategorySlug = liveCategory?.slug ?? fallbackCategorySlug;
              const className = `wb-category-card wb-category-card--${category.tone}`;
              const contents = (
                <>
                  <span className="wb-category-card__icon" aria-hidden="true">{category.icon}</span>
                  <span className="wb-category-card__name">{category.name}</span>
                  <span className="wb-category-card__detail">{category.detail}</span>
                  <span className="wb-category-card__arrow" aria-hidden="true">↗</span>
                </>
              );
              return targetCategorySlug ? (
                <Link
                  className={className}
                  key={category.name}
                  href={`/products?category=${encodeURIComponent(targetCategorySlug)}`}
                  aria-label={`Browse ${category.name} products`}
                >
                  {contents}
                </Link>
              ) : (
                <button
                  className={className}
                  type="button"
                  key={category.name}
                  aria-pressed={selectedCategory === category.name}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {contents}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="wb-empty-search" role="status">
            <span aria-hidden="true">⌕</span>
            <p>No category ideas match “{query}”. Try another search.</p>
          </div>
        )}

        <p className="wb-preview-message" aria-live="polite">
          {selectedCategory
            ? `${selectedCategory} is a proposed category. Choose it to preview example catalogue ideas below.`
            : "These categories are a first-pass proposal for owner review."}
        </p>
        <Link className="wb-discovery-link" href="/products">
          Browse approved live listings <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="wb-catalogue-preview" id="catalogue" aria-labelledby="catalogue-title">
        <div className="wb-section-heading">
          <div>
            <p className="wb-kicker">CONCEPT CATALOGUE · NOT FOR SALE</p>
            <h2 id="catalogue-title">A preview of the shopping experience.</h2>
            <p>Review sample product cards and help shape the marketplace before launch.</p>
          </div>
          <span className="wb-draft-label">Fictional prices, stock & sellers</span>
        </div>
        <p className="wb-preview-message">
          All prices, stock counts, seller names and blurbs below are fictional examples for design
          review only. They are not real offers or businesses, and are not verified seller claims.
          No item is available to buy.
        </p>
        {catalogueError && <p className="wb-catalogue-error" role="alert">{catalogueError}</p>}
        {catalogueLoading ? (
          <p className="wb-catalogue-status" aria-live="polite">Loading catalogue ideas…</p>
        ) : !catalogueError ? (
          visibleCatalogue.length === 0 ? (
            <p className="wb-catalogue-status" role="status">
              {catalogue.length === 0
                ? "The owner has not added any catalogue ideas yet."
                : `No sample ideas are listed for ${selectedCategory}.`}
            </p>
          ) : (
            <div className="wb-product-preview-grid" id="catalogue-concept-grid">
              {featuredCatalogue.map((card) => (
                <article className="wb-product-preview-card" key={card.id}>
                  <div className="wb-product-preview-card__art" aria-hidden="true">{card.icon}</div>
                  <div className="wb-product-preview-card__details">
                    <p className="wb-product-preview-card__category">{card.category}</p>
                    <h3>{card.name}</h3>
                    <p>{card.description}</p>
                    <p className="wb-product-preview-card__demo-detail">
                      <strong>Demo price:</strong> {formatPrice(card.price_minor)}
                    </p>
                    <p className="wb-product-preview-card__demo-detail">
                      <strong>Demo stock:</strong> {card.stock_quantity} units
                    </p>
                    <p className="wb-product-preview-card__demo-detail">
                      <strong>Fictional seller:</strong> {card.seller_name}
                    </p>
                    <p className="wb-product-preview-card__demo-claim">{card.seller_claim}</p>
                    <span className="wb-preview-pill">Concept only · not available to buy</span>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}
        {!catalogueLoading && !catalogueError && visibleCatalogue.length > 6 && (
          <button
            className="wb-preview-more"
            type="button"
            aria-controls="catalogue-concept-grid"
            aria-expanded={showAllConcepts}
            onClick={() => setShowAllConcepts((showing) => !showing)}
          >
            {showAllConcepts ? "Show fewer ideas" : `See all ${visibleCatalogue.length} concepts`}
            <span aria-hidden="true">{showAllConcepts ? "↑" : "→"}</span>
          </button>
        )}
      </section>

      <section className="wb-how" id="how-it-works" aria-labelledby="how-title">
        <div className="wb-how__intro">
          <p className="wb-kicker">SHOP SMALL, FEEL CONNECTED</p>
          <h2 id="how-title">Your everyday, with a little more local in it.</h2>
          <p>
            Webubble brings neighbourhood discovery and convenient online shopping
            together, so local businesses can meet more of the people around them.
          </p>
        </div>
        <div className="wb-how__steps">
          <article className="wb-step">
            <span className="wb-step__number">01</span>
            <h3>Find your next favourite</h3>
            <p>Explore local shops and the categories that matter to your day.</p>
          </article>
          <article className="wb-step">
            <span className="wb-step__number">02</span>
            <h3>Know who you’re buying from</h3>
            <p>Clear seller information helps you shop with confidence.</p>
          </article>
          <article className="wb-step">
            <span className="wb-step__number">03</span>
            <h3>Make it a neighbourhood thing</h3>
            <p>Every local shop deserves a place in your everyday routine.</p>
          </article>
        </div>
      </section>

      <section className="wb-seller-banner">
        <div>
          <p className="wb-kicker">MADE FOR LOCAL SELLERS</p>
          <h2>Your shop deserves to be discovered.</h2>
          <p>Bring your business or informal stall online, one step at a time.</p>
        </div>
        <Link className="wb-seller-link" href="/seller/onboarding">Start your seller application <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="wb-site-footer">
        <Link className="wb-wordmark" href="/">
          <Image className="wb-wordmark__image" src="/webubble_logo.jpg" alt="" width={32} height={32} />
          webubble
        </Link>
        <p>Local commerce, with more heart.</p>
        <span>© Webubble Limited</span>
      </footer>
      <CatalogueFinder categories={productCategories} />
    </main>
  );
}
