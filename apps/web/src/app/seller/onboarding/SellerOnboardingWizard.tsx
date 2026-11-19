"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert, Button, TextField } from "@webubble/ui";
import { submitSellerApplication } from "@/lib/auth";

type Step = "role-choice" | "phone-verify" | "shop-info" | "success";

interface WizardState {
  sellerType: "informal" | "registered_business";
  phone: string;
  tradingName: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
}

interface Props {
  onComplete?: (data: WizardState) => void;
}

export default function SellerOnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("role-choice");
  const [state, setState] = useState<WizardState>({
    sellerType: "informal",
    phone: "",
    tradingName: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  const handleRoleChoice = useCallback(
    (role: "informal" | "registered_business") => {
      setState((current) => ({ ...current, sellerType: role }));
      setStep("phone-verify");
    },
    [],
  );

  const handlePhoneSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      setLoading(true);

      try {
        // In MVP: phone OTP is handled by backend
        // For now, mock the verification
        if (!state.phone || state.phone.length < 10) {
          throw new Error("Please enter a valid phone number.");
        }
        // Move to shop info after phone verified
        setState((current) => ({
          ...current,
          phone: state.phone,
        }));
        setStep("shop-info");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify phone number.");
      } finally {
        setLoading(false);
      }
    },
    [state.phone],
  );

  const handleShopInfoSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      setLoading(true);

      try {
        if (!state.tradingName || state.tradingName.length < 2) {
          throw new Error("Please enter your shop name (at least 2 characters).");
        }

        const form = new FormData();
        form.set("seller_type", state.sellerType);
        form.set("trading_name", state.tradingName);
        form.set("phone", state.phone);

        await submitSellerApplication(form);
        setState((current) => ({
          ...current,
          tradingName: state.tradingName,
        }));
        setStep("success");
        onComplete?.(state);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create your seller profile.");
      } finally {
        setLoading(false);
      }
    },
    [state, onComplete],
  );

  const requestGeolocation = useCallback(() => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Your browser does not support location access.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationLabel: `Near coordinates: ${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`,
        }));
        setGeoError("");
      },
      (err) => {
        setGeoError(`Location error: ${err.message}. You can skip this step.`);
      },
    );
  }, []);

  return (
    <main className="wb-seller-onboarding-wizard">
      {/* Step 1: Role Choice */}
      {step === "role-choice" && (
        <section className="wb-wizard-step" aria-labelledby="role-title">
          <div className="wb-wizard-card">
            <p className="wb-wizard-kicker">Ready to sell?</p>
            <h1 id="role-title">Choose your path</h1>
            <p className="wb-wizard-description">
              Tell us what type of seller you are. Don&apos;t worry—you can change this later if needed.
            </p>

            <div className="wb-wizard-options">
              <button
                type="button"
                className="wb-wizard-option wb-wizard-option--informal"
                onClick={() => handleRoleChoice("informal")}
              >
                <span className="wb-wizard-option__icon">🏪</span>
                <div className="wb-wizard-option__content">
                  <strong>I&apos;m an individual or informal seller</strong>
                  <p>I don&apos;t have a CAC registration. I sell goods or services locally.</p>
                </div>
                <span className="wb-wizard-option__arrow">→</span>
              </button>

              <button
                type="button"
                className="wb-wizard-option wb-wizard-option--business"
                onClick={() => handleRoleChoice("registered_business")}
              >
                <span className="wb-wizard-option__icon">🏢</span>
                <div className="wb-wizard-option__content">
                  <strong>I run a registered business</strong>
                  <p>I have a CAC registration and want to verify my business.</p>
                </div>
                <span className="wb-wizard-option__arrow">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Step 2: Phone Verification */}
      {step === "phone-verify" && (
        <section className="wb-wizard-step" aria-labelledby="phone-title">
          <div className="wb-wizard-card">
            <button
              type="button"
              className="wb-wizard-back"
              onClick={() => setStep("role-choice")}
              aria-label="Back to role choice"
            >
              ← Back
            </button>

            <p className="wb-wizard-kicker">Your contact</p>
            <h1 id="phone-title">What&apos;s your phone number?</h1>
            <p className="wb-wizard-description">
              We&apos;ll use this to contact you about orders and payouts. No one else can see it.
            </p>

            {error && <Alert tone="error">{error}</Alert>}

            <form className="wb-wizard-form" onSubmit={handlePhoneSubmit}>
              <TextField
                type="tel"
                label="Phone number"
                placeholder="+234 70 1234 5678"
                value={state.phone}
                onChange={(e) => setState((current) => ({ ...current, phone: e.target.value }))}
                autoComplete="tel"
                required
                autoFocus
              />
              <p className="wb-wizard-note">
                ℹ️ We&apos;ll send a code to confirm it&apos;s really you. Takes 30 seconds.
              </p>
              <Button type="submit" fullWidth loading={loading} loadingLabel="Verifying phone…">
                Send verification code
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Step 3: Shop Info */}
      {step === "shop-info" && (
        <section className="wb-wizard-step" aria-labelledby="shop-title">
          <div className="wb-wizard-card">
            <button
              type="button"
              className="wb-wizard-back"
              onClick={() => setStep("phone-verify")}
              aria-label="Back to phone verification"
            >
              ← Back
            </button>

            <p className="wb-wizard-kicker">Your shop</p>
            <h1 id="shop-title">Tell us about your shop</h1>
            <p className="wb-wizard-description">
              This is how customers will find and recognize you.
            </p>

            {error && <Alert tone="error">{error}</Alert>}

            <form className="wb-wizard-form" onSubmit={handleShopInfoSubmit}>
              <TextField
                label="Shop name"
                placeholder="Mama Akara's Kitchen"
                value={state.tradingName}
                onChange={(e) => setState((current) => ({ ...current, tradingName: e.target.value }))}
                minLength={2}
                maxLength={100}
                required
                autoFocus
              />
              <p className="wb-wizard-note">
                What do people call your shop? Your personal name is fine too.
              </p>

              <div className="wb-wizard-location">
                <label>Where is your shop?</label>
                <p className="wb-wizard-note">
                  This helps customers find you. You can update it anytime.
                </p>
                {state.locationLabel && (
                  <p className="wb-wizard-location__current">📍 {state.locationLabel}</p>
                )}
                {geoError && <Alert tone="info">{geoError}</Alert>}
                <Button
                  type="button"
                  onClick={requestGeolocation}
                  aria-label="Use my current location"
                  className="wb-button--secondary"
                >
                  📍 Use my location
                </Button>
              </div>

              <Button type="submit" fullWidth loading={loading} loadingLabel="Creating your shop…">
                Start selling
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Step 4: Success */}
      {step === "success" && (
        <section className="wb-wizard-step" aria-labelledby="success-title">
          <div className="wb-wizard-card wb-wizard-card--success">
            <div className="wb-wizard-success-icon">🎉</div>
            <h1 id="success-title">Welcome, {state.tradingName}!</h1>
            <p className="wb-wizard-description">
              Your shop is now live on Webubble. People in your area can find you and place orders.
            </p>

            <div className="wb-wizard-next-steps">
              <h2>Next steps:</h2>
              <ol>
                <li>📸 <strong>Add your first product</strong> with photos and a description</li>
                <li>✓ <strong>Wait for admin approval</strong> (usually within 2 hours)</li>
                <li>💰 <strong>Start receiving orders</strong> and get paid safely</li>
              </ol>
            </div>

            <a href="/seller/products" className="wb-button wb-button--primary">
              Add your first product →
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
