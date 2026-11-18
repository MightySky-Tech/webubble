"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatProductPrice, type ProductListing } from "@webubble/api-client/products";
import Link from "next/link";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = () => {
    try {
      const stored = localStorage.getItem("webubble_wishlist") || "[]";
      const ids = JSON.parse(stored);
      
      // In a real app, fetch product details from API
      // For now, we'll store the full product data with the ID
      const wishlistData = localStorage.getItem("webubble_wishlist_data") || "[]";
      const products = JSON.parse(wishlistData);
      setWishlist(products);
    } catch (err) {
      console.error("Failed to load wishlist", err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = (productId: string) => {
    try {
      const stored = localStorage.getItem("webubble_wishlist_data") || "[]";
      const products = JSON.parse(stored);
      const updated = products.filter((p: ProductListing) => p.id !== productId);
      localStorage.setItem("webubble_wishlist_data", JSON.stringify(updated));
      setWishlist(updated);
      showToast("Removed from wishlist", "success");
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
      showToast("Failed to remove item", "error");
    }
  };

  const addToCart = (product: ProductListing) => {
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
      showToast(`"${product.name}" added to cart`, "success");
    } catch (err) {
      console.error("Cart error:", err);
      showToast("Failed to add to cart", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="wb-wishlist-loading">
        <p>Loading wishlist...</p>
      </div>
    );
  }

  return (
    <div className="wb-wishlist-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`wb-toast wb-toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="wb-wishlist-header">
        <div className="wb-wishlist-header-top">
          <h1>❤️ My Wishlist</h1>
          <Link href="/shopping-minimal" className="wb-continue-shopping-link">
            ← Back to Shopping
          </Link>
        </div>
        <p className="wb-wishlist-count">
          {wishlist.length} item{wishlist.length !== 1 ? "s" : ""} saved
        </p>
      </header>

      {/* Empty State */}
      {wishlist.length === 0 ? (
        <section className="wb-wishlist-empty">
          <div className="wb-wishlist-empty-icon">💔</div>
          <h2>Your wishlist is empty</h2>
          <p>Start adding items you love to your wishlist!</p>
          <Link href="/shopping-minimal" className="wb-wishlist-cta">
            Continue Shopping
          </Link>
        </section>
      ) : (
        <>
          {/* Wishlist Grid */}
          <section className="wb-wishlist-grid">
            {wishlist.map((product) => (
              <div key={product.id} className="wb-wishlist-card">
                {/* Image */}
                <div className="wb-wishlist-image-container">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="wb-wishlist-image"
                      sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="wb-wishlist-image-placeholder">📦</div>
                  )}
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="wb-wishlist-remove-btn"
                    title="Remove from wishlist"
                  >
                    ✕
                  </button>
                </div>

                {/* Product Info */}
                <div className="wb-wishlist-info">
                  <h3 className="wb-wishlist-name">{product.name}</h3>
                  
                  {/* Rating */}
                  {product.rating && (
                    <div className="wb-wishlist-rating">
                      <span className="wb-stars">
                        {"★".repeat(Math.round(product.rating))}
                        {"☆".repeat(5 - Math.round(product.rating))}
                      </span>
                      <span className="wb-rating-value">({product.rating})</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="wb-wishlist-price">
                    <strong>{formatProductPrice(product.price || 0)}</strong>
                  </div>

                  {/* Actions */}
                  <div className="wb-wishlist-actions">
                    <button
                      onClick={() => addToCart(product)}
                      className="wb-wishlist-add-btn"
                    >
                      🛒 Add to Cart
                    </button>
                    <Link
                      href={`/products/${product.id}`}
                      className="wb-wishlist-view-btn"
                    >
                      👁️ View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Continue Shopping Footer */}
          <footer className="wb-wishlist-footer">
            <p>Want to find more items?</p>
            <Link href="/shopping-minimal" className="wb-continue-shopping-btn">
              Continue Shopping
            </Link>
          </footer>
        </>
      )}
    </div>
  );
}
