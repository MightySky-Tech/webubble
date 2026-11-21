"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductCategory } from "@webubble/api-client/products";
import { isProductCategory, isRecord } from "@webubble/api-client/products";

function categoryIcon(categorySlug: string): string {
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

export default function QuickCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/catalogue/categories", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("Unable to load categories.");
        if (
          !isRecord(payload) || !isRecord(payload.data)
          || !Array.isArray(payload.data.categories)
          || !payload.data.categories.every(isProductCategory)
        ) {
          throw new Error("The server returned an invalid category list.");
        }
        if (active) {
          setCategories(payload.data.categories);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load categories.");
          setCategories([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading || error || categories.length === 0) {
    return null;
  }

  return (
    <section className="wb-quick-categories" aria-labelledby="categories-title">
      <div className="wb-quick-categories__header">
        <h2 id="categories-title" className="wb-quick-categories__title">Shop by category</h2>
      </div>

      <div className="wb-quick-categories__container">
        {showLeftArrow && (
          <button
            className="wb-quick-categories__scroll-button wb-quick-categories__scroll-button--left"
            onClick={() => scroll("left")}
            aria-label="Scroll categories left"
            type="button"
          >
            <span aria-hidden="true">←</span>
          </button>
        )}

        <div className="wb-quick-categories__scroll" ref={scrollContainerRef} role="region" aria-label="Product categories">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className="wb-quick-category"
              title={category.name}
            >
              <span className="wb-quick-category__icon" aria-hidden="true">
                {categoryIcon(category.slug)}
              </span>
              <span className="wb-quick-category__name">{category.name}</span>
            </Link>
          ))}
        </div>

        {showRightArrow && (
          <button
            className="wb-quick-categories__scroll-button wb-quick-categories__scroll-button--right"
            onClick={() => scroll("right")}
            aria-label="Scroll categories right"
            type="button"
          >
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </section>
  );
}
