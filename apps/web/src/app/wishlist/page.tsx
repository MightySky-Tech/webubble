"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatProductPrice, type ProductListing } from "@webubble/api-client/products";
import { addToCart, firstAvailableVariant, productImageUrl } from "@/lib/cart";
import { getAverageRating } from "@/lib/reviews";
import { readWishlist, removeFromWishlist } from "@/lib/wishlist";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<ProductListing[]>([]);
  const [ratings, setRatings] = useState<Map<number, number | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const items = readWishlist(window.localStorage);
    setWishlist(items);
    setRatings(new Map(items.map((product) => [product.id, getAverageRating(window.localStorage, product.id)])));
    setLoading(false);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemove = (productId: number) => {
    try {
      setWishlist(removeFromWishlist(window.localStorage, productId));
      showToast("Removed from wishlist", "success");
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
      showToast("Failed to remove item", "error");
    }
  };

  const handleAddToCart = (product: ProductListing) => {
    const variant = firstAvailableVariant(product);
    if (!variant) {
      showToast(`"${product.name}" is out of stock`, "error");
      return;
    }

    try {
      addToCart(window.localStorage, product, variant);
      showToast(`"${product.name}" added to cart`, "success");
    } catch (err) {
      console.error("Cart error:", err);
      showToast("Failed to add to cart", "error");
    }
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
        <div className={`wb-toast wb-toast-${toast.type}`} role="status">
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
            {wishlist.map((product) => {
              const imageUrl = productImageUrl(product);
              const rating = ratings.get(product.id) ?? null;

              return (
                <div key={product.id} className="wb-wishlist-card">
                  {/* Image */}
                  <div className="wb-wishlist-image-container">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="wb-wishlist-image"
                        sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="wb-wishlist-image-placeholder">📦</div>
                    )}
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="wb-wishlist-remove-btn"
                      title="Remove from wishlist"
                      aria-label={`Remove ${product.name} from wishlist`}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="wb-wishlist-info">
                    <h3 className="wb-wishlist-name">{product.name}</h3>

                    {/* Rating */}
                    {rating !== null && (
                      <div className="wb-wishlist-rating">
                        <span className="wb-stars">
                          {"★".repeat(Math.round(rating))}
                          {"☆".repeat(5 - Math.round(rating))}
                        </span>
                        <span className="wb-rating-value">({rating})</span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="wb-wishlist-price">
                      <strong>{formatProductPrice(product.price_minor)}</strong>
                    </div>

                    {/* Actions */}
                    <div className="wb-wishlist-actions">
                      <button onClick={() => handleAddToCart(product)} className="wb-wishlist-add-btn">
                        🛒 Add to Cart
                      </button>
                      <Link href={`/products/${product.id}`} className="wb-wishlist-view-btn">
                        👁️ View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
