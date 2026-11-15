"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@webubble/ui";
import { getSellerProfile, SellerProfile } from "@/lib/auth";
import SellerOnboardingWizard from "./SellerOnboardingWizard";

export default function SellerOnboardingPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSellerProfile()
      .then((current) => {
        if (active) setProfile(current);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load your profile.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="wb-auth-page" aria-live="polite">
        Loading your profile…
      </main>
    );
  }

  if (error) {
    return (
      <main className="wb-auth-page">
        <section className="wb-auth-card" aria-labelledby="error-title">
          <h1 id="error-title">Unable to load</h1>
          <Alert tone="error">{error}</Alert>
          <p>
            <Link href="/account">Back to account</Link>
          </p>
        </section>
      </main>
    );
  }

  // profile === null and no error means user is not authenticated
  if (profile === null) {
    return (
      <main className="wb-auth-page">
        <section className="wb-auth-card" aria-labelledby="auth-title">
          <h1 id="auth-title">Sign in to continue</h1>
          <p>You need an account to become a seller. Sign in or create one to get started.</p>
          <p>
            <Link href="/account">Sign in or create account</Link>
          </p>
        </section>
      </main>
    );
  }

  if (profile && !["draft", "rejected", "needs_more_info"].includes(profile.status)) {
    return (
      <main className="wb-auth-page">
        <section className="wb-auth-card" aria-labelledby="status-title">
          <h1 id="status-title">Your seller profile</h1>
          <p>
            <strong>Status:</strong> {profile.status.replaceAll("_", " ")}
          </p>
          {profile.seller_type === "informal" && (
            <p>
              You're approved to sell! Your shop is live. Head to your dashboard to manage products and orders.
            </p>
          )}
          {profile.seller_type === "registered_business" && (
            <p>
              Your business registration is under review. We'll notify you when it's approved.
            </p>
          )}
          {profile.review_notes && (
            <p>
              <strong>Note from reviewer:</strong> {profile.review_notes}
            </p>
          )}
          <p>
            <Link href="/seller/dashboard">Go to your dashboard</Link>
          </p>
          <p className="wb-auth-footer">
            <Link href="/account">Back to account</Link>
          </p>
        </section>
      </main>
    );
  }

  return <SellerOnboardingWizard />;
}
