"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductListing } from "@webubble/api-client/products";
import {
  formatProductPrice,
  isDemoProductListing,
  isProductListing,
  isRecord,
  productError,
} from "@webubble/api-client/products";

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

function parseRelatedResults(payload: unknown): ProductListing[] {
  if (
    !isRecord(payload) || !isRecord(payload.data)
    || !Array.isArray(payload.data.products)
    || !payload.data.products.every(isProductListing)
  ) {
    throw new Error("The server returned an invalid related products list.");
  }
  return payload.data.products;
}

export default function WhatPeopleBuy({ searchQuery, category }: { searchQuery?: string; category?: string }) {
  const [relatedProducts, setRelatedProducts] = useState<ProductListing[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState("");

  useEffect(() => {
    if (!searchQuery && !category) {
      setRelatedLoading(false);
      return;
    }

    let active = true;
    setRelatedLoading(true);
    setRelatedError("");

    const params = new URLSearchParams({
      availability: "in_stock",
      sort: "newest",
    });

    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (category) {
      params.set("category", category);
    }

    fetch(`/api/catalogue/products?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load related products."));
        const result = parseRelatedResults(payload);
        if (active) {
          setRelatedProducts(result.slice(0, 8));
          setRelatedError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setRelatedError(reason instanceof Error ? reason.message : "Unable to load related products.");
          setRelatedProducts([]);
        }
      })
      .finally(() => {
        if (active) setRelatedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, category]);

  if (!searchQuery && !category) {
    return null;
  }

  if (relatedLoading) {
    return (
      <section className="wb-related-section" aria-labelledby="related-title">
        <div className="wb-section-header">
          <h2 id="related-title" className="wb-section-title">
            {searchQuery ? `More for "${searchQuery}"` : `More in ${category}`}
          </h2>
        </div>
        <div className="wb-related-grid" role="status" aria-label="Loading related products">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="wb-product-card wb-product-card--loading" aria-hidden="true">
              <div className="wb-product-card__placeholder" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (relatedError || relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="wb-related-section" aria-labelledby="related-title">
      <div className="wb-section-header">
        <h2 id="related-title" className="wb-section-title">
          {searchQuery ? (
            <>
              <span aria-hidden="true">👥</span> People also buy
            </>
          ) : (
            <>
              <span aria-hidden="true">📦</span> More items
            </>
          )}
        </h2>
        {searchQuery && (
          <p className="wb-section-subtitle">Similar items and alternatives</p>
        )}
      </div>

      <div className="wb-related-grid">
        {relatedProducts.map((product) => (
          <article key={product.id} className="wb-product-card">
            <div className="wb-product-card__image-wrapper">
              {product.media[0] ? (
                <Image
                  src={`/api/catalogue/products/${product.id}/media/${product.media[0].id}`}
                  alt={product.name}
                  width={300}
                  height={250}
                  unoptimized
                  loading="lazy"
                  className="wb-product-card__image"
                />
              ) : (
                <div className="wb-product-card__placeholder" aria-hidden="true">
                  {productIcon(product.category.slug)}
                </div>
              )}
            </div>

            <div className="wb-product-card__content">
              <p className="wb-product-category">{product.category.name}</p>
              <h3 className="wb-product-card__title">
                <Link href={`/products/${product.id}`}>{product.name}</Link>
              </h3>
              <p className="wb-product-card__seller">
                by {product.seller_name}
                {product.seller_cac_verified && <span className="wb-cac-badge">✓ CAC</span>}
              </p>
              <p className="wb-product-card__price">{formatProductPrice(product.price_minor)}</p>
              {isDemoProductListing(product) && (
                <span className="wb-demo-badge">DEMO</span>
              )}
              <Link href={`/products/${product.id}`} className="wb-product-card__link">
                View product <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      {relatedProducts.length > 0 && (
        <div className="wb-section-footer">
          <Link href={searchQuery ? `/products?q=${encodeURIComponent(searchQuery)}` : `/products?category=${encodeURIComponent(category ?? '')}`} className="wb-view-all-link">
            See all results <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </section>
  );
}
