"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { formatProductPrice, isProductListing, isRecord, productError, type ProductListing } from "@webubble/api-client/products";
import { recordSearch } from "@/lib/searchHistory";

interface CartNotification {
  productId: number;
  productName: string;
  quantity: number;
  timestamp: number;
}

interface QuickPayProduct extends ProductListing {
  quantity?: number;
}

export default function ShoppingPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cartItems, setCartItems] = useState<Map<string, number>>(new Map());
  const [notification, setNotification] = useState<CartNotification | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [quickPayProduct, setQuickPayProduct] = useState<QuickPayProduct | null>(null);
  const [quickPayQuantity, setQuickPayQuantity] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("webubble_cart");
    if (stored) {
      try {
        const items = JSON.parse(stored);
        const itemMap = new Map<string, number>();
        items.forEach((item: any) => {
          itemMap.set(item.id, item.quantity);
        });
        setCartItems(itemMap);
        setCartCount(items.length);
      } catch (err) {
        console.error("Failed to load cart", err);
      }
    }
  }, []);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setError("Please enter at least 2 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setProducts([]);

      recordSearch(term);

      const params = new URLSearchParams({
        q: term,
        availability: "in_stock",
        sort: "newest",
      });

      const response = await fetch(`/api/catalogue/products?${params.toString()}`, {
        cache: "no-store",
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(productError(payload, "Failed to search products"));
      }

      if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.products)) {
        throw new Error("Invalid response format");
      }

      const validProducts = payload.data.products.filter(isProductListing);
      setProducts(validProducts);

      if (validProducts.length === 0) {
        setError(`No products found for "${term}"`);
      }

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Search failed");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: ProductListing, variant: any, quantity: number = 1) => {
    if (!variant || !variant.is_available) {
      return;
    }

    try {
      const cartItemId = `${product.id}-${variant.id}`;
      const stored = localStorage.getItem("webubble_cart");
      let items = stored ? JSON.parse(stored) : [];

      const existingIndex = items.findIndex((item: any) => item.id === cartItemId);
      if (existingIndex >= 0) {
        items[existingIndex].quantity += quantity;
      } else {
        items.push({
          id: cartItemId,
          product_id: product.id,
          variant_id: variant.id,
          variant_label: variant.label,
          product_name: product.name,
          seller_name: product.seller_name,
          price_minor: product.price_minor,
          quantity,
          stock_available: variant.stock_available || 0,
        });
      }

      localStorage.setItem("webubble_cart", JSON.stringify(items));

      // Update local state
      const newMap = new Map(cartItems);
      newMap.set(cartItemId, (newMap.get(cartItemId) || 0) + quantity);
      setCartItems(newMap);
      setCartCount(items.length);

      // Show notification
      setNotification({
        productId: product.id,
        productName: product.name,
        quantity,
        timestamp: Date.now(),
      });

      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
  };

  const getDefaultVariant = (product: ProductListing) => {
    return product.variants.find((v) => v.is_available) || product.variants[0];
  };

  return (
    <div className="wb-shopping-page">
      {/* Header */}
      <header className="wb-shopping-header">
        <div className="wb-shopping-header__container">
          <Link href="/" className="wb-shopping-logo">
            🛍️ webubble
          </Link>
          <Link href="/cart" className="wb-cart-link">
            🛒 Cart {cartCount > 0 && <span className="wb-cart-badge">{cartCount}</span>}
          </Link>
        </div>
      </header>

      {/* Search Section */}
      <section className="wb-shopping-search-section">
        <div className="wb-shopping-container">
          <h1 className="wb-shopping-title">Find Products</h1>
          <form ref={searchRef} onSubmit={handleSearch} className="wb-shopping-form">
            <input
              type="search"
              placeholder="Search products (e.g., tomatoes, fabric, batteries)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="wb-shopping-input"
              autoFocus
            />
            <button type="submit" disabled={loading} className="wb-shopping-btn">
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
          {error && <p className="wb-shopping-error">{error}</p>}
        </div>
      </section>

      {/* Results Section */}
      <section ref={resultsRef} className="wb-shopping-results">
        <div className="wb-shopping-container">
          {products.length > 0 && (
            <div className="wb-shopping-results-header">
              <h2>Found {products.length} products</h2>
              <p className="wb-shopping-results-hint">Click "Add to Cart" and keep shopping</p>
            </div>
          )}

          {/* Notification Toast */}
          {notification && (
            <div className="wb-notification-toast">
              ✓ Added {notification.quantity}x {notification.productName} to cart
            </div>
          )}

          {/* Product Grid */}
          <div className="wb-products-grid">
            {products.map((product) => {
              const defaultVariant = getDefaultVariant(product);
              const cartItemId = defaultVariant ? `${product.id}-${defaultVariant.id}` : null;
              const cartQuantity = cartItemId ? cartItems.get(cartItemId) || 0 : 0;

              return (
                <div key={product.id} className="wb-product-card">
                  {/* Image */}
                  <div className="wb-product-card__image">
                    {product.media[0] ? (
                      <Image
                        src={`/api/catalogue/products/${product.id}/media/${product.media[0].id}`}
                        alt={product.name}
                        width={300}
                        height={300}
                        unoptimized
                      />
                    ) : (
                      <div className="wb-product-placeholder">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="wb-product-card__info">
                    <h3 className="wb-product-card__name">{product.name}</h3>
                    <p className="wb-product-card__seller">{product.seller_name}</p>
                    {product.seller_cac_verified && (
                      <span className="wb-cac-badge">✓ CAC verified</span>
                    )}

                    <p className="wb-product-card__description">{product.description}</p>

                    {/* Price & Stock */}
                    <div className="wb-product-card__price-row">
                      <span className="wb-product-price">{formatProductPrice(product.price_minor)}</span>
                      {defaultVariant ? (
                        <span className={`wb-product-stock ${defaultVariant.is_available ? "in-stock" : "out-of-stock"}`}>
                          {defaultVariant.is_available ? "In Stock" : "Out of Stock"}
                        </span>
                      ) : null}
                    </div>

                    {/* Cart Status */}
                    {cartQuantity > 0 && (
                      <div className="wb-product-in-cart">
                        {cartQuantity} in cart
                      </div>
                    )}

                    {/* Actions */}
                    <div className="wb-product-card__actions">
                      {defaultVariant && defaultVariant.is_available ? (
                        <>
                          <button
                            onClick={() => handleAddToCart(product, defaultVariant)}
                            className="wb-btn wb-btn--add-to-cart"
                            aria-label={`Add ${product.name} to cart`}
                          >
                            + Add to Cart
                          </button>
                          <Link
                            href={`/quick-buy/${product.id}`}
                            className="wb-btn wb-btn--checkout"
                            aria-label={`Buy ${product.name} now`}
                          >
                            Buy Now
                          </Link>
                        </>
                      ) : (
                        <button disabled className="wb-btn wb-btn--disabled">
                          Out of Stock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {products.length === 0 && !error && !loading && (
            <div className="wb-empty-state">
              <p className="wb-empty-state-icon">🔍</p>
              <p className="wb-empty-state-text">Search for products above to get started</p>
            </div>
          )}
        </div>
      </section>

      {/* Cart Summary Sticky Footer */}
      {cartCount > 0 && (
        <div className="wb-cart-sticky-footer">
          <div className="wb-shopping-container">
            <div className="wb-cart-summary">
              <span className="wb-cart-items">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</span>
              <Link href="/cart" className="wb-btn wb-btn--checkout-primary">
                Review Cart & Checkout →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
