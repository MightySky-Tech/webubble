import type { components } from "@webubble/api-client";

export type AuthUser = components["schemas"]["User"];
export type SellerProfile = components["schemas"]["SellerProfile"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRoleName(value: unknown): value is AuthUser["roles"][number] {
  return value === "buyer" || value === "seller" || value === "vendor" || value === "admin";
}

function isRoleArray(value: unknown): value is AuthUser["roles"] {
  return Array.isArray(value) && value.every(isRoleName);
}

function isSellerProfile(value: unknown): value is SellerProfile {
  if (!isRecord(value)) return false;
  return typeof value.id === "number"
    && (value.seller_type === "registered_business" || value.seller_type === "informal")
    && ["draft", "pending", "approved", "rejected", "needs_more_info"].includes(String(value.status))
    && typeof value.trading_name === "string"
    && typeof value.phone === "string"
    && (typeof value.legal_name === "string" || value.legal_name === null)
    && (typeof value.cac_number === "string" || value.cac_number === null)
    && typeof value.cac_verified === "boolean"
    && ["not_required", "pending", "approved", "rejected", "needs_more_info"].includes(
      String(value.identity_verification_status),
    )
    && ["not_started", "pending", "verified", "failed"].includes(
      String(value.payout_verification_status),
    )
    && (typeof value.submitted_at === "string" || value.submitted_at === null)
    && (typeof value.reviewed_at === "string" || value.reviewed_at === null)
    && (typeof value.review_notes === "string" || value.review_notes === null);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The server returned an invalid response.");
    }
    throw error;
  }
}

function getUser(payload: unknown): AuthUser {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.user)) {
    throw new Error("The server returned an invalid account response.");
  }

  const user = payload.data.user;
  if (
    typeof user.id !== "number"
    || typeof user.name !== "string"
    || typeof user.email !== "string"
    || !isRoleArray(user.roles)
  ) {
    throw new Error("The server returned an invalid account response.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
  };
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  const response = await fetch(`/api/auth/${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : "The request could not be completed.";
    throw new Error(message);
  }

  return payload;
}

export async function requestOtp(
  email: string,
  intent: "register" | "login",
  name?: string,
): Promise<void> {
  await requestJson("otp/request", {
    method: "POST",
    body: JSON.stringify({ email, intent, ...(name ? { name } : {}) }),
  });
}

export async function resendOtp(): Promise<void> {
  await requestJson("otp/resend", { method: "POST", body: "{}" });
}

export async function verifyOtp(code: string): Promise<void> {
  const payload = await requestJson("otp/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  getUser(payload);
}

export async function getCurrentUser(): Promise<AuthUser> {
  return getUser(await requestJson("me"));
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "DELETE",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const payload = await readJson(response);
    const message = isRecord(payload) ? payload.message : undefined;
    throw new Error(typeof message === "string" ? message : "Unable to sign out.");
  }
}

export async function getSellerProfile(): Promise<SellerProfile | null> {
  const payload = await requestJson("seller/me");
  if (
    !isRecord(payload)
    || !isRecord(payload.data)
    || !("seller" in payload.data)
  ) {
    throw new Error("The server returned an invalid seller application response.");
  }

  if (payload.data.seller === null) return null;
  if (!isSellerProfile(payload.data.seller)) {
    throw new Error("The server returned an invalid seller application response.");
  }
  return payload.data.seller;
}

export async function submitSellerApplication(form: FormData): Promise<SellerProfile> {
  const response = await fetch("/api/seller/onboarding", {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : "The seller application could not be submitted.";
    throw new Error(message);
  }
  if (!isRecord(payload) || !isRecord(payload.data) || !isSellerProfile(payload.data.seller)) {
    throw new Error("The server returned an invalid seller application response.");
  }
  return payload.data.seller;
}
