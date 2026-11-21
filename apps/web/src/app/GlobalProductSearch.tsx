"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { formatProductPrice, isProductListing, isRecord, productError, type ProductListing } from "@webubble/api-client/products";
import { recordSearch } from "@/lib/searchHistory";

function readSuggestions(payload: unknown): ProductListing[] {
  if (
    !isRecord(payload) || !isRecord(payload.data)
    || !Array.isArray(payload.data.products)
    || !payload.data.products.every(isProductListing)
  ) {
    throw new Error("The catalogue returned an invalid suggestion list.");
  }
  return payload.data.products;
}

export default function GlobalProductSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductListing[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q")?.slice(0, 80) ?? "");
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError("");
      const params = new URLSearchParams({
        q: term,
        availability: "in_stock",
        sort: "newest",
      });
      fetch(`/api/catalogue/products?${params.toString()}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const payload: unknown = await response.json();
          if (!response.ok) throw new Error(productError(payload, "Product suggestions are unavailable."));
          return readSuggestions(payload);
        })
        .then((products) => {
          setSuggestions(products.slice(0, 5));
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setSearchError(reason instanceof Error ? reason.message : "Product suggestions are unavailable.");
          setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    function closeOnOutsideClick(event: PointerEvent): void {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [suggestionsOpen]);

  function rememberSearch(event: FormEvent<HTMLFormElement>): void {
    if (!query.trim()) {
      event.preventDefault();
      return;
    }
    setSuggestionsOpen(false);
    try {
      recordSearch(query, window.localStorage);
      setHistoryNotice("");
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      setHistoryNotice("Your search will work, but recent searches could not be saved on this device.");
    }
  }

  const showResults = suggestionsOpen && query.trim().length >= 2;

  return (
    <form
      ref={searchRef}
      className="wb-global-search"
      action="/products"
      method="get"
      role="search"
      onSubmit={rememberSearch}
    >
      <label className="wb-global-search__field">
        <span className="wb-global-search__icon" aria-hidden="true">⌕</span>
        <span className="wb-visually-hidden">Search products and local shops</span>
        <input
          type="search"
          name="q"
          maxLength={80}
          autoComplete="off"
          placeholder="Search products, categories, local shops…"
          aria-autocomplete="list"
          value={query}
          onFocus={() => setSuggestionsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSuggestionsOpen(false);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setSuggestionsOpen(true);
          }}
        />
      </label>
      <button type="submit" aria-label="Search">
        <span aria-hidden="true">→</span>
        <span>Search</span>
      </button>
      {showResults && (
        <div className="wb-global-search__suggestions" id="global-search-suggestions" role="region" aria-label="Product suggestions" aria-live="polite">
          {searchLoading ? (
            <p className="wb-global-search__message" role="status">Searching available products…</p>
          ) : searchError ? (
            <p className="wb-global-search__message wb-global-search__message--error" role="alert">{searchError}</p>
          ) : suggestions.length > 0 ? (
            <>
              <p className="wb-global-search__caption">Available now</p>
              <ul>
                {suggestions.map((product) => (
                  <li key={product.id}>
                    <Link href={`/products/${product.id}`} onClick={() => setSuggestionsOpen(false)}>
                      <span>
                        <strong>{product.name}</strong>
                        <small>Admin approved · {product.category.name} · {product.seller_name}</small>
                      </span>
                      <span className="wb-global-search__price">{formatProductPrice(product.price_minor)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="wb-global-search__all" href={`/products?q=${encodeURIComponent(query.trim())}`} onClick={() => setSuggestionsOpen(false)}>
                See all results for “{query.trim()}” <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <div className="wb-global-search__message">
              <strong>No in-stock matches for “{query.trim()}” yet.</strong>
              <span>Try a shorter search or browse all listings.</span>
              <Link href={`/products?q=${encodeURIComponent(query.trim())}`} onClick={() => setSuggestionsOpen(false)}>Browse search results</Link>
            </div>
          )}
        </div>
      )}
      {historyNotice && <span className="wb-visually-hidden" role="status">{historyNotice}</span>}
    </form>
  );
}
