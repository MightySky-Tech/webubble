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

function parseTrendingResults(payload: unknown): ProductListing[] {
  if (
    !isRecord(payload) || !isRecord(payload.data)
    || !Array.isArray(payload.data.products)
    || !payload.data.products.every(isProductListing)
  ) {
    throw new Error("The server returned an invalid trending products list.");
  }
  return payload.data.products;
}

export default function TrendingProducts() {
  const [trendingProducts, setTrendingProducts] = useState<ProductListing[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState("");

  useEffect(() => {
    let active = true;
    setTrendingLoading(true);
    
    // Fetch trending products - most viewed or most purchased
    const params = new URLSearchParams({
      availability: "in_stock",
      sort: "popular", // Changed from 'newest' to 'popular' for trending
    });

    fetch(`/api/catalogue/products?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load trending products."));
        const result = parseTrendingResults(payload);
        if (active) {
          setTrendingProducts(result.slice(0, 6)); // Show first 6 trending products
          setTrendingError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setTrendingError(reason instanceof Error ? reason.message : "Unable to load trending products.");
          setTrendingProducts([]);
        }
      })
      .finally(() => {
        if (active) setTrendingLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (trendingLoading) {
    return (
      <section className="wb-trending-section" aria-labelledby="trending-title">
        <div className="wb-section-header">
          <h2 id="trending-title" className="wb-section-title">
            <span aria-hidden="true">🔥</span> Trending Now
          </h2>
          <p className="wb-section-subtitle">What people are buying right now</p>
        </div>
        <div className="wb-trending-grid" role="status" aria-label="Loading trending products">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="wb-trending-card wb-trending-card--loading" aria-hidden="true">
              <div className="wb-trending-card__placeholder" />
              <div className="wb-trending-card__content" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (trendingError || trendingProducts.length === 0) {
    return null; // Don't show section if no data
  }

  return (
    <section className="wb-trending-section" aria-labelledby="trending-title">
      <div className="wb-section-header">
        <h2 id="trending-title" className="wb-section-title">
          <span aria-hidden="true">🔥</span> Trending Now
        </h2>
        <p className="wb-section-subtitle">What people are buying right now</p>
        <Link href="/products?sort=popular" className="wb-view-all-link">
          View all trending <span aria-hidden="true">→</span>
        </Link>
      </div>
      
      <div className="wb-trending-grid">
        {trendingProducts.map((product) => (
          <article key={product.id} className="wb-trending-card">
            <div className="wb-trending-card__image-wrapper">
              {product.media[0] ? (
                <Image
                  src={`/api/catalogue/products/${product.id}/media/${product.media[0].id}`}
                  alt={product.name}
                  width={300}
                  height={250}
                  unoptimized
                  loading="lazy"
                  className="wb-trending-card__image"
                />
              ) : (
                <div className="wb-trending-card__placeholder" aria-hidden="true">
                  {productIcon(product.category.slug)}
                </div>
              )}
              <div className="wb-trending-card__badge">Popular</div>
            </div>
            
            <div className="wb-trending-card__content">
              <p className="wb-product-category">{product.category.name}</p>
              <h3 className="wb-trending-card__title">
                <Link href={`/products/${product.id}`}>{product.name}</Link>
              </h3>
              <p className="wb-trending-card__seller">
                by {product.seller_name}
                {product.seller_cac_verified && <span className="wb-cac-badge">✓ CAC</span>}
              </p>
              <p className="wb-trending-card__price">{formatProductPrice(product.price_minor)}</p>
              {isDemoProductListing(product) && (
                <span className="wb-demo-badge">DEMO ONLY</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
