"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField } from "@webubble/ui";

type SignInStep = "email" | "email-code" | "authenticator-setup" | "authenticator-code";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function postAuth(path: string, body: Record<string, string>): Promise<unknown> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("The server returned an invalid response.");
    throw error;
  }
  if (!response.ok) {
    const message = isRecord(payload) ? payload.message : undefined;
    throw new Error(typeof message === "string" ? message : "Unable to complete sign-in.");
  }
  return payload;
}

async function getMfaSetup(): Promise<{ secret: string; uri: string }> {
  const response = await fetch("/api/auth/mfa/setup", { cache: "no-store" });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(payload) ? payload.message : undefined;
    throw new Error(typeof message === "string" ? message : "Unable to set up authenticator MFA.");
  }
  if (
    !isRecord(payload)
    || !isRecord(payload.data)
    || typeof payload.data.secret !== "string"
    || typeof payload.data.otpauth_uri !== "string"
  ) {
    throw new Error("The server returned an invalid MFA setup response.");
  }
  return { secret: payload.data.secret, uri: payload.data.otpauth_uri };
}

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<SignInStep>("email");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (step === "email") {
        await postAuth("otp/request", { email, intent: "login" });
        setStep("email-code");
      } else if (step === "email-code") {
        const payload = await postAuth("otp/verify", { email, intent: "login", code });
        if (
          !isRecord(payload)
          || !isRecord(payload.data)
          || !isRecord(payload.data.user)
          || !Array.isArray(payload.data.user.roles)
          || !payload.data.user.roles.includes("admin")
        ) {
          throw new Error("This account does not have administrator access.");
        }
        if (payload.admin_mfa_required !== true) {
          throw new Error("Administrator MFA is required to continue.");
        }
        if (payload.admin_mfa_setup_required === true) {
          setSetup(await getMfaSetup());
          setStep("authenticator-setup");
        } else {
          setStep("authenticator-code");
        }
        setCode("");
      } else {
        await postAuth("mfa/verify", { code });
        router.replace("/");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="wb-auth-card" aria-labelledby="admin-signin-title">
        <p className="wb-auth-eyebrow">Webubble Admin</p>
        <h1 id="admin-signin-title">Administrator sign in</h1>
        {error && <Alert tone="error">{error}</Alert>}
        <form className="wb-auth-form" onSubmit={submit}>
          {(step === "email" || step === "email-code") && (
            <TextField
              label="Email address"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={step === "email-code"}
            />
          )}
          {step === "email-code" && (
            <TextField
              label="Email verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          )}
          {step === "authenticator-setup" && setup && (
            <section aria-label="Authenticator setup">
              <p>Scan or open this authenticator link, then save the secret in your authenticator app.</p>
              <p><a href={setup.uri}>Open authenticator app</a></p>
              <p>Setup key: <code>{setup.secret}</code></p>
              <p>Keep this key private. It is encrypted at rest and shown only during setup.</p>
            </section>
          )}
          {(step === "authenticator-setup" || step === "authenticator-code") && (
            <TextField
              label="Authenticator code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          )}
          <Button type="submit" fullWidth loading={loading} loadingLabel="Please wait">
            {step === "email" && "Email me a code"}
            {step === "email-code" && "Verify email"}
            {step === "authenticator-setup" && "Enable authenticator"}
            {step === "authenticator-code" && "Verify authenticator"}
          </Button>
        </form>
      </section>
    </main>
  );
}
