"use client";

import { useEffect, useState } from "react";

export default function GlobalProductSearch() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q")?.slice(0, 80) ?? "");
  }, []);

  return (
    <form className="wb-global-search" action="/products" method="get" role="search">
      <label className="wb-global-search__field">
        <span className="wb-global-search__icon" aria-hidden="true">⌕</span>
        <span className="wb-visually-hidden">Search products and local shops</span>
        <input
          type="search"
          name="q"
          maxLength={80}
          autoComplete="off"
          placeholder="Search products, categories, local shops…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button type="submit" aria-label="Search">
        <span aria-hidden="true">→</span>
        <span>Search</span>
      </button>
    </form>
  );
}
