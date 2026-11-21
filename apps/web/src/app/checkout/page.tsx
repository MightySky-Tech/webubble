'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  product_id: number;
  product_name: string;
  seller_name: string;
  price_minor: number;
  quantity: number;
  variant_label: string;
}

interface ShippingAddress {
  full_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CheckoutState {
  cart_items: CartItem[];
  cart_total: number;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_provider: string;
  order_id?: string;
  loading: boolean;
  error: string;
  success: boolean;
}

const initialShippingAddress: ShippingAddress = {
  full_name: '',
  phone_number: '',
  street_address: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Nigeria',
};

export default function CheckoutPage() {
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({
    cart_items: [],
    cart_total: 0,
    shipping_address: initialShippingAddress,
    payment_method: 'card',
    payment_provider: 'paystack',
    loading: false,
    error: '',
    success: false,
  });

  const [step, setStep] = useState<'shipping' | 'payment' | 'review' | 'confirmation'>('shipping');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCartFromStorage();
  }, []);

  const loadCartFromStorage = () => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('webubble_cart');
    if (!stored) {
      router.push('/cart');
      return;
    }

    try {
      const items = JSON.parse(stored) as CartItem[];
      if (items.length === 0) {
        router.push('/cart');
        return;
      }

      const cart_total = items.reduce((sum, item) => sum + (item.price_minor * item.quantity), 0);
      setState(prev => ({ ...prev, cart_items: items, cart_total }));
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to load cart' }));
    }
  };

  const validateShippingForm = (): boolean => {
    const errors: Record<string, string> = {};
    const { shipping_address: addr } = state;

    if (!addr.full_name.trim()) errors.full_name = 'Full name is required';
    if (!addr.phone_number.trim()) errors.phone_number = 'Phone number is required';
    if (!addr.street_address.trim()) errors.street_address = 'Street address is required';
    if (!addr.city.trim()) errors.city = 'City is required';
    if (!addr.state.trim()) errors.state = 'State is required';
    if (!addr.postal_code.trim()) errors.postal_code = 'Postal code is required';

    // Validate phone number format (Nigerian format)
    if (addr.phone_number && !/^[\d+\-\s()]{10,}$/.test(addr.phone_number)) {
      errors.phone_number = 'Please enter a valid phone number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateShippingForm()) {
      return;
    }

    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('review');
  };

  const handlePlaceOrder = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: state.cart_items,
          shipping_address: state.shipping_address,
          payment_method: state.payment_method,
          payment_provider: state.payment_provider,
          total_amount_minor: state.cart_total,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
      }

      const { order } = await response.json();
      setState(prev => ({ ...prev, order_id: order.id, success: true }));
      
      // Clear cart
      localStorage.removeItem('webubble_cart');
      setStep('confirmation');
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to place order',
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const formatPrice = (priceMi: number): string => {
    return (priceMi / 100).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
    });
  };

  if (state.success && step === 'confirmation') {
    return (
      <div className="wb-checkout-page">
        <div className="wb-checkout-confirmation">
          <div className="confirmation-icon">✅</div>
          <h1>Order Confirmed!</h1>
          <p className="confirmation-text">
            Thank you for your purchase. Your order #{state.order_id} has been placed successfully.
          </p>
          
          <div className="confirmation-details">
            <div className="detail-row">
              <span>Order ID:</span>
              <span className="font-mono">{state.order_id}</span>
            </div>
            <div className="detail-row">
              <span>Total Amount:</span>
              <span>{formatPrice(state.cart_total)}</span>
            </div>
            <div className="detail-row">
              <span>Delivery Address:</span>
              <span>
                {state.shipping_address.street_address}<br />
                {state.shipping_address.city}, {state.shipping_address.state}
              </span>
            </div>
          </div>

          <div className="confirmation-actions">
            <Link href="/orders" className="wb-btn-primary">
              Track Order
            </Link>
            <Link href="/" className="wb-btn-secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-checkout-page">
      <div className="checkout-header">
        <h1>Checkout</h1>
        <div className="checkout-steps">
          <div className={`step ${step === 'shipping' ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Shipping</span>
          </div>
          <div className={`step ${step === 'payment' ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Payment</span>
          </div>
          <div className={`step ${step === 'review' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>
      </div>

      {state.error && (
        <div className="wb-alert wb-alert-danger">
          {state.error}
        </div>
      )}

      <div className="checkout-container">
        <div className="checkout-form">
          {step === 'shipping' && (
            <form onSubmit={handleShippingSubmit}>
              <h2>Shipping Address</h2>

              <div className="form-group">
                <label htmlFor="full_name">Full Name *</label>
                <input
                  type="text"
                  id="full_name"
                  value={state.shipping_address.full_name}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shipping_address: { ...prev.shipping_address, full_name: e.target.value }
                  }))}
                  className={formErrors.full_name ? 'error' : ''}
                />
                {formErrors.full_name && <span className="error-msg">{formErrors.full_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number *</label>
                <input
                  type="tel"
                  id="phone_number"
                  value={state.shipping_address.phone_number}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shipping_address: { ...prev.shipping_address, phone_number: e.target.value }
                  }))}
                  className={formErrors.phone_number ? 'error' : ''}
                  placeholder="+234 701 234 5678"
                />
                {formErrors.phone_number && <span className="error-msg">{formErrors.phone_number}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="street_address">Street Address *</label>
                <input
                  type="text"
                  id="street_address"
                  value={state.shipping_address.street_address}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shipping_address: { ...prev.shipping_address, street_address: e.target.value }
                  }))}
                  className={formErrors.street_address ? 'error' : ''}
                  placeholder="123 Main Street"
                />
                {formErrors.street_address && <span className="error-msg">{formErrors.street_address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    value={state.shipping_address.city}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      shipping_address: { ...prev.shipping_address, city: e.target.value }
                    }))}
                    className={formErrors.city ? 'error' : ''}
                  />
                  {formErrors.city && <span className="error-msg">{formErrors.city}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <input
                    type="text"
                    id="state"
                    value={state.shipping_address.state}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      shipping_address: { ...prev.shipping_address, state: e.target.value }
                    }))}
                    className={formErrors.state ? 'error' : ''}
                  />
                  {formErrors.state && <span className="error-msg">{formErrors.state}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="postal_code">Postal Code *</label>
                <input
                  type="text"
                  id="postal_code"
                  value={state.shipping_address.postal_code}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shipping_address: { ...prev.shipping_address, postal_code: e.target.value }
                  }))}
                  className={formErrors.postal_code ? 'error' : ''}
                />
                {formErrors.postal_code && <span className="error-msg">{formErrors.postal_code}</span>}
              </div>

              <button type="submit" className="wb-btn-primary wb-btn-full">
                Continue to Payment
              </button>
            </form>
          )}

          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit}>
              <h2>Payment Method</h2>

              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment_method"
                    value="card"
                    checked={state.payment_method === 'card'}
                    onChange={(e) => setState(prev => ({ ...prev, payment_method: e.target.value }))}
                  />
                  <span className="option-label">💳 Card Payment</span>
                  <span className="option-desc">Visa, Mastercard, Verve</span>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment_method"
                    value="bank_transfer"
                    checked={state.payment_method === 'bank_transfer'}
                    onChange={(e) => setState(prev => ({ ...prev, payment_method: e.target.value }))}
                  />
                  <span className="option-label">🏦 Bank Transfer</span>
                  <span className="option-desc">Direct bank deposit</span>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment_method"
                    value="mobile_money"
                    checked={state.payment_method === 'mobile_money'}
                    onChange={(e) => setState(prev => ({ ...prev, payment_method: e.target.value }))}
                  />
                  <span className="option-label">📱 Mobile Money</span>
                  <span className="option-desc">MTN Mobile Money, Airtel Money</span>
                </label>
              </div>

              <div className="payment-provider-selection">
                <h3>Payment Provider</h3>
                <div className="provider-options">
                  <label className="provider-option">
                    <input
                      type="radio"
                      name="payment_provider"
                      value="paystack"
                      checked={state.payment_provider === 'paystack'}
                      onChange={(e) => setState(prev => ({ ...prev, payment_provider: e.target.value }))}
                    />
                    <span>Paystack</span>
                  </label>
                  <label className="provider-option">
                    <input
                      type="radio"
                      name="payment_provider"
                      value="flutterwave"
                      checked={state.payment_provider === 'flutterwave'}
                      onChange={(e) => setState(prev => ({ ...prev, payment_provider: e.target.value }))}
                    />
                    <span>Flutterwave</span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="wb-btn-secondary"
                  onClick={() => setStep('shipping')}
                >
                  ← Back
                </button>
                <button type="submit" className="wb-btn-primary">
                  Review Order →
                </button>
              </div>
            </form>
          )}

          {step === 'review' && (
            <div className="review-section">
              <h2>Review Your Order</h2>

              <div className="review-section-block">
                <h3>Shipping Address</h3>
                <p>{state.shipping_address.full_name}</p>
                <p>{state.shipping_address.street_address}</p>
                <p>{state.shipping_address.city}, {state.shipping_address.state} {state.shipping_address.postal_code}</p>
                <p>{state.shipping_address.phone_number}</p>
                <button
                  type="button"
                  className="wb-link"
                  onClick={() => setStep('shipping')}
                >
                  Edit
                </button>
              </div>

              <div className="review-section-block">
                <h3>Payment Method</h3>
                <p>{state.payment_method.replace('_', ' ').toUpperCase()}</p>
                <p className="text-sm text-gray-600">via {state.payment_provider}</p>
                <button
                  type="button"
                  className="wb-link"
                  onClick={() => setStep('payment')}
                >
                  Edit
                </button>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="wb-btn-secondary"
                  onClick={() => setStep('payment')}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="wb-btn-primary"
                  onClick={handlePlaceOrder}
                  disabled={state.loading}
                >
                  {state.loading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="checkout-sidebar">
          <div className="order-summary">
            <h3>Order Summary</h3>
            
            <div className="summary-items">
              {state.cart_items.map((item) => (
                <div key={item.id} className="summary-item">
                  <div className="item-info">
                    <p className="item-name">{item.product_name}</p>
                    <p className="item-qty">×{item.quantity}</p>
                  </div>
                  <p className="item-price">{formatPrice(item.price_minor * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(state.cart_total)}</span>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              ✓ Secure encrypted payment
              <br />
              ✓ 30-day return policy
              <br />
              ✓ Fast delivery to your location
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
