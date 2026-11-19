"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatProductPrice,
  isProductListing,
  isRecord,
  productError,
  type ProductListing,
} from "@webubble/api-client/products";
import { addToCart, firstAvailableVariant, MAX_LINE_QUANTITY, productImageUrl, readCart } from "@/lib/cart";
import {
  categoryOptions,
  DEFAULT_FILTERS,
  FILTER_PRICE_MAX,
  filterProducts,
  parseFilters,
  type ProductFilters,
} from "@/lib/productFilters";
import { getAverageRating } from "@/lib/reviews";
import { recordSearch } from "@/lib/searchHistory";
import { readWishlist, toggleWishlist } from "@/lib/wishlist";

const FILTERS_STORAGE_KEY = "webubble_filters";
const PHONE_PATTERN = /^[\d+\-\s()]{10,}$/;

interface QuickPayState {
  product: ProductListing | null;
  quantity: number;
  step: "review" | "shipping" | "payment" | "success";
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  provider: "paystack" | "flutterwave";
}

const EMPTY_QUICK_PAY: QuickPayState = {
  product: null,
  quantity: 1,
  step: "review",
  fullName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  provider: "paystack",
};

export default function ShoppingMinimalPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<ProductListing[]>([]);
  const [ratings, setRatings] = useState<Map<number, number | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [quickPay, setQuickPay] = useState<QuickPayState>(EMPTY_QUICK_PAY);
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCartCount(readCart(window.localStorage).length);
    setWishlistIds(new Set(readWishlist(window.localStorage).map((item) => item.id)));
    setFilters(parseFilters(window.localStorage.getItem(FILTERS_STORAGE_KEY)));
  }, []);

  const categories = useMemo(() => categoryOptions(results), [results]);
  const products = useMemo(
    () => filterProducts(results, filters, (productId) => ratings.get(productId) ?? null),
    [results, filters, ratings],
  );

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateFilters = (patch: Partial<ProductFilters>) => {
    const updated = { ...filters, ...patch };
    setFilters(updated);
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    window.localStorage.removeItem(FILTERS_STORAGE_KEY);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      showToast("Please enter at least 2 characters", "error");
      return;
    }

    setLoading(true);
    setSearchError("");
    try {
      recordSearch(term, window.localStorage);
      const params = new URLSearchParams({ q: term });
      const response = await fetch(`/api/catalogue/products?${params.toString()}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Search failed. Try again."));
      if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.products)) {
        throw new Error("Search failed. Try again.");
      }

      const found = payload.data.products.filter(isProductListing);
      setResults(found);
      setRatings(new Map(found.map((product) => [product.id, getAverageRating(window.localStorage, product.id)])));
      setSearchedTerm(term);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Search failed. Try again.";
      setResults([]);
      setSearchedTerm("");
      setSearchError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openQuickPay = (product: ProductListing) => {
    if (!firstAvailableVariant(product)) {
      showToast(`"${product.name}" is out of stock`, "error");
      return;
    }
    setQuickPay({ ...EMPTY_QUICK_PAY, product });
    setQuickPayOpen(true);
  };

  const handleQuickPayNext = () => {
    if (quickPay.step === "review") {
      setQuickPay({ ...quickPay, step: "shipping" });
    } else if (quickPay.step === "shipping") {
      const missing = [quickPay.fullName, quickPay.phone, quickPay.address, quickPay.city, quickPay.state].some(
        (value) => !value.trim(),
      );
      if (missing) {
        showToast("Please fill all fields", "error");
        return;
      }
      if (!PHONE_PATTERN.test(quickPay.phone.trim())) {
        showToast("Please enter a valid phone number", "error");
        return;
      }
      setQuickPay({ ...quickPay, step: "payment" });
    } else if (quickPay.step === "payment") {
      void submitQuickPayOrder();
    }
  };

  const submitQuickPayOrder = async () => {
    const { product, quantity } = quickPay;
    const variant = product ? firstAvailableVariant(product) : undefined;
    if (!product || !variant) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_items: [
            {
              id: `${product.id}-${variant.id}`,
              product_id: product.id,
              variant_id: variant.id,
              variant_label: variant.label,
              product_name: product.name,
              price_minor: product.price_minor,
              quantity,
            },
          ],
          shipping_address: {
            full_name: quickPay.fullName.trim(),
            phone_number: quickPay.phone.trim(),
            street_address: quickPay.address.trim(),
            city: quickPay.city.trim(),
            state: quickPay.state.trim(),
            postal_code: "",
            country: "Nigeria",
          },
          payment_method: "card",
          payment_provider: quickPay.provider,
          total_amount_minor: product.price_minor * quantity,
        }),
      });

      if (response.status === 401) {
        // Orders need an account, so keep the item in the cart for after sign-in.
        setCartCount(addToCart(window.localStorage, product, variant, quantity).length);
        setQuickPayOpen(false);
        showToast("Sign in to finish your order. Your item is saved in your cart.", "error");
        router.push("/sign-in");
        return;
      }
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        throw new Error(productError(payload, "Order failed. Try again."));
      }

      setQuickPay({ ...quickPay, step: "success" });
      showToast("Order placed successfully!", "success");
      setTimeout(() => {
        setQuickPayOpen(false);
        setQuickPay(EMPTY_QUICK_PAY);
      }, 2000);
    } catch (reason: unknown) {
      showToast(reason instanceof Error ? reason.message : "Error placing order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = (product: ProductListing) => {
    const variant = firstAvailableVariant(product);
    if (!variant) {
      showToast(`"${product.name}" is out of stock`, "error");
      return;
    }

    const items = addToCart(window.localStorage, product, variant);
    setCartCount(items.length);
    const label = product.variants.length > 1 ? ` (${variant.label})` : "";
    showToast(`Added "${product.name}"${label} to cart`, "success");
  };

  const handleToggleWishlist = (product: ProductListing) => {
    const { items, added } = toggleWishlist(window.localStorage, product);
    setWishlistIds(new Set(items.map((item) => item.id)));
    showToast(added ? "Added to wishlist" : "Removed from wishlist", "success");
  };

  return (
    <div className="wb-shopping-minimal">
      {/* Toast Notification */}
      {toast && (
        <div className={`wb-toast wb-toast-${toast.type}`} role="status">
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}

      {/* Fixed Header */}
      <header className="wb-shopping-mini-header">
        <h1>🛍️ Shop</h1>
        <div className="wb-header-right">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="wb-filter-toggle"
            title="Toggle filters"
            aria-expanded={showFilters}
          >
            🔽 Filters
          </button>
          <Link href="/wishlist" className="wb-wishlist-link" title="View wishlist">
            ❤️ Wishlist ({wishlistIds.size})
          </Link>
          <Link href="/cart" className="wb-cart-link" title="View cart">
            🛒 Cart ({cartCount})
          </Link>
        </div>
      </header>

      {/* Filter Panel - Collapsible */}
      {showFilters && (
        <section className="wb-filter-panel" aria-label="Product filters">
          <div className="wb-filter-group">
            <label className="wb-filter-label" htmlFor="filter-category">
              Category
            </label>
            <select
              id="filter-category"
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="wb-filter-select"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="wb-filter-group">
            <span className="wb-filter-label">
              Price: ₦{filters.minPrice.toLocaleString("en-NG")} - ₦{filters.maxPrice.toLocaleString("en-NG")}
              {filters.maxPrice >= FILTER_PRICE_MAX ? "+" : ""}
            </span>
            <input
              type="range"
              min="0"
              max={FILTER_PRICE_MAX}
              step="1000"
              value={filters.minPrice}
              aria-label="Minimum price"
              onChange={(e) => updateFilters({ minPrice: Math.min(Number(e.target.value), filters.maxPrice) })}
              className="wb-filter-range"
            />
            <input
              type="range"
              min="0"
              max={FILTER_PRICE_MAX}
              step="1000"
              value={filters.maxPrice}
              aria-label="Maximum price"
              onChange={(e) => updateFilters({ maxPrice: Math.max(Number(e.target.value), filters.minPrice) })}
              className="wb-filter-range"
            />
          </div>

          <div className="wb-filter-group">
            <span className="wb-filter-label">Minimum Rating</span>
            <div className="wb-rating-filter">
              {[0, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => updateFilters({ minRating: rating })}
                  className={`wb-rating-btn ${filters.minRating === rating ? "active" : ""}`}
                  aria-pressed={filters.minRating === rating}
                >
                  {rating === 0 ? "All" : `${rating}★+`}
                </button>
              ))}
            </div>
          </div>

          <div className="wb-filter-group">
            <label className="wb-filter-checkbox">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => updateFilters({ inStockOnly: e.target.checked })}
              />
              In Stock Only
            </label>
          </div>

          <button onClick={resetFilters} className="wb-filter-reset">
            Reset Filters
          </button>
        </section>
      )}

      {/* Search - Sticky at top */}
      <section className="wb-search-sticky">
        <form onSubmit={handleSearch} className="wb-search-form-inline" role="search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search (tomatoes, fabric...)"
            aria-label="Search products"
            className="wb-search-input-inline"
            autoFocus
          />
          <button type="submit" disabled={loading} className="wb-search-btn-inline" aria-label="Search">
            {loading ? "..." : "🔍"}
          </button>
        </form>
      </section>

      {/* Products Grid - Compact Cards */}
      {products.length > 0 && (
        <section className="wb-products-minimal">
          <div className="wb-products-compact-grid">
            {products.map((product) => {
              const imageUrl = productImageUrl(product);
              const rating = ratings.get(product.id) ?? null;
              const wished = wishlistIds.has(product.id);

              return (
                <div key={product.id} className="wb-product-mini-card">
                  {/* Image - Square, optimized */}
                  <div className="wb-product-mini-image">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 600px) 50vw, 220px"
                        className="wb-img-cover"
                      />
                    ) : (
                      <div className="wb-img-placeholder">📦</div>
                    )}

                    {/* Wishlist Heart Button */}
                    <button
                      onClick={() => handleToggleWishlist(product)}
                      className={`wb-wishlist-heart ${wished ? "active" : ""}`}
                      title={wished ? "Remove from wishlist" : "Add to wishlist"}
                      aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                      aria-pressed={wished}
                    >
                      {wished ? "❤️" : "🤍"}
                    </button>
                  </div>

                  {/* Info - Minimal text */}
                  <div className="wb-product-mini-info">
                    <h3 className="wb-name-mini">{product.name}</h3>

                    {/* Rating */}
                    {rating !== null && (
                      <div className="wb-mini-rating" aria-label={`Rated ${rating} out of 5`}>
                        <span className="wb-stars-mini">
                          {"★".repeat(Math.round(rating))}
                          {"☆".repeat(5 - Math.round(rating))}
                        </span>
                      </div>
                    )}

                    <p className="wb-price-mini">{formatProductPrice(product.price_minor)}</p>
                  </div>

                  {/* Actions - Two buttons, full width */}
                  <div className="wb-product-mini-actions">
                    <button
                      onClick={() => openQuickPay(product)}
                      className="wb-btn-mini wb-btn-quick-pay"
                      title="Buy now - no cart needed"
                      aria-label={`Pay for ${product.name}`}
                    >
                      💳 Pay
                    </button>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="wb-btn-mini wb-btn-add-cart"
                      title="Add to cart for later"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      🛒 Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty States */}
      {!loading && searchError && (
        <div className="wb-empty-state">
          <p>{searchError}</p>
          <p className="wb-hint">Check your connection and search again</p>
        </div>
      )}

      {!loading && !searchError && searchedTerm && results.length === 0 && (
        <div className="wb-empty-state">
          <p>No products found for &quot;{searchedTerm}&quot;</p>
          <p className="wb-hint">Try a different search term</p>
        </div>
      )}

      {!loading && results.length > 0 && products.length === 0 && (
        <div className="wb-empty-state">
          <p>No products match your filters</p>
          <button onClick={resetFilters} className="wb-filter-reset">
            Reset Filters
          </button>
        </div>
      )}

      {!loading && !searchError && !searchedTerm && (
        <div className="wb-empty-state">
          <p>🔍 Search for products to get started</p>
        </div>
      )}

      {/* Quick Pay Modal - Minimal Design */}
      {quickPayOpen && quickPay.product && (
        <div className="wb-modal-backdrop" onClick={() => setQuickPayOpen(false)}>
          <div
            className="wb-quick-pay-modal-min"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-pay-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="wb-modal-header-min">
              <h2 id="quick-pay-title">Quick Purchase</h2>
              <button onClick={() => setQuickPayOpen(false)} className="wb-modal-close-min" aria-label="Close">
                ✕
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="wb-progress-steps-min">
              <span className={quickPay.step === "review" ? "active" : "done"}>1</span>
              <span className={quickPay.step === "shipping" ? "active" : quickPay.step !== "review" ? "done" : ""}>2</span>
              <span className={quickPay.step === "payment" ? "active" : quickPay.step === "success" ? "done" : ""}>3</span>
            </div>

            {/* Step 1: Review */}
            {quickPay.step === "review" && (
              <div className="wb-modal-content">
                <div className="wb-product-preview-min">
                  <div className="wb-preview-image">
                    {productImageUrl(quickPay.product) && (
                      <Image
                        src={productImageUrl(quickPay.product) ?? ""}
                        alt={quickPay.product.name}
                        width={120}
                        height={120}
                      />
                    )}
                  </div>
                  <div className="wb-preview-details">
                    <h3>{quickPay.product.name}</h3>
                    <p className="wb-preview-price">{formatProductPrice(quickPay.product.price_minor)}</p>
                  </div>
                </div>

                <div className="wb-qty-selector-min">
                  <span>Qty:</span>
                  <div className="wb-qty-buttons">
                    <button
                      onClick={() => setQuickPay({ ...quickPay, quantity: Math.max(1, quickPay.quantity - 1) })}
                      className="wb-qty-btn-min"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="wb-qty-display">{quickPay.quantity}</span>
                    <button
                      onClick={() =>
                        setQuickPay({ ...quickPay, quantity: Math.min(MAX_LINE_QUANTITY, quickPay.quantity + 1) })
                      }
                      className="wb-qty-btn-min"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="wb-total-min">
                  <strong>Total: {formatProductPrice(quickPay.product.price_minor * quickPay.quantity)}</strong>
                </div>
              </div>
            )}

            {/* Step 2: Delivery */}
            {quickPay.step === "shipping" && (
              <div className="wb-modal-content">
                <div className="wb-form-group-min">
                  <input
                    type="text"
                    placeholder="Full name *"
                    aria-label="Full name"
                    autoComplete="name"
                    value={quickPay.fullName}
                    onChange={(e) => setQuickPay({ ...quickPay, fullName: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="tel"
                    placeholder="Phone *"
                    aria-label="Phone"
                    autoComplete="tel"
                    value={quickPay.phone}
                    onChange={(e) => setQuickPay({ ...quickPay, phone: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="text"
                    placeholder="Address *"
                    aria-label="Address"
                    autoComplete="street-address"
                    value={quickPay.address}
                    onChange={(e) => setQuickPay({ ...quickPay, address: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="text"
                    placeholder="City/Area *"
                    aria-label="City or area"
                    autoComplete="address-level2"
                    value={quickPay.city}
                    onChange={(e) => setQuickPay({ ...quickPay, city: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="text"
                    placeholder="State *"
                    aria-label="State"
                    autoComplete="address-level1"
                    value={quickPay.state}
                    onChange={(e) => setQuickPay({ ...quickPay, state: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {quickPay.step === "payment" && (
              <div className="wb-modal-content">
                <div className="wb-payment-summary-min">
                  <div className="wb-summary-item">
                    <span>{quickPay.product.name}</span>
                    <span>×{quickPay.quantity}</span>
                  </div>
                  <div className="wb-summary-address">
                    📍 {quickPay.address}, {quickPay.city}
                  </div>
                  <div className="wb-summary-total">
                    <strong>{formatProductPrice(quickPay.product.price_minor * quickPay.quantity)}</strong>
                  </div>
                </div>

                <div className="wb-payment-methods-min">
                  <label className="wb-payment-method-min">
                    <input
                      type="radio"
                      name="payment"
                      value="paystack"
                      checked={quickPay.provider === "paystack"}
                      onChange={() => setQuickPay({ ...quickPay, provider: "paystack" })}
                    />
                    <span>💳 Paystack</span>
                  </label>
                  <label className="wb-payment-method-min">
                    <input
                      type="radio"
                      name="payment"
                      value="flutterwave"
                      checked={quickPay.provider === "flutterwave"}
                      onChange={() => setQuickPay({ ...quickPay, provider: "flutterwave" })}
                    />
                    <span>💳 Flutterwave</span>
                  </label>
                </div>
              </div>
            )}

            {/* Success */}
            {quickPay.step === "success" && (
              <div className="wb-modal-content">
                <div className="wb-success-message">
                  <div className="wb-success-icon">✓</div>
                  <h3>Order Placed!</h3>
                  <p>Your order has been confirmed</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="wb-modal-actions-min">
              {quickPay.step !== "review" && quickPay.step !== "success" && (
                <button
                  onClick={() => {
                    if (quickPay.step === "shipping") setQuickPay({ ...quickPay, step: "review" });
                    if (quickPay.step === "payment") setQuickPay({ ...quickPay, step: "shipping" });
                  }}
                  className="wb-btn-secondary-min"
                >
                  ← Back
                </button>
              )}
              {quickPay.step !== "success" && (
                <button onClick={handleQuickPayNext} disabled={submitting} className="wb-btn-primary-min">
                  {submitting ? "Processing..." : quickPay.step === "payment" ? "🔒 Pay" : "Next →"}
                </button>
              )}
              {quickPay.step === "success" && (
                <button onClick={() => setQuickPayOpen(false)} className="wb-btn-primary-min">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
