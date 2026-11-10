"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, TextField } from "@webubble/ui";
import { getSellerProfile, SellerProfile, submitSellerApplication } from "@/lib/auth";

export default function SellerOnboardingPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerType, setSellerType] = useState<"registered_business" | "informal">("informal");
  const [tradingName, setTradingName] = useState("");
  const [phone, setPhone] = useState("");
  const [legalName, setLegalName] = useState("");
  const [cacNumber, setCacNumber] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getSellerProfile()
      .then((current) => {
        if (!active) return;
        setProfile(current);
        if (current) {
          setSellerType(current.seller_type);
          setTradingName(current.trading_name);
          setPhone(current.phone);
          setLegalName(current.legal_name ?? "");
          setCacNumber(current.cac_number ?? "");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load your seller application.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    const form = new FormData();
    form.set("seller_type", sellerType);
    form.set("trading_name", tradingName);
    form.set("phone", phone);
    if (sellerType === "registered_business") {
      form.set("legal_name", legalName);
      form.set("cac_number", cacNumber);
      if (evidence) form.set("cac_evidence", evidence);
    }

    try {
      const submitted = await submitSellerApplication(form);
      setProfile(submitted);
      setMessage("Your application has been submitted for review.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit your seller application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="wb-auth-page" aria-live="polite">Loading seller application…</main>;
  }

  const canEdit = !profile || profile.status === "rejected" || profile.status === "needs_more_info";

  return (
    <main className="wb-auth-page">
      <section className="wb-auth-card" aria-labelledby="seller-title">
        <p className="wb-auth-eyebrow">Seller onboarding</p>
        <h1 id="seller-title">Start selling on Webubble</h1>
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        {profile && (
          <section aria-label="Application status">
            <p><strong>Status:</strong> {profile.status.replaceAll("_", " ")}</p>
            {profile.review_notes && <p><strong>Reviewer note:</strong> {profile.review_notes}</p>}
            {profile.seller_type === "registered_business" && (
              <p>{profile.cac_verified ? "CAC verified" : "CAC verification is pending review."}</p>
            )}
            {profile.seller_type === "informal" && (
              <p>Informal seller applications do not require CAC. Identity review is pending; payout checks will be available when a provider is selected.</p>
            )}
          </section>
        )}
        {canEdit ? (
          <form className="wb-auth-form" onSubmit={submit}>
            <label>
              Seller type
              <select
                value={sellerType}
                onChange={(event) => setSellerType(event.target.value as "registered_business" | "informal")}
              >
                <option value="informal">Individual / informal seller (no CAC)</option>
                <option value="registered_business">Registered business (CAC required)</option>
              </select>
            </label>
            <TextField
              label="Trading name"
              required
              minLength={2}
              maxLength={100}
              value={tradingName}
              onChange={(event) => setTradingName(event.target.value)}
            />
            <TextField
              label="Contact phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={32}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            {sellerType === "registered_business" && (
              <>
                <TextField
                  label="CAC legal name"
                  required
                  minLength={2}
                  maxLength={160}
                  value={legalName}
                  onChange={(event) => setLegalName(event.target.value)}
                />
                <TextField
                  label="CAC registration number"
                  required
                  maxLength={32}
                  value={cacNumber}
                  onChange={(event) => setCacNumber(event.target.value)}
                />
                <label>
                  CAC evidence (PDF, JPG or PNG; up to 5 MB)
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    required={!profile}
                    onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
                  />
                </label>
              </>
            )}
            <Button type="submit" fullWidth loading={submitting} loadingLabel="Submitting application">
              Submit for review
            </Button>
          </form>
        ) : (
          <p>Your application cannot be changed while it is pending or approved.</p>
        )}
        <p className="wb-auth-footer"><Link href="/account">Back to account</Link></p>
      </section>
    </main>
  );
}
