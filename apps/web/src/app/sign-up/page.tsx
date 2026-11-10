"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, TextField } from "@webubble/ui";
import { requestOtp } from "@/lib/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestOtp(email, "register", name);
      router.push("/verify-email");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to request a verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wb-auth-page">
      <section className="wb-auth-card" aria-labelledby="signup-title">
        <p className="wb-auth-eyebrow">Webubble account</p>
        <h1 id="signup-title">Create your account</h1>
        <p>Use your email to receive a secure, one-time verification code.</p>
        {error && <Alert tone="error">{error}</Alert>}
        <form className="wb-auth-form" onSubmit={submit}>
          <TextField
            label="Full name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
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
            Continue
          </Button>
        </form>
        <p className="wb-auth-footer">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
