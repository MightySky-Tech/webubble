"use client";

import { useEffect, useState } from "react";
import type { components } from "@webubble/api-client";
import { Alert, Button, TextField } from "@webubble/ui";

type SellerApplication = components["schemas"]["SellerApplication"];
type ReviewStatus = "approved" | "rejected" | "needs_more_info";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApplication(value: unknown): value is SellerApplication {
  if (!isRecord(value)) return false;
  const item = value;
  const user = item.user;
  if (!isRecord(user)) return false;
  return typeof item.id === "number"
    && (item.seller_type === "registered_business" || item.seller_type === "informal")
    && typeof item.trading_name === "string"
    && typeof item.status === "string"
    && (typeof item.cac_number === "string" || item.cac_number === null)
    && typeof user.id === "number"
    && typeof user.name === "string"
    && typeof user.email === "string";
}

export default function Home() {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadApplications() {
    setError("");
    const auth = await fetch("/api/auth/me", { cache: "no-store" });
    if (auth.status === 401) {
      window.location.assign("/sign-in");
      return;
    }
    const authPayload: unknown = await auth.json();
    if (!auth.ok) throw new Error("Unable to verify administrator access.");
    if (
      typeof authPayload !== "object" || authPayload === null
      || !("data" in authPayload) || typeof authPayload.data !== "object" || authPayload.data === null
      || !("user" in authPayload.data) || typeof authPayload.data.user !== "object" || authPayload.data.user === null
      || !("roles" in authPayload.data.user) || !Array.isArray(authPayload.data.user.roles)
      || !authPayload.data.user.roles.includes("admin")
    ) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(true);

    const response = await fetch("/api/seller-applications", { cache: "no-store" });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = typeof payload === "object" && payload !== null && "message" in payload
        ? payload.message
        : "Unable to load seller applications.";
      throw new Error(typeof message === "string" ? message : "Unable to load seller applications.");
    }
    if (
      typeof payload !== "object" || payload === null
      || !("data" in payload) || typeof payload.data !== "object" || payload.data === null
      || !("applications" in payload.data) || !Array.isArray(payload.data.applications)
      || !payload.data.applications.every(isApplication)
    ) {
      throw new Error("The server returned an invalid seller application list.");
    }
    setApplications(payload.data.applications);
  }

  useEffect(() => {
    let active = true;
    loadApplications()
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load seller applications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function review(id: number, status: ReviewStatus) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/seller-applications/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: notes[id] ?? "" }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "message" in payload
          ? payload.message
          : "Unable to record the review.";
        throw new Error(typeof message === "string" ? message : "Unable to record the review.");
      }
      await loadApplications();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record the review.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <main aria-live="polite">Loading seller applications…</main>;
  if (!isAdmin && !error) {
    return <main><h1>Administrator access required</h1><p>This account does not have the admin role.</p></main>;
  }

  return (
    <main>
      <nav className="wb-admin-nav" aria-label="Admin tools">
        <a href="/catalogue">Review catalogue concepts</a>
      </nav>
      <h1>Seller applications</h1>
      <p>Review CAC evidence and informal seller applications. CAC verification appears only after approval.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {applications.length === 0 ? (
        <p>No applications are waiting for review.</p>
      ) : (
        <ul className="wb-admin-applications">
          {applications.map((application) => (
            <li key={application.id}>
              <h2>{application.trading_name}</h2>
              <p>{application.seller_type.replaceAll("_", " ")} · {application.status.replaceAll("_", " ")}</p>
              <p>{application.user.name} · {application.user.email} · {application.phone}</p>
              {application.seller_type === "registered_business" && (
                <>
                  <p>{application.legal_name} · CAC {application.cac_number}</p>
                  <p><a href={`/api/seller-applications/${application.id}/evidence`}>Download CAC evidence</a></p>
                </>
              )}
              {application.seller_type === "informal" && (
                <p>No CAC required. Review identity by the approved proportionate process; no ID document is stored in this MVP.</p>
              )}
              <TextField
                label={`Review note for ${application.trading_name}`}
                value={notes[application.id] ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                maxLength={1000}
              />
              <div className="wb-admin-actions">
                <Button loading={busyId === application.id} onClick={() => review(application.id, "approved")}>
                  Approve
                </Button>
                <Button loading={busyId === application.id} onClick={() => review(application.id, "needs_more_info")}>
                  Request more information
                </Button>
                <Button loading={busyId === application.id} onClick={() => review(application.id, "rejected")}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
