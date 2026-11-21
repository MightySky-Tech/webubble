"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button } from "@webubble/ui";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import GlobalProductSearch from "../GlobalProductSearch";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.message === "Unauthenticated.") {
          router.replace("/sign-in");
          return;
        }
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load your account.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function signOut() {
    setError("");
    setSigningOut(true);
    try {
      await logout();
      router.replace("/sign-in");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return <main className="wb-account-loading" aria-live="polite">Getting your Webubble ready…</main>;
  }

  const canManageProducts = user?.roles.some((role) => role === "seller" || role === "vendor") ?? false;

  return (
    <main className="wb-account-page">
      <header className="wb-site-header wb-site-header--account">
        <Link className="wb-wordmark" href="/" aria-label="Webubble home">
          <Image className="wb-wordmark__image" src="/webubble_logo.jpg" alt="" width={32} height={32} priority />
          webubble
        </Link>
        <GlobalProductSearch />
        <button
          className="wb-mobile-nav-toggle"
          type="button"
          aria-label={mobileNavigationOpen ? "Close main navigation" : "Open main navigation"}
          aria-expanded={mobileNavigationOpen}
          aria-controls="account-main-navigation"
          onClick={() => setMobileNavigationOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileNavigationOpen ? "×" : "☰"}</span>
        </button>
        <nav
          id="account-main-navigation"
          className={`wb-site-nav${mobileNavigationOpen ? " wb-site-nav--open" : ""}`}
          aria-label="Main navigation"
        >
          <Link href="/" onClick={() => setMobileNavigationOpen(false)}>Explore Webubble</Link>
          <Link href="/seller/onboarding" onClick={() => setMobileNavigationOpen(false)}>Sell on Webubble</Link>
        </nav>
        <Button
          variant="secondary"
          loading={signingOut}
          loadingLabel="Signing out"
          onClick={signOut}
        >
          Sign out
        </Button>
      </header>

      <section className="wb-account-welcome">
        <div>
          <p className="wb-kicker">YOUR WEBUBBLE</p>
          <h1>{user ? `Welcome in, ${user.name.split(" ")[0]}.` : "Your account"}</h1>
          <p>Your local shopping journey starts here.</p>
        </div>
        <div className="wb-account-welcome__badge" aria-hidden="true">✳</div>
      </section>

      {error && <Alert tone="error">{error}</Alert>}

      {user ? (
        <div className="wb-account-grid">
          <section className="wb-account-panel wb-account-panel--profile" aria-labelledby="profile-title">
            <div className="wb-account-panel__heading">
              <span className="wb-account-icon" aria-hidden="true">☺</span>
              <span className="wb-status-pill"><span /> Email verified</span>
            </div>
            <p className="wb-kicker">YOUR PROFILE</p>
            <h2 id="profile-title">{user.name}</h2>
            <p className="wb-account-email">{user.email}</p>
            <div className="wb-account-roles">
              <span>Account type</span>
              <strong>{user.roles.map((role) => role.charAt(0).toUpperCase() + role.slice(1)).join(" · ")}</strong>
            </div>
          </section>

          <section className="wb-account-panel wb-account-panel--orders" aria-labelledby="orders-title">
            <div className="wb-account-panel__heading">
              <span className="wb-account-icon wb-account-icon--orange" aria-hidden="true">↗</span>
              <span className="wb-account-overline">COMING TO YOUR ACCOUNT</span>
            </div>
            <p className="wb-kicker">YOUR SHOPPING</p>
            <h2 id="orders-title">Orders & deliveries</h2>
            <p>Once shopping and checkout are live, you’ll be able to follow your orders right here.</p>
            <Link className="wb-text-link" href="/">Explore the storefront <span aria-hidden="true">→</span></Link>
          </section>

          <section className="wb-account-panel wb-account-panel--seller" aria-labelledby="seller-title">
            <div>
              <p className="wb-kicker">GOT SOMETHING TO SELL?</p>
              <h2 id="seller-title">{canManageProducts ? "Your storefront is ready." : "Bring your shop to Webubble."}</h2>
              <p>{canManageProducts
                ? "Add products and manage the listings for your approved seller account."
                : "Registered business or informal seller? There’s a place for your business here."}</p>
            </div>
            <Link className="wb-seller-link" href={canManageProducts ? "/seller/products" : "/seller/onboarding"}>
              {canManageProducts ? "Manage products" : "Become a seller"} <span aria-hidden="true">→</span>
            </Link>
            <span className="wb-account-panel__spark" aria-hidden="true">✳</span>
          </section>
        </div>
      ) : (
        <section className="wb-account-panel">
          <h2>Your account details couldn’t be loaded.</h2>
          <p>Please try again or sign in to continue.</p>
          <Link className="wb-text-link" href="/sign-in">Go to sign in</Link>
        </section>
      )}

      <footer className="wb-site-footer wb-site-footer--account">
        <Link className="wb-wordmark" href="/">
          <Image className="wb-wordmark__image" src="/webubble_logo.jpg" alt="" width={32} height={32} />
          webubble
        </Link>
        <Link href="/">Back to the storefront</Link>
        <span>© Webubble Limited</span>
      </footer>
    </main>
  );
}
