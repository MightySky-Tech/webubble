"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, TextField } from "@webubble/ui";
import { requestOtp } from "@/lib/auth";
import AuthBrand from "../AuthBrand";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestOtp(email, "login");
      router.push("/verify-email");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to request a sign-in code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wb-auth-page">
      <section className="wb-auth-card" aria-labelledby="signin-title">
        <AuthBrand />
        <p className="wb-auth-eyebrow">Welcome back</p>
        <h1 id="signin-title">Sign in to Webubble</h1>
        <p>We will email you a one-time code to securely access your account.</p>
        {error && <Alert tone="error">{error}</Alert>}
        <form className="wb-auth-form" onSubmit={submit}>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" fullWidth loading={loading} loadingLabel="Sending code">
            Email me a code
          </Button>
        </form>
        <p className="wb-auth-footer">
          New to Webubble? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
