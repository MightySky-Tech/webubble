"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { formatProductPrice, isProductListing, type ProductListing } from "@webubble/api-client/products";

interface QuickPayState {
  product: ProductListing | null;
  quantity: number;
  step: "review" | "shipping" | "payment" | "success";
  email: string;
  phone: string;
  address: string;
  city: string;
}

interface FilterState {
  category: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  inStockOnly: boolean;
}

export default function ShoppingMinimalPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    minPrice: 0,
    maxPrice: 1000000,
    minRating: 0,
    inStockOnly: false,
  });
  
  // Quick Pay Modal
  const [quickPay, setQuickPay] = useState<QuickPayState>({
    product: null,
    quantity: 1,
    step: "review",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load cart count on mount
  useEffect(() => {
    updateCartCount();
    loadWishlist();
  }, []);

  const loadWishlist = () => {
    try {
      const stored = localStorage.getItem("webubble_wishlist_data") || "[]";
      const items = JSON.parse(stored);
      const ids = new Set(items.map((item: ProductListing) => item.id));
      setWishlistIds(ids);
    } catch (err) {
      console.error("Failed to load wishlist", err);
    }
  };

  const updateCartCount = () => {
    const stored = localStorage.getItem("webubble_cart");
    if (stored) {
      try {
        const items = JSON.parse(stored);
        setCartCount(items.length);
      } catch (err) {
        console.error("Failed to load cart", err);
      }
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("webubble_filters");
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load filters", err);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    localStorage.setItem("webubble_filters", JSON.stringify(updated));
  };

  // Apply filters to products
  const applyFilters = (productsToFilter: ProductListing[]): ProductListing[] => {
    return productsToFilter.filter((product) => {
      // Category filter
      if (filters.category && product.category?.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      // Price filter
      const price = product.price || 0;
      if (price < filters.minPrice || price > filters.maxPrice) {
        return false;
      }

      // Rating filter
      const rating = product.rating || 0;
      if (rating < filters.minRating) {
        return false;
      }

      // Stock filter
      if (filters.inStockOnly && product.stock === 0) {
        return false;
      }

      return true;
    });
  };

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      showToast("Please enter at least 2 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=20`);
      if (!response.ok) throw new Error("Search failed");
      
      const data = await response.json();
      const validProducts = Array.isArray(data) ? data : data.results || [];
      const filtered = applyFilters(validProducts.filter(isProductListing));
      setProducts(filtered);
      
      if (filtered.length === 0) {
        showToast("No products match your filters", "error");
      }
    } catch (err) {
      console.error("Search error:", err);
      showToast("Search failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openQuickPay = (product: ProductListing) => {
    setQuickPay({
      product,
      quantity: 1,
      step: "review",
      email: "",
      phone: "",
      address: "",
      city: "",
    });
    setQuickPayOpen(true);
  };

  const handleQuickPayNext = () => {
    if (quickPay.step === "review") {
      setQuickPay({ ...quickPay, step: "shipping" });
    } else if (quickPay.step === "shipping") {
      if (!quickPay.email || !quickPay.phone || !quickPay.address || !quickPay.city) {
        showToast("Please fill all fields", "error");
        return;
      }
      setQuickPay({ ...quickPay, step: "payment" });
    } else if (quickPay.step === "payment") {
      submitQuickPayOrder();
    }
  };

  const submitQuickPayOrder = async () => {
    if (!quickPay.product) return;
    
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: quickPay.email,
          customer_phone: quickPay.phone,
          shipping_address: quickPay.address,
          shipping_city: quickPay.city,
          payment_method: "paystack",
          items: [
            {
              product_id: quickPay.product.id,
              quantity: quickPay.quantity,
              price: quickPay.product.price,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuickPay({ ...quickPay, step: "success" });
        showToast("Order placed successfully!", "success");
        setTimeout(() => {
          setQuickPayOpen(false);
          setQuickPay({
            product: null,
            quantity: 1,
            step: "review",
            email: "",
            phone: "",
            address: "",
            city: "",
          });
        }, 2000);
      } else {
        showToast("Order failed. Try again.", "error");
      }
    } catch (err) {
      console.error("Order error:", err);
      showToast("Error placing order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = (product: ProductListing) => {
    try {
      const stored = localStorage.getItem("webubble_cart") || "[]";
      const items = JSON.parse(stored);
      
      const existingItem = items.find((item: any) => item.id === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
        });
      }
      
      localStorage.setItem("webubble_cart", JSON.stringify(items));
      updateCartCount();
      showToast(`Added "${product.name}" to cart`, "success");
    } catch (err) {
      console.error("Cart error:", err);
      showToast("Failed to add to cart", "error");
    }
  };

  const toggleWishlist = (product: ProductListing) => {
    try {
      const stored = localStorage.getItem("webubble_wishlist_data") || "[]";
      let items = JSON.parse(stored);
      
      const isInWishlist = wishlistIds.has(product.id);
      
      if (isInWishlist) {
        items = items.filter((item: ProductListing) => item.id !== product.id);
        setWishlistIds((prev) => {
          const updated = new Set(prev);
          updated.delete(product.id);
          return updated;
        });
        showToast(`Removed from wishlist`, "success");
      } else {
        items.push(product);
        setWishlistIds((prev) => new Set([...prev, product.id]));
        showToast(`Added to wishlist`, "success");
      }
      
      localStorage.setItem("webubble_wishlist_data", JSON.stringify(items));
    } catch (err) {
      console.error("Wishlist error:", err);
      showToast("Failed to update wishlist", "error");
    }
  };

  return (
    <div className="wb-shopping-minimal">
      {/* Toast Notification */}
      {toast && (
        <div className={`wb-toast wb-toast-${toast.type}`}>
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
          >
            🔽 Filters
          </button>
          <a href="/wishlist" className="wb-wishlist-link" title="View wishlist">
            ❤️ Wishlist
          </a>
          <a href="/shopping" className="wb-cart-link" title="View cart">
            🛒 Cart ({cartCount})
          </a>
        </div>
      </header>

      {/* Filter Panel - Collapsible */}
      {showFilters && (
        <section className="wb-filter-panel">
          <div className="wb-filter-group">
            <label className="wb-filter-label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="wb-filter-select"
            >
              <option value="">All categories</option>
              <option value="electronics">Electronics</option>
              <option value="food">Food & Drinks</option>
              <option value="fashion">Fashion & Clothing</option>
              <option value="home">Home & Garden</option>
              <option value="books">Books & Media</option>
              <option value="health">Health & Beauty</option>
              <option value="sports">Sports & Outdoors</option>
            </select>
          </div>

          <div className="wb-filter-group">
            <label className="wb-filter-label">
              Price: ₦{filters.minPrice.toLocaleString()} - ₦{filters.maxPrice.toLocaleString()}
            </label>
            <input
              type="range"
              min="0"
              max="500000"
              value={filters.minPrice}
              onChange={(e) => updateFilters({ minPrice: parseInt(e.target.value) })}
              className="wb-filter-range"
            />
            <input
              type="range"
              min="0"
              max="500000"
              value={filters.maxPrice}
              onChange={(e) => updateFilters({ maxPrice: parseInt(e.target.value) })}
              className="wb-filter-range"
            />
          </div>

          <div className="wb-filter-group">
            <label className="wb-filter-label">Minimum Rating</label>
            <div className="wb-rating-filter">
              {[0, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => updateFilters({ minRating: rating })}
                  className={`wb-rating-btn ${filters.minRating === rating ? "active" : ""}`}
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

          <button
            onClick={() => {
              setFilters({
                category: "",
                minPrice: 0,
                maxPrice: 500000,
                minRating: 0,
                inStockOnly: false,
              });
              localStorage.removeItem("webubble_filters");
            }}
            className="wb-filter-reset"
          >
            Reset Filters
          </button>
        </section>
      )}

      {/* Search - Sticky at top */}
      <section className="wb-search-sticky">
        <form onSubmit={handleSearch} className="wb-search-form-inline">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search (tomatoes, fabric...)"
            className="wb-search-input-inline"
            autoFocus
          />
          <button type="submit" disabled={loading} className="wb-search-btn-inline">
            {loading ? "..." : "🔍"}
          </button>
        </form>
      </section>

      {/* Products Grid - Compact Cards */}
      {products.length > 0 && (
        <section className="wb-products-minimal">
          <div className="wb-products-compact-grid">
            {products.map((product) => (
              <div key={product.id} className="wb-product-mini-card">
                {/* Image - Square, optimized */}
                <div className="wb-product-mini-image">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="wb-img-cover"
                    />
                  ) : (
                    <div className="wb-img-placeholder">📦</div>
                  )}
                  
                  {/* Wishlist Heart Button */}
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`wb-wishlist-heart ${wishlistIds.has(product.id) ? "active" : ""}`}
                    title={wishlistIds.has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    {wishlistIds.has(product.id) ? "❤️" : "🤍"}
                  </button>
                </div>

                {/* Info - Minimal text */}
                <div className="wb-product-mini-info">
                  <h3 className="wb-name-mini">{product.name}</h3>
                  
                  {/* Rating */}
                  {product.rating && (
                    <div className="wb-mini-rating">
                      <span className="wb-stars-mini">
                        {"★".repeat(Math.round(product.rating))}
                        {"☆".repeat(5 - Math.round(product.rating))}
                      </span>
                    </div>
                  )}
                  
                  <p className="wb-price-mini">₦{formatProductPrice(product.price)}</p>
                </div>

                {/* Actions - Two buttons, full width */}
                <div className="wb-product-mini-actions">
                  <button
                    onClick={() => openQuickPay(product)}
                    className="wb-btn-mini wb-btn-quick-pay"
                    title="Buy now - no cart needed"
                  >
                    💳 Pay
                  </button>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="wb-btn-mini wb-btn-add-cart"
                    title="Add to cart for later"
                  >
                    🛒 Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && query && (
        <div className="wb-empty-state">
          <p>No products found for "{query}"</p>
          <p className="wb-hint">Try a different search term</p>
        </div>
      )}

      {!loading && products.length === 0 && !query && (
        <div className="wb-empty-state">
          <p>🔍 Search for products to get started</p>
        </div>
      )}

      {/* Quick Pay Modal - Minimal Design */}
      {quickPayOpen && quickPay.product && (
        <div className="wb-modal-backdrop" onClick={() => setQuickPayOpen(false)}>
          <div className="wb-quick-pay-modal-min" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="wb-modal-header-min">
              <h2>Quick Purchase</h2>
              <button
                onClick={() => setQuickPayOpen(false)}
                className="wb-modal-close-min"
              >
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
                    {quickPay.product.image && (
                      <Image
                        src={quickPay.product.image}
                        alt={quickPay.product.name}
                        width={120}
                        height={120}
                      />
                    )}
                  </div>
                  <div className="wb-preview-details">
                    <h3>{quickPay.product.name}</h3>
                    <p className="wb-preview-price">
                      ₦{formatProductPrice(quickPay.product.price)}
                    </p>
                  </div>
                </div>

                <div className="wb-qty-selector-min">
                  <label>Qty:</label>
                  <div className="wb-qty-buttons">
                    <button
                      onClick={() =>
                        setQuickPay({
                          ...quickPay,
                          quantity: Math.max(1, quickPay.quantity - 1),
                        })
                      }
                      className="wb-qty-btn-min"
                    >
                      −
                    </button>
                    <span className="wb-qty-display">{quickPay.quantity}</span>
                    <button
                      onClick={() =>
                        setQuickPay({
                          ...quickPay,
                          quantity: quickPay.quantity + 1,
                        })
                      }
                      className="wb-qty-btn-min"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="wb-total-min">
                  <strong>
                    Total: ₦{formatProductPrice(quickPay.product.price * quickPay.quantity)}
                  </strong>
                </div>
              </div>
            )}

            {/* Step 2: Delivery */}
            {quickPay.step === "shipping" && (
              <div className="wb-modal-content">
                <div className="wb-form-group-min">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={quickPay.email}
                    onChange={(e) => setQuickPay({ ...quickPay, email: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="tel"
                    placeholder="Phone *"
                    value={quickPay.phone}
                    onChange={(e) => setQuickPay({ ...quickPay, phone: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="text"
                    placeholder="Address *"
                    value={quickPay.address}
                    onChange={(e) => setQuickPay({ ...quickPay, address: e.target.value })}
                    className="wb-input-min"
                  />
                </div>
                <div className="wb-form-group-min">
                  <input
                    type="text"
                    placeholder="City/Area *"
                    value={quickPay.city}
                    onChange={(e) => setQuickPay({ ...quickPay, city: e.target.value })}
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
                    <strong>₦{formatProductPrice(quickPay.product.price * quickPay.quantity)}</strong>
                  </div>
                </div>

                <div className="wb-payment-methods-min">
                  <label className="wb-payment-method-min">
                    <input type="radio" name="payment" value="paystack" defaultChecked />
                    <span>💳 Paystack</span>
                  </label>
                  <label className="wb-payment-method-min">
                    <input type="radio" name="payment" value="flutterwave" />
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
                    if (quickPay.step === "shipping")
                      setQuickPay({ ...quickPay, step: "review" });
                    if (quickPay.step === "payment")
                      setQuickPay({ ...quickPay, step: "shipping" });
                  }}
                  className="wb-btn-secondary-min"
                >
                  ← Back
                </button>
              )}
              {quickPay.step !== "success" && (
                <button
                  onClick={handleQuickPayNext}
                  disabled={submitting}
                  className="wb-btn-primary-min"
                >
                  {submitting
                    ? "Processing..."
                    : quickPay.step === "payment"
                    ? "🔒 Pay"
                    : "Next →"}
                </button>
              )}
              {quickPay.step === "success" && (
                <button
                  onClick={() => setQuickPayOpen(false)}
                  className="wb-btn-primary-min"
                >
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
