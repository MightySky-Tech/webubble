"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import {
  formatProductPrice,
  isProductCategory,
  isProductListing,
  isRecord,
  ProductCategory,
  ProductListing,
  productError,
} from "@webubble/api-client/products";

type DiscoveryFilters = {
  category: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
  sort: string;
};

const emptyFilters: DiscoveryFilters = {
  category: "",
  minPrice: "",
  maxPrice: "",
  availability: "",
  sort: "newest",
};

export default function ProductsPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filters, setFilters] = useState<DiscoveryFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(emptyFilters);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    let active = true;
    fetch("/api/catalogue/categories", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load product categories."));
        if (
          !isRecord(payload) || !isRecord(payload.data)
          || !Array.isArray(payload.data.categories)
          || !payload.data.categories.every(isProductCategory)
        ) {
          throw new Error("The server returned an invalid product category list.");
        }
        if (active) setCategories(payload.data.categories);
      })
      .catch((reason: unknown) => {
        if (active) setCategoryError(reason instanceof Error ? reason.message : "Unable to load product categories.");
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (appliedFilters.category) params.set("category", appliedFilters.category);
    if (appliedSearch) params.set("q", appliedSearch);
    if (appliedFilters.minPrice) {
      params.set("min_price_minor", String(Math.round(Number(appliedFilters.minPrice) * 100)));
    }
    if (appliedFilters.maxPrice) {
      params.set("max_price_minor", String(Math.round(Number(appliedFilters.maxPrice) * 100)));
    }
    if (appliedFilters.availability) params.set("availability", appliedFilters.availability);
    if (appliedFilters.sort !== "newest") params.set("sort", appliedFilters.sort);
    params.set("page", String(page));
    setProductsLoading(true);
    setError("");

    const query = params.toString();
    fetch(`/api/catalogue/products${query ? `?${query}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load live products."));
        if (
          !isRecord(payload) || !isRecord(payload.data)
          || !Array.isArray(payload.data.products)
          || !payload.data.products.every(isProductListing)
          || !isRecord(payload.meta)
          || typeof payload.meta.total !== "number"
          || typeof payload.meta.last_page !== "number"
        ) {
          throw new Error("The server returned an invalid live product catalogue.");
        }
        if (active) {
          setProducts(payload.data.products);
          setTotal(payload.meta.total);
          setLastPage(payload.meta.last_page);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load live products.");
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters, appliedSearch, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedSearch(search.trim());
    setAppliedFilters(filters);
    setPage(1);
  }

  function clearFilters(): void {
    setSearch("");
    setAppliedSearch("");
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  }

  return (
    <main className="wb-storefront wb-marketplace-page">
      <header className="wb-site-header">
        <Link className="wb-wordmark" href="/" aria-label="Webubble home">
          <Image className="wb-wordmark__image" src="/webubble_logo.jpg" alt="" width={32} height={32} priority />
          webubble
        </Link>
        <button
          className="wb-mobile-nav-toggle"
          type="button"
          aria-label={mobileNavigationOpen ? "Close main navigation" : "Open main navigation"}
          aria-expanded={mobileNavigationOpen}
          aria-controls="marketplace-navigation"
          onClick={() => setMobileNavigationOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileNavigationOpen ? "×" : "☰"}</span>
        </button>
        <nav
          id="marketplace-navigation"
          className={`wb-site-nav${mobileNavigationOpen ? " wb-site-nav--open" : ""}`}
          aria-label="Main navigation"
        >
          <Link href="/" onClick={() => setMobileNavigationOpen(false)}>Home</Link>
          <Link href="/seller/onboarding" onClick={() => setMobileNavigationOpen(false)}>Sell on Webubble</Link>
        </nav>
        <Link className="wb-account-link" href="/account">My account <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="wb-shop-heading" aria-labelledby="marketplace-title">
        <p className="wb-kicker">FROM APPROVED LOCAL SELLERS</p>
        <h1 id="marketplace-title">The neighbourhood marketplace.</h1>
        <p>These are real seller listings approved for discovery. Preview concepts are kept separate and are not for sale.</p>
      </section>

      <form className="wb-shop-filters" onSubmit={applyFilters}>
        <label className="wb-discovery-search">
          <span aria-hidden="true">⌕</span>
          <span className="wb-visually-hidden">Search live products</span>
          <input
            type="search"
            maxLength={80}
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="wb-shop-filter-field">
          <span>Category</span>
          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            disabled={categoriesLoading}
          >
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="wb-shop-filter-field">
          <span>Availability</span>
          <select
            value={filters.availability}
            onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))}
          >
            <option value="">Any availability</option>
            <option value="in_stock">In stock</option>
          </select>
        </label>
        <label className="wb-shop-filter-field">
          <span>Sort by</span>
          <select
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
          >
            <option value="newest">Recently approved</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <label className="wb-shop-filter-field">
          <span>Minimum price (₦)</span>
          <input
            type="number"
            min="0"
            max="1000000"
            step="1"
            inputMode="numeric"
            value={filters.minPrice}
            onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))}
          />
        </label>
        <label className="wb-shop-filter-field">
          <span>Maximum price (₦)</span>
          <input
            type="number"
            min="0"
            max="1000000"
            step="1"
            inputMode="numeric"
            value={filters.maxPrice}
            onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
          />
        </label>
        <div className="wb-shop-filter-actions">
          <button className="wb-primary-link wb-shop-search-button" type="submit">Apply filters</button>
          <button className="wb-shop-clear-button" type="button" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      {categoryError && <p className="wb-catalogue-error" role="alert">{categoryError}</p>}
      {error && <p className="wb-catalogue-error" role="alert">{error}</p>}
      <p className="wb-live-count" aria-live="polite">
        {productsLoading ? "Loading live listings…" : `${total} approved ${total === 1 ? "listing" : "listings"}`}
      </p>

      {productsLoading ? (
        <p className="wb-catalogue-status" aria-live="polite">Finding local products…</p>
      ) : error ? (
        <p className="wb-catalogue-status" role="status">Live listings could not be loaded.</p>
      ) : !error && products.length === 0 ? (
        <div className="wb-shop-empty" role="status">
          <span aria-hidden="true">🧺</span>
          <h2>No approved products yet</h2>
          <p>Seller listings will appear here after they pass moderation. Sample catalogue ideas remain preview-only.</p>
          <Link className="wb-text-link" href="/">See the concept preview <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <div className="wb-live-product-grid">
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
                <div className="wb-live-product-card__placeholder" aria-hidden="true">🧺</div>
              )}
              <div className="wb-live-product-card__details">
                <p className="wb-product-eyebrow">{product.category.name}</p>
                <h2><Link href={`/products/${product.id}`}>{product.name}</Link></h2>
                <p className="wb-live-product-card__description">{product.description}</p>
                {Object.keys(product.attributes).length > 0 && (
                  <dl>
                    {Object.entries(product.attributes).map(([name, value]) => (
                      <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
                    ))}
                  </dl>
                )}
                <p className="wb-live-product-card__seller">
                  Sold by {product.seller_name}
                  {product.seller_cac_verified && <span className="wb-cac-badge">CAC verified</span>}
                </p>
                <p className="wb-live-product-card__price">{formatProductPrice(product.price_minor)}</p>
                <p className="wb-live-product-card__note">
                  {product.variants.length} {product.variants.length === 1 ? "option" : "options"}
                  {" · "}{product.variants.filter((variant) => variant.is_available).length} available
                </p>
                <Link className="wb-text-link" href={`/products/${product.id}`}>View options <span aria-hidden="true">→</span></Link>
                <p className="wb-live-product-card__note">Checkout is not available yet. No purchase will be taken here.</p>
              </div>
            </article>
          ))}
        </div>
      )}
      {!productsLoading && !error && lastPage > 1 && (
        <nav className="wb-product-pagination" aria-label="Product results pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <span aria-live="polite">Page {page} of {lastPage}</span>
          <button type="button" disabled={page >= lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>
            Next
          </button>
        </nav>
      )}
    </main>
  );
}
