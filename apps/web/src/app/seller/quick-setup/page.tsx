"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface SellerFormData {
  business_name: string;
  seller_name: string;
  phone_number: string;
  email: string;
  location: string;
  category: string;
  cac_number?: string;
  business_type: "formal" | "informal";
}

type FormStep = "welcome" | "business-info" | "contact-info" | "category" | "confirm" | "success";

export default function QuickSellerSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<SellerFormData>({
    business_name: "",
    seller_name: "",
    phone_number: "",
    email: "",
    location: "",
    category: "",
    business_type: "informal",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    switch (step) {
      case "welcome":
        setStep("business-info");
        break;
      case "business-info":
        if (!formData.business_name.trim() || !formData.seller_name.trim()) {
          setError("Please fill in all fields");
          return;
        }
        setStep("contact-info");
        break;
      case "contact-info":
        if (!formData.phone_number.trim() || !formData.email.trim() || !formData.location.trim()) {
          setError("Please fill in all fields");
          return;
        }
        setStep("category");
        break;
      case "category":
        if (!formData.category) {
          setError("Please select a category");
          return;
        }
        setStep("confirm");
        break;
      case "confirm":
        handleSubmit();
        break;
    }
    setError("");
  };

  const handlePrevious = () => {
    switch (step) {
      case "business-info":
        setStep("welcome");
        break;
      case "contact-info":
        setStep("business-info");
        break;
      case "category":
        setStep("contact-info");
        break;
      case "confirm":
        setStep("category");
        break;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/seller/quick-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create seller account");
      }

      const result = await response.json();
      setStep("success");

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/seller/dashboard?seller_id=${result.seller_id}`);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create seller account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wb-seller-setup">
      <header className="wb-seller-setup__header">
        <Link href="/" className="wb-seller-setup__logo">
          webubble
        </Link>
        <span className="wb-seller-setup__step-indicator">
          {step === "welcome" && "Step 1 of 5"}
          {step === "business-info" && "Step 2 of 5"}
          {step === "contact-info" && "Step 3 of 5"}
          {step === "category" && "Step 4 of 5"}
          {step === "confirm" && "Step 5 of 5"}
        </span>
      </header>

      <div className="wb-seller-setup__container">
        {/* Progress Bar */}
        <div className="wb-seller-setup__progress">
          <div
            className="wb-seller-setup__progress-bar"
            style={{
              width:
                step === "welcome"
                  ? "20%"
                  : step === "business-info"
                    ? "40%"
                    : step === "contact-info"
                      ? "60%"
                      : step === "category"
                        ? "80%"
                        : "100%",
            }}
          ></div>
        </div>

        {/* STEP 1: Welcome */}
        {step === "welcome" && (
          <div className="wb-seller-setup__step">
            <div className="wb-seller-setup__icon">🎉</div>
            <h1>Welcome to Webubble!</h1>
            <p className="wb-seller-setup__description">
              Join hundreds of local sellers who are already using Webubble to reach more customers.
            </p>

            <div className="wb-seller-setup__benefits">
              <div className="wb-benefit">
                <span className="wb-benefit-icon">✓</span>
                <span>No monthly fees or hidden charges</span>
              </div>
              <div className="wb-benefit">
                <span className="wb-benefit-icon">✓</span>
                <span>Add products in minutes</span>
              </div>
              <div className="wb-benefit">
                <span className="wb-benefit-icon">✓</span>
                <span>Reach local customers instantly</span>
              </div>
              <div className="wb-benefit">
                <span className="wb-benefit-icon">✓</span>
                <span>Admin-approved safe marketplace</span>
              </div>
            </div>

            <button onClick={handleNext} className="wb-btn wb-btn--large wb-btn--primary">
              Get Started →
            </button>
            <Link href="/" className="wb-btn wb-btn--secondary">
              Back to Home
            </Link>
          </div>
        )}

        {/* STEP 2: Business Info */}
        {step === "business-info" && (
          <div className="wb-seller-setup__step">
            <h2>Your Business</h2>
            <p className="wb-seller-setup__description">Tell us about your business</p>

            {error && <div className="wb-error-message">{error}</div>}

            <form className="wb-seller-setup__form">
              <div className="wb-form-group">
                <label htmlFor="business_name">Business Name *</label>
                <input
                  id="business_name"
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Mary's Fresh Tomatoes"
                  required
                />
              </div>

              <div className="wb-form-group">
                <label htmlFor="seller_name">Your Name *</label>
                <input
                  id="seller_name"
                  type="text"
                  name="seller_name"
                  value={formData.seller_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Mary Okafor"
                  required
                />
              </div>

              <div className="wb-form-group">
                <label htmlFor="business_type">Business Type *</label>
                <select
                  id="business_type"
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="informal">Informal Seller (Street/Market)</option>
                  <option value="formal">Registered Business (with CAC)</option>
                </select>
              </div>

              {formData.business_type === "formal" && (
                <div className="wb-form-group">
                  <label htmlFor="cac_number">CAC Number</label>
                  <input
                    id="cac_number"
                    type="text"
                    name="cac_number"
                    value={formData.cac_number || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., RC123456"
                  />
                </div>
              )}

              <div className="wb-form-actions">
                <button type="button" onClick={handleNext} className="wb-btn wb-btn--large wb-btn--primary">
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Contact Info */}
        {step === "contact-info" && (
          <div className="wb-seller-setup__step">
            <h2>How to Reach You</h2>
            <p className="wb-seller-setup__description">We&apos;ll use this to verify your account and send updates</p>

            {error && <div className="wb-error-message">{error}</div>}

            <form className="wb-seller-setup__form">
              <div className="wb-form-group">
                <label htmlFor="phone_number">Phone Number *</label>
                <input
                  id="phone_number"
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="e.g., 0801 234 5678"
                  required
                />
              </div>

              <div className="wb-form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g., mary@example.com"
                  required
                />
              </div>

              <div className="wb-form-group">
                <label htmlFor="location">Location / City *</label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Lagos, Yaba Market"
                  required
                />
              </div>

              <div className="wb-form-actions">
                <button type="button" onClick={handlePrevious} className="wb-btn wb-btn--secondary">
                  ← Back
                </button>
                <button type="button" onClick={handleNext} className="wb-btn wb-btn--large wb-btn--primary">
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Category */}
        {step === "category" && (
          <div className="wb-seller-setup__step">
            <h2>What do you sell?</h2>
            <p className="wb-seller-setup__description">Pick the main category for your products</p>

            {error && <div className="wb-error-message">{error}</div>}

            <div className="wb-category-grid">
              {[
                { value: "food-groceries", label: "🥬 Food & Groceries" },
                { value: "fresh-produce", label: "🍊 Fresh Produce" },
                { value: "fashion-fabrics", label: "🧵 Fashion & Fabrics" },
                { value: "home-living", label: "🏺 Home & Living" },
                { value: "beauty-care", label: "🧴 Beauty & Care" },
                { value: "electronics-accessories", label: "🎧 Electronics & Accessories" },
                { value: "street-food", label: "🥙 Street Food" },
                { value: "other", label: "📦 Other" },
              ].map((cat) => (
                <label key={cat.value} className="wb-category-option">
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={formData.category === cat.value}
                    onChange={handleInputChange}
                    required
                  />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>

            <div className="wb-form-actions">
              <button type="button" onClick={handlePrevious} className="wb-btn wb-btn--secondary">
                ← Back
              </button>
              <button type="button" onClick={handleNext} className="wb-btn wb-btn--large wb-btn--primary">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirm */}
        {step === "confirm" && (
          <div className="wb-seller-setup__step">
            <h2>Review Your Information</h2>
            <p className="wb-seller-setup__description">Make sure everything looks correct</p>

            {error && <div className="wb-error-message">{error}</div>}

            <div className="wb-review-section">
              <div className="wb-review-item">
                <span className="wb-review-label">Business Name</span>
                <span className="wb-review-value">{formData.business_name}</span>
              </div>
              <div className="wb-review-item">
                <span className="wb-review-label">Your Name</span>
                <span className="wb-review-value">{formData.seller_name}</span>
              </div>
              <div className="wb-review-item">
                <span className="wb-review-label">Phone</span>
                <span className="wb-review-value">{formData.phone_number}</span>
              </div>
              <div className="wb-review-item">
                <span className="wb-review-label">Email</span>
                <span className="wb-review-value">{formData.email}</span>
              </div>
              <div className="wb-review-item">
                <span className="wb-review-label">Location</span>
                <span className="wb-review-value">{formData.location}</span>
              </div>
              <div className="wb-review-item">
                <span className="wb-review-label">Category</span>
                <span className="wb-review-value">{formData.category}</span>
              </div>
            </div>

            <div className="wb-form-actions">
              <button type="button" onClick={handlePrevious} className="wb-btn wb-btn--secondary">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="wb-btn wb-btn--large wb-btn--primary"
              >
                {loading ? "Creating Account..." : "Create My Seller Account →"}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="wb-seller-setup__step wb-seller-setup__step--center">
            <div className="wb-success-icon">✓</div>
            <h2>Welcome to Webubble!</h2>
            <p className="wb-seller-setup__description">
              Your seller account has been created. You can now add your products and start reaching customers.
            </p>
            <p className="wb-seller-setup__redirect">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
