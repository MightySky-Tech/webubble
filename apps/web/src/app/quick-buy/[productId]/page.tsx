"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  formatProductPrice,
  isDemoProductListing,
  isProductListing,
  isRecord,
  ProductListing,
  productError,
} from "@webubble/api-client/products";
import GlobalProductSearch from "../../GlobalProductSearch";

interface ShippingData {
  full_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
}

type CheckoutStep = "product" | "shipping" | "payment" | "confirming" | "success";

export default function QuickBuyPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductListing | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<CheckoutStep>("product");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [shipping, setShipping] = useState<ShippingData>({
    full_name: "",
    phone_number: "",
    street_address: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const [payment, setPayment] = useState({
    email: "",
    paymentProvider: "paystack",
  });

  // Load product
  useEffect(() => {
    let active = true;
    if (!/^\d+$/.test(productId)) {
      setError("Product not found.");
      setLoading(false);
      return;
    }

    fetch(`/api/catalogue/products/${productId}`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load product."));
        if (!isRecord(payload) || !isRecord(payload.data) || !isProductListing(payload.data.product)) {
          throw new Error("Invalid product data.");
        }
        if (active) {
          const item = payload.data.product;
          setProduct(item);
          setSelectedVariantId(
            item.variants.find((variant) => variant.is_available)?.id ?? item.variants[0]?.id ?? null,
          );
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load product.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId);
  const isOutOfStock = !selectedVariant?.is_available;
  const totalPrice = product ? (product.price_minor * quantity) / 100 : 0;

  const handleProceedToShipping = () => {
    if (!selectedVariant || isOutOfStock) {
      setCheckoutError("Please select an available variant.");
      return;
    }
    setCheckoutError("");
    setStep("shipping");
  };

  const validateShipping = (): boolean => {
    if (!shipping.full_name.trim()) {
      setCheckoutError("Full name is required");
      return false;
    }
    if (!shipping.phone_number.trim()) {
      setCheckoutError("Phone number is required");
      return false;
    }
    if (!shipping.street_address.trim()) {
      setCheckoutError("Street address is required");
      return false;
    }
    if (!shipping.city.trim()) {
      setCheckoutError("City is required");
      return false;
    }
    if (!shipping.state.trim()) {
      setCheckoutError("State is required");
      return false;
    }
    if (!shipping.postal_code.trim()) {
      setCheckoutError("Postal code is required");
      return false;
    }
    return true;
  };

  const handleProceedToPayment = () => {
    setCheckoutError("");
    if (!validateShipping()) return;
    setStep("payment");
  };

  const validatePayment = (): boolean => {
    if (!payment.email.trim() || !payment.email.includes("@")) {
      setCheckoutError("Valid email is required");
      return false;
    }
    return true;
  };

  const handleCompleteOrder = async () => {
    setCheckoutError("");
    if (!validatePayment() || !product || !selectedVariant) return;

    try {
      setCheckoutLoading(true);
      setStep("confirming");

      // Prepare order data
      const orderData = {
        items: [
          {
            product_id: product.id,
            variant_id: selectedVariant.id,
            quantity,
          },
        ],
        shipping_address: shipping,
        buyer_email: payment.email,
        payment_provider: payment.paymentProvider,
      };

      // Create order
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create order");
      }

      const orderResult = await response.json();
      setStep("success");

      // Clear cart
      if (typeof window !== "undefined") {
        localStorage.removeItem("webubble_cart");
      }

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/order/${orderResult.order_id}`);
      }, 3000);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to complete order");
      setStep("payment");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="wb-quick-buy">
        <div className="wb-quick-buy__loading">Loading product...</div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="wb-quick-buy">
        <div className="wb-quick-buy__error">
          <p>{error || "Product not found"}</p>
          <Link href="/" className="wb-button">Back to Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wb-quick-buy">
      <div className="wb-quick-buy__header">
        <Link href="/" className="wb-quick-buy__logo">
          webubble
        </Link>
      </div>

      <div className="wb-quick-buy__container">
        {/* LEFT: Product Summary (Always Visible) */}
        <aside className="wb-quick-buy__summary">
          <div className="wb-quick-buy__product-card">
            <div className="wb-quick-buy__product-image">
              {product.media[0] ? (
                <Image
                  src={`/api/catalogue/products/${product.id}/media/${product.media[0].id}`}
                  alt={product.name}
                  width={300}
                  height={300}
                  unoptimized
                />
              ) : (
                <div className="wb-quick-buy__product-placeholder">🛍️</div>
              )}
            </div>

            <h3 className="wb-quick-buy__product-name">{product.name}</h3>
            <p className="wb-quick-buy__product-seller">by {product.seller_name}</p>

            <div className="wb-quick-buy__product-price">
              <span className="wb-quick-buy__price-label">Price</span>
              <span className="wb-quick-buy__price-value">{formatProductPrice(product.price_minor)}</span>
            </div>

            {/* Quantity Selector */}
            <div className="wb-quick-buy__quantity">
              <label>Qty:</label>
              <div className="wb-quantity-controls">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="wb-quantity-btn"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isOutOfStock}
                  className="wb-quantity-input"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock}
                  className="wb-quantity-btn"
                >
                  +
                </button>
              </div>
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="wb-quick-buy__variants">
                <label>Option:</label>
                <select
                  value={selectedVariantId || ""}
                  onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                  disabled={isOutOfStock}
                  className="wb-variant-select"
                >
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id} disabled={!variant.is_available}>
                      {variant.label} {!variant.is_available ? "(Out of Stock)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Total */}
            <div className="wb-quick-buy__total">
              <span className="wb-quick-buy__total-label">Total</span>
              <span className="wb-quick-buy__total-value">₦{(totalPrice).toLocaleString()}</span>
            </div>
          </div>
        </aside>

        {/* RIGHT: Checkout Form */}
        <section className="wb-quick-buy__checkout">
          {/* STEP 1: Confirm Product */}
          {step === "product" && (
            <div className="wb-quick-buy__step">
              <h2 className="wb-quick-buy__step-title">Review Order</h2>
              <p className="wb-quick-buy__step-description">
                You&apos;re about to order {quantity}x {product.name}
              </p>
              {isOutOfStock && (
                <div className="wb-quick-buy__warning">Out of stock. Please select another option.</div>
              )}
              <button
                onClick={handleProceedToShipping}
                disabled={isOutOfStock}
                className="wb-button wb-button--primary wb-button--large"
              >
                Continue to Shipping
              </button>
              <Link href={`/products/${product.id}`} className="wb-button wb-button--secondary">
                View Full Details
              </Link>
            </div>
          )}

          {/* STEP 2: Shipping Address */}
          {step === "shipping" && (
            <div className="wb-quick-buy__step">
              <h2 className="wb-quick-buy__step-title">Delivery Address</h2>
              {checkoutError && <div className="wb-quick-buy__error-message">{checkoutError}</div>}

              <form className="wb-quick-buy__form" onSubmit={(e) => { e.preventDefault(); handleProceedToPayment(); }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={shipping.full_name}
                  onChange={(e) => setShipping({ ...shipping, full_name: e.target.value })}
                  className="wb-form-input"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={shipping.phone_number}
                  onChange={(e) => setShipping({ ...shipping, phone_number: e.target.value })}
                  className="wb-form-input"
                  required
                />
                <input
                  type="text"
                  placeholder="Street Address"
                  value={shipping.street_address}
                  onChange={(e) => setShipping({ ...shipping, street_address: e.target.value })}
                  className="wb-form-input"
                  required
                />
                <input
                  type="text"
                  placeholder="City"
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  className="wb-form-input"
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={shipping.state}
                  onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                  className="wb-form-input"
                  required
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={shipping.postal_code}
                  onChange={(e) => setShipping({ ...shipping, postal_code: e.target.value })}
                  className="wb-form-input"
                  required
                />

                <button
                  type="submit"
                  className="wb-button wb-button--primary wb-button--large"
                >
                  Continue to Payment
                </button>
              </form>

              <button
                onClick={() => setStep("product")}
                className="wb-button wb-button--secondary"
              >
                ← Back
              </button>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === "payment" && (
            <div className="wb-quick-buy__step">
              <h2 className="wb-quick-buy__step-title">Payment</h2>
              {checkoutError && <div className="wb-quick-buy__error-message">{checkoutError}</div>}

              <form className="wb-quick-buy__form" onSubmit={(e) => { e.preventDefault(); handleCompleteOrder(); }}>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={payment.email}
                  onChange={(e) => setPayment({ ...payment, email: e.target.value })}
                  className="wb-form-input"
                  required
                />

                <div className="wb-payment-providers">
                  <label className="wb-payment-option">
                    <input
                      type="radio"
                      name="provider"
                      value="paystack"
                      checked={payment.paymentProvider === "paystack"}
                      onChange={(e) => setPayment({ ...payment, paymentProvider: e.target.value })}
                    />
                    <span>Paystack (Card, Bank Transfer, Mobile Money)</span>
                  </label>
                  <label className="wb-payment-option">
                    <input
                      type="radio"
                      name="provider"
                      value="flutterwave"
                      checked={payment.paymentProvider === "flutterwave"}
                      onChange={(e) => setPayment({ ...payment, paymentProvider: e.target.value })}
                    />
                    <span>Flutterwave (Card, Bank, Mobile)</span>
                  </label>
                </div>

                <div className="wb-quick-buy__review">
                  <div className="wb-quick-buy__review-item">
                    <span>Subtotal</span>
                    <span>₦{(totalPrice).toLocaleString()}</span>
                  </div>
                  <div className="wb-quick-buy__review-item">
                    <span>Delivery</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="wb-quick-buy__review-total">
                    <span>Total (approx)</span>
                    <span>₦{(totalPrice).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="wb-button wb-button--primary wb-button--large"
                >
                  {checkoutLoading ? "Processing..." : "Complete Purchase"}
                </button>
              </form>

              <button
                onClick={() => setStep("shipping")}
                disabled={checkoutLoading}
                className="wb-button wb-button--secondary"
              >
                ← Back
              </button>
            </div>
          )}

          {/* STEP 4: Processing */}
          {step === "confirming" && (
            <div className="wb-quick-buy__step wb-quick-buy__step--center">
              <div className="wb-quick-buy__spinner"></div>
              <h2>Processing your order...</h2>
              <p>Please do not close this page.</p>
            </div>
          )}

          {/* STEP 5: Success */}
          {step === "success" && (
            <div className="wb-quick-buy__step wb-quick-buy__step--center">
              <div className="wb-quick-buy__success-icon">✓</div>
              <h2>Order Confirmed!</h2>
              <p>Redirecting to your order details...</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
