"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  formatProductPrice,
  isProductListing,
  isRecord,
  productError,
  type ProductCategory,
  type ProductListing,
} from "@webubble/api-client/products";

function readProducts(payload: unknown): ProductListing[] {
  if (
    !isRecord(payload) || !isRecord(payload.data)
    || !Array.isArray(payload.data.products)
    || !payload.data.products.every(isProductListing)
  ) {
    throw new Error("The catalogue returned an invalid product list.");
  }
  return payload.data.products;
}

export default function CatalogueFinder({ categories }: { categories: ProductCategory[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListing[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchProducts(term: string): Promise<void> {
    const normalized = term.trim().slice(0, 80);
    if (!normalized) {
      setError("Enter a product or choose a category to search.");
      return;
    }

    setQuery(normalized);
    setLoading(true);
    setSearched(false);
    setError("");
    try {
      const params = new URLSearchParams({
        q: normalized,
        availability: "in_stock",
        sort: "newest",
      });
      const response = await fetch(`/api/catalogue/products?${params.toString()}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Product search is unavailable. Please try again."));
      setResults(readProducts(payload).slice(0, 4));
      setSearched(true);
    } catch (reason) {
      setResults([]);
      setError(reason instanceof Error ? reason.message : "Product search is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void searchProducts(query);
  }

  return (
    <aside className={`wb-finder${open ? " wb-finder--open" : ""}`}>
      {open && (
        <section className="wb-finder__panel" id="catalogue-finder-panel" aria-labelledby="catalogue-finder-title">
          <div className="wb-finder__header">
            <div>
              <p className="wb-kicker">WEBUBBLE SHOPPING HELP</p>
              <h2 id="catalogue-finder-title">What are you looking for?</h2>
            </div>
            <button className="wb-finder__close" type="button" aria-label="Close shopping help" onClick={() => setOpen(false)}>×</button>
          </div>
          <p className="wb-finder__intro">
            Tell me what you need and I’ll search approved listings that are in stock. I can’t reserve items or take payment.
          </p>
          {categories.length > 0 && (
            <div className="wb-finder__categories" aria-label="Quick product categories">
              {categories.slice(0, 4).map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => void searchProducts(category.name)}
                  disabled={loading}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          <form className="wb-finder__form" onSubmit={submitSearch}>
            <label htmlFor="catalogue-finder-query">Describe a product</label>
            <div>
              <input
                id="catalogue-finder-query"
                type="search"
                maxLength={80}
                value={query}
                placeholder="e.g. fresh oranges"
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit" disabled={loading}>{loading ? "Searching…" : "Find"}</button>
            </div>
          </form>
          {error && <p className="wb-finder__message wb-finder__message--error" role="alert">{error}</p>}
          {loading && <p className="wb-finder__message" role="status">Checking current in-stock listings…</p>}
          {!loading && searched && results.length > 0 && (
            <div className="wb-finder__results" aria-live="polite">
              <p>Here are matching listings available now:</p>
              <ul>
                {results.map((product) => (
                  <li key={product.id}>
                    <Link href={`/products/${product.id}`}>
                      <span>
                        <strong>{product.name}</strong>
                        <small>Admin approved · {product.category.name} · {product.seller_name}</small>
                      </span>
                      <span>{formatProductPrice(product.price_minor)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="wb-finder__all" href={`/products?q=${encodeURIComponent(query)}`}>
                See all matching products <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="wb-finder__message" role="status">
              <strong>Nothing in stock matches that search right now.</strong>
              <span>Try a different product or browse the full catalogue. Restock alerts aren’t available yet.</span>
              <Link href={`/products?q=${encodeURIComponent(query)}`}>Browse catalogue results</Link>
            </div>
          )}
        </section>
      )}
      <button
        className="wb-finder__toggle"
        type="button"
        aria-expanded={open}
        aria-controls={open ? "catalogue-finder-panel" : undefined}
        onClick={() => setOpen((currentlyOpen) => !currentlyOpen)}
      >
        <span className="wb-finder__toggle-icon" aria-hidden="true">{open ? "×" : "⌕"}</span>
        <span>{open ? "Close shopping help" : "Help me find something"}</span>
      </button>
    </aside>
  );
}
