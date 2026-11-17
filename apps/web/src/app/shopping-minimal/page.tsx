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

export default function ShoppingMinimalPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
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
  }, []);

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
      setProducts(validProducts.filter(isProductListing));
      
      if (validProducts.length === 0) {
        showToast("No products found", "error");
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
          <span className="wb-cart-counter">{cartCount}</span>
        </div>
      </header>

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
                </div>

                {/* Info - Minimal text */}
                <div className="wb-product-mini-info">
                  <h3 className="wb-name-mini">{product.name}</h3>
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
