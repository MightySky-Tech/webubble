"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";

interface Review {
  id: string;
  productId: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  verified?: boolean;
}

type SortOption = "recent" | "rating-high" | "rating-low";

export default function ProductReviewsPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    rating: 5,
    text: "",
  });

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = () => {
    try {
      const stored = localStorage.getItem(`product_reviews_${productId}`) || "[]";
      const data = JSON.parse(stored);
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews", err);
    } finally {
      setLoading(false);
    }
  };

  const getSortedReviews = (): Review[] => {
    const sorted = [...reviews];
    if (sortBy === "recent") {
      return sorted.reverse();
    } else if (sortBy === "rating-high") {
      return sorted.sort((a, b) => b.rating - a.rating);
    } else {
      return sorted.sort((a, b) => a.rating - b.rating);
    }
  };

  const handleSubmitReview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.text.trim()) {
      showToast("Please fill all fields", "error");
      return;
    }

    const newReview: Review = {
      id: `review_${Date.now()}`,
      productId,
      name: formData.name,
      rating: formData.rating,
      text: formData.text,
      date: new Date().toISOString(),
      verified: false,
    };

    try {
      const stored = localStorage.getItem(`product_reviews_${productId}`) || "[]";
      const data = JSON.parse(stored);
      data.push(newReview);
      localStorage.setItem(`product_reviews_${productId}`, JSON.stringify(data));
      
      setReviews(data);
      setFormData({ name: "", rating: 5, text: "" });
      setShowForm(false);
      showToast("Review added successfully!", "success");
    } catch (err) {
      console.error("Failed to add review", err);
      showToast("Failed to add review", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAverageRating = (): number => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  };

  if (loading) {
    return (
      <div className="wb-reviews-loading">
        <p>Loading reviews...</p>
      </div>
    );
  }

  const avgRating = getAverageRating();
  const sortedReviews = getSortedReviews();

  return (
    <div className="wb-reviews-page">
      {/* Toast */}
      {toast && (
        <div className={`wb-toast wb-toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="wb-reviews-header">
        <div>
          <h1>Product Reviews</h1>
          <Link href="/shopping-minimal" className="wb-back-link">
            ← Back to Shopping
          </Link>
        </div>
      </header>

      {/* Summary */}
      <section className="wb-reviews-summary">
        <div className="wb-reviews-stats">
          <div className="wb-rating-box">
            <div className="wb-avg-rating">{avgRating}</div>
            <div className="wb-stars-large">
              {"★".repeat(Math.round(avgRating))}
              {"☆".repeat(5 - Math.round(avgRating))}
            </div>
            <div className="wb-review-count">{reviews.length} reviews</div>
          </div>

          {/* Rating breakdown */}
          <div className="wb-rating-breakdown">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="wb-rating-row">
                  <span className="wb-rating-stars">{star}★</span>
                  <div className="wb-rating-bar">
                    <div className="wb-rating-bar-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                  <span className="wb-rating-percent">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Review Button */}
        <button onClick={() => setShowForm(!showForm)} className="wb-add-review-btn">
          {showForm ? "✕ Cancel" : "✍️ Write a Review"}
        </button>
      </section>

      {/* Add Review Form */}
      {showForm && (
        <section className="wb-review-form">
          <h2>Share your experience</h2>
          <form onSubmit={handleSubmitReview} className="wb-form-review">
            <div className="wb-form-group">
              <label htmlFor="name" className="wb-label">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                className="wb-input"
              />
            </div>

            <div className="wb-form-group">
              <label htmlFor="rating" className="wb-label">
                Rating
              </label>
              <div className="wb-rating-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`wb-star-btn ${formData.rating >= star ? "active" : ""}`}
                  >
                    {formData.rating >= star ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div className="wb-form-group">
              <label htmlFor="text" className="wb-label">
                Your Review
              </label>
              <textarea
                id="text"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Share your thoughts about this product..."
                className="wb-textarea"
                rows={4}
              />
            </div>

            <button type="submit" className="wb-submit-review-btn">
              Post Review
            </button>
          </form>
        </section>
      )}

      {/* Sort Controls */}
      {reviews.length > 0 && (
        <div className="wb-reviews-sort">
          <label htmlFor="sort" className="wb-sort-label">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="wb-sort-select"
          >
            <option value="recent">Most Recent</option>
            <option value="rating-high">Highest Rating</option>
            <option value="rating-low">Lowest Rating</option>
          </select>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <section className="wb-no-reviews">
          <div className="wb-no-reviews-icon">💬</div>
          <h2>No reviews yet</h2>
          <p>Be the first to review this product!</p>
          <button onClick={() => setShowForm(true)} className="wb-add-review-btn">
            ✍️ Write First Review
          </button>
        </section>
      ) : (
        <section className="wb-reviews-list">
          {sortedReviews.map((review) => {
            const date = new Date(review.date);
            const daysAgo = Math.floor(
              (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
            );
            const dateStr =
              daysAgo === 0
                ? "Today"
                : daysAgo === 1
                  ? "Yesterday"
                  : `${daysAgo} days ago`;

            return (
              <article key={review.id} className="wb-review-item">
                <div className="wb-review-header">
                  <div className="wb-reviewer-info">
                    <div className="wb-avatar">
                      {review.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="wb-reviewer-name">{review.name}</h3>
                      <div className="wb-review-meta">
                        <span className="wb-review-rating">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                        <span className="wb-review-date">{dateStr}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="wb-review-text">{review.text}</p>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
