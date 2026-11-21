'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  product_id: number;
  variant_id: number;
  variant_label: string;
  product_name: string;
  seller_name: string;
  price_minor: number;
  quantity: number;
  image_url?: string;
  stock_available: number;
}

interface Cart {
  items: CartItem[];
  total_minor: number;
  item_count: number;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({ items: [], total_minor: 0, item_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const items = getCartFromStorage();
      
      if (items.length === 0) {
        setCart({ items: [], total_minor: 0, item_count: 0 });
        return;
      }

      // Fetch current product info to verify prices and stock
      const response = await fetch('/api/catalogue/cart-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: items.map(i => i.product_id) })
      });

      if (response.ok) {
        const { data } = await response.json();
        const enrichedItems = items.map((item: CartItem) => {
          const product = data.find((p: { id: number }) => p.id === item.product_id);
          return product ? { ...item, ...product } : item;
        });
        recalculateCart(enrichedItems);
      } else {
        recalculateCart(items);
      }
    } catch (err) {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const getCartFromStorage = (): CartItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('webubble_cart');
    return stored ? JSON.parse(stored) : [];
  };

  const saveCartToStorage = (items: CartItem[]) => {
    localStorage.setItem('webubble_cart', JSON.stringify(items));
  };

  const recalculateCart = (items: CartItem[]) => {
    const total_minor = items.reduce((sum, item) => sum + (item.price_minor * item.quantity), 0);
    const item_count = items.reduce((sum, item) => sum + item.quantity, 0);
    setCart({ items, total_minor, item_count });
    saveCartToStorage(items);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    try {
      setUpdating(true);
      const updatedItems = cart.items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      recalculateCart(updatedItems);
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setUpdating(true);
      const updatedItems = cart.items.filter(item => item.id !== itemId);
      recalculateCart(updatedItems);
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (priceMi: number): string => {
    return (priceMi / 100).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
    });
  };

  const proceedToCheckout = () => {
    if (cart.items.length === 0) {
      setError('Cart is empty');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="wb-cart-page">
        <div className="loading">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="wb-cart-page">
      <div className="wb-cart-header">
        <h1>Shopping Cart</h1>
        {cart.item_count > 0 && (
          <p className="item-count">{cart.item_count} item{cart.item_count !== 1 ? 's' : ''}</p>
        )}
      </div>

      {error && (
        <div className="wb-alert wb-alert-danger">
          {error}
        </div>
      )}

      {cart.items.length === 0 ? (
        <div className="wb-empty-state">
          <div className="empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Start shopping by browsing products or searching for items you want to buy.</p>
          <Link href="/" className="wb-btn-primary">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="wb-cart-container">
          <div className="wb-cart-items">
            {cart.items.map((item) => (
              <div key={item.id} className="wb-cart-item">
                {item.image_url && (
                  <div className="item-image">
                    <img src={item.image_url} alt={item.product_name} />
                  </div>
                )}
                <div className="item-details">
                  <Link href={`/products/${item.product_id}`} className="item-name">
                    {item.product_name}
                  </Link>
                  <p className="item-seller">by {item.seller_name}</p>
                  <p className="item-variant">{item.variant_label}</p>
                  <p className="item-price">{formatPrice(item.price_minor)}</p>
                </div>

                <div className="item-quantity">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={updating || item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.stock_available}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    disabled={updating}
                    className="qty-input"
                  />
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={updating || item.quantity >= item.stock_available}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <div className="item-subtotal">
                  <p>{formatPrice(item.price_minor * item.quantity)}</p>
                  {item.quantity > 1 && (
                    <p className="text-sm text-gray-500">×{item.quantity}</p>
                  )}
                </div>

                <button
                  className="item-remove wb-link-danger"
                  onClick={() => removeItem(item.id)}
                  disabled={updating}
                  aria-label="Remove from cart"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="wb-cart-summary">
            <div className="summary-section">
              <h3>Order Summary</h3>

              <div className="summary-row">
                <span>Subtotal ({cart.item_count} item{cart.item_count !== 1 ? 's' : ''})</span>
                <span>{formatPrice(cart.total_minor)}</span>
              </div>

              <div className="summary-row">
                <span>Shipping</span>
                <span className="text-primary">Calculated at checkout</span>
              </div>

              <div className="summary-row">
                <span>Tax</span>
                <span className="text-primary">Calculated at checkout</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">
                <span>Estimated Total</span>
                <span>{formatPrice(cart.total_minor)}</span>
              </div>

              <button
                className="wb-btn-primary wb-btn-full"
                onClick={proceedToCheckout}
                disabled={updating || cart.items.length === 0}
              >
                Proceed to Checkout
              </button>

              <Link href="/" className="wb-btn-secondary wb-btn-full">
                Continue Shopping
              </Link>
            </div>

            <div className="summary-section">
              <h4>Secure checkout</h4>
              <p className="text-sm">
                All transactions are secure and encrypted. We accept all major payment methods.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
