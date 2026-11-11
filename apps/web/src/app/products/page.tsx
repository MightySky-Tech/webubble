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

export default function ProductsPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

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
    if (category) params.set("category", category);
    if (appliedSearch) params.set("q", appliedSearch);
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
          || !isRecord(payload.meta) || typeof payload.meta.total !== "number"
        ) {
          throw new Error("The server returned an invalid live product catalogue.");
        }
        if (active) {
          setProducts(payload.data.products);
          setTotal(payload.meta.total);
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
  }, [appliedSearch, category]);

  function applySearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedSearch(search.trim());
  }

  return (
    <main className="wb-storefront wb-marketplace-page">
      <header className="wb-site-header">
        <Link className="wb-wordmark" href="/" aria-label="Webubble home">
          <span className="wb-wordmark__mark" aria-hidden="true">w</span>
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

      <form className="wb-shop-filters" onSubmit={applySearch}>
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
        <label className="wb-shop-category">
          <span className="wb-visually-hidden">Filter by category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={categoriesLoading}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <button className="wb-primary-link wb-shop-search-button" type="submit">Search</button>
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
                <h2>{product.name}</h2>
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
                <p className="wb-live-product-card__note">Checkout is not available yet. No purchase will be taken here.</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
