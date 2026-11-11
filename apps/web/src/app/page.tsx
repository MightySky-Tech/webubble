"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@webubble/api-client";

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
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

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

  return (
    <main className="wb-storefront">
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
          <p className="wb-kicker"><span aria-hidden="true">✳</span> YOUR NEIGHBOURHOOD, ALL IN ONE PLACE</p>
          <h1 id="hero-title">Good things are <em>closer</em> than you think.</h1>
          <p className="wb-hero__description">
            Meet the local sellers, market finds and everyday essentials that make your
            neighbourhood feel like yours.
          </p>
          <Link className="wb-primary-link" href="/products">Browse live products <span aria-hidden="true">↓</span></Link>
          <div className="wb-hero__note">
            <span className="wb-hero__note-icon" aria-hidden="true">⌖</span>
            <span>Built for the way your community shops.</span>
          </div>
        </div>
        <div className="wb-hero-art" aria-label="Illustration of a colourful local market basket" role="img">
          <span className="wb-hero-art__spark wb-hero-art__spark--one" aria-hidden="true">✦</span>
          <span className="wb-hero-art__spark wb-hero-art__spark--two" aria-hidden="true">✳</span>
          <div className="wb-market-card wb-market-card--top">
            <span aria-hidden="true">🥑</span>
            <span>Fresh finds<br /><strong>from around the corner</strong></span>
          </div>
          <div className="wb-market-basket" aria-hidden="true">
            <span className="wb-market-basket__item wb-market-basket__item--one">🥬</span>
            <span className="wb-market-basket__item wb-market-basket__item--two">🍊</span>
            <span className="wb-market-basket__item wb-market-basket__item--three">🥖</span>
            <span className="wb-market-basket__body" />
          </div>
          <div className="wb-market-card wb-market-card--bottom">
            <span className="wb-market-card__badge" aria-hidden="true">✳</span>
            <span>Small shops.<br /><strong>Big neighbourhood energy.</strong></span>
          </div>
          <span className="wb-hero-art__caption">A little more local, every day.</span>
        </div>
      </section>

      <section className="wb-discovery" id="shop" aria-labelledby="shop-title">
        <div className="wb-section-heading">
          <div>
            <p className="wb-kicker">A FIRST LOOK</p>
            <h2 id="shop-title">What are you looking for?</h2>
            <p>Start with a category. The best local finds are still ahead.</p>
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
            }}
          />
        </label>

        {visibleCategories.length > 0 ? (
          <div className="wb-category-grid">
            {visibleCategories.map((category) => (
              <button
                className={`wb-category-card wb-category-card--${category.tone}`}
                type="button"
                key={category.name}
                aria-pressed={selectedCategory === category.name}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="wb-category-card__icon" aria-hidden="true">{category.icon}</span>
                <span className="wb-category-card__name">{category.name}</span>
                <span className="wb-category-card__detail">{category.detail}</span>
                <span className="wb-category-card__arrow" aria-hidden="true">↗</span>
              </button>
            ))}
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
      </section>

      <section className="wb-catalogue-preview" id="catalogue" aria-labelledby="catalogue-title">
        <div className="wb-section-heading">
          <div>
            <p className="wb-kicker">CONCEPT CATALOGUE · NOT FOR SALE</p>
            <h2 id="catalogue-title">A first look at what could be here.</h2>
            <p>Example listings make the proposed shopping experience easier to review.</p>
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
            <div className="wb-product-preview-grid">
              {visibleCatalogue.map((card) => (
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
    </main>
  );
}
