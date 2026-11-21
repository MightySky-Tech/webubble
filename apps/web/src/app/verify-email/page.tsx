"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, TextField } from "@webubble/ui";
import { resendOtp, verifyOtp } from "@/lib/auth";
import AuthBrand from "../AuthBrand";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await verifyOtp(code);
      router.replace("/account");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to verify this code.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setMessage("");
    setError("");
    setResending(true);
    try {
      await resendOtp();
      setMessage("If the address is eligible, a new verification code has been sent.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to resend the code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="wb-auth-page">
      <section className="wb-auth-card" aria-labelledby="verify-title">
        <AuthBrand />
        <p className="wb-auth-eyebrow">Email verification</p>
        <h1 id="verify-title">Check your inbox</h1>
        <p>Enter the six-digit code sent to your email address. It expires in 10 minutes.</p>
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        <form className="wb-auth-form" onSubmit={submit}>
          <TextField
            label="Verification code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button type="submit" fullWidth loading={loading} loadingLabel="Verifying code">
            Verify and continue
          </Button>
        </form>
        <div className="wb-auth-secondary">
          <Button variant="secondary" fullWidth loading={resending} loadingLabel="Resending code" onClick={resend}>
            Resend code
          </Button>
          <Link href="/sign-in">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
