"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Button, TextField } from "@webubble/ui";

type CatalogueCard = {
  id: number;
  category: string;
  name: string;
  description: string;
  icon: string;
  position: number;
  currency: "NGN";
  price_minor: number;
  stock_quantity: number;
  seller_name: string;
  seller_claim: string;
  preview_only: true;
  demo_data: true;
};

type CardDraft = Omit<CatalogueCard, "id" | "currency" | "demo_data" | "preview_only">;

const emptyDraft: CardDraft = {
  category: "",
  name: "",
  description: "",
  icon: "🧺",
  position: 100,
  price_minor: 100000,
  stock_quantity: 10,
  seller_name: "Webubble Demo Seller",
  seller_claim: "Fictional seller profile for design review; not a real business or endorsement.",
};
const storefrontUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCatalogueCard(value: unknown): value is CatalogueCard {
  return isRecord(value)
    && typeof value.id === "number"
    && typeof value.category === "string"
    && typeof value.name === "string"
    && typeof value.description === "string"
    && typeof value.icon === "string"
    && typeof value.position === "number"
    && value.currency === "NGN"
    && typeof value.price_minor === "number"
    && typeof value.stock_quantity === "number"
    && typeof value.seller_name === "string"
    && typeof value.seller_claim === "string"
    && value.preview_only === true
    && value.demo_data === true;
}

function formatPrice(priceMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(priceMinor / 100);
}

function getErrorMessage(payload: unknown, fallback: string): string {
  return isRecord(payload) && typeof payload.message === "string" ? payload.message : fallback;
}

export default function CataloguePage() {
  const [cards, setCards] = useState<CatalogueCard[]>([]);
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const categories = useMemo(
    () => [...new Set(cards.map((card) => card.category))].sort((a, b) => a.localeCompare(b)),
    [cards],
  );
  const visibleCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return cards.filter((card) => {
      const matchesCategory = !categoryFilter || card.category === categoryFilter;
      const matchesSearch = !term
        || `${card.name} ${card.category} ${card.description} ${card.seller_name} ${card.seller_claim}`.toLocaleLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [cards, categoryFilter, search]);

  async function loadCards() {
    setError("");
    const response = await fetch("/api/catalogue-preview", { cache: "no-store" });
    const payload: unknown = await response.json();
    if (response.status === 401) {
      window.location.assign("/sign-in");
      return;
    }
    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "Unable to load the catalogue preview."));
    }
    if (
      !isRecord(payload)
      || !isRecord(payload.data)
      || !Array.isArray(payload.data.catalogue)
      || !payload.data.catalogue.every(isCatalogueCard)
    ) {
      throw new Error("The server returned an invalid catalogue preview.");
    }
    setCards(payload.data.catalogue);
  }

  useEffect(() => {
    let active = true;
    loadCards()
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the catalogue preview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function startEditing(card: CatalogueCard) {
    setError("");
    setNotice("");
    setEditingId(card.id);
    setDraft({
      category: card.category,
      name: card.name,
      description: card.description,
      icon: card.icon,
      position: card.position,
      price_minor: card.price_minor,
      stock_quantity: card.stock_quantity,
      seller_name: card.seller_name,
      seller_claim: card.seller_claim,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingId === null ? "/api/catalogue-preview" : `/api/catalogue-preview/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const payload: unknown = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Unable to save the catalogue idea."));
      await loadCards();
      setNotice(editingId === null ? "Catalogue idea added to the storefront preview." : "Catalogue idea updated.");
      cancelEditing();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the catalogue idea.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCard(card: CatalogueCard) {
    if (!window.confirm(`Remove "${card.name}" from the storefront preview?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/catalogue-preview/${card.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(getErrorMessage(payload, "Unable to remove the catalogue idea."));
      }
      if (editingId === card.id) cancelEditing();
      await loadCards();
      setNotice("Catalogue idea removed from the storefront preview.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove the catalogue idea.");
    }
  }

  if (loading) return <main aria-live="polite">Loading catalogue preview…</main>;

  return (
    <main className="wb-catalogue-admin">
      <header className="wb-admin-header">
        <div>
          <p className="wb-auth-eyebrow">OWNER REVIEW · PREVIEW ONLY</p>
          <h1>Catalogue ideas</h1>
          <p>Try a first assortment, edit anything that feels off, then review it on the storefront.</p>
        </div>
        <nav aria-label="Admin navigation">
          <Link className="wb-admin-brand" href="/" aria-label="Webubble admin home">
            <Image src="/webubble_logo.jpg" alt="" width={32} height={32} />
            <span>Webubble</span>
          </Link>
          <Link href="/">Seller applications</Link>
          <a href={`${storefrontUrl}/#catalogue`}>Open storefront preview</a>
        </nav>
      </header>

      <div className="wb-catalogue-disclaimer">
        Every price, stock count, seller name and seller blurb is fictional demo data, not a real
        offer or verified claim. Saving changes updates this owner-review preview only; it does
        not create live listings or verification badges.
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="wb-catalogue-layout">
        <section className="wb-catalogue-list" aria-labelledby="ideas-title">
          <div className="wb-catalogue-list__heading">
            <div>
              <p className="wb-auth-eyebrow">CURRENT DIRECTION</p>
              <h2 id="ideas-title">Storefront concepts</h2>
            </div>
            <span>{cards.length} ideas</span>
          </div>
          <div className="wb-catalogue-filters">
            <label>
              <span className="wb-catalogue-filter-label">Search catalogue ideas</span>
              <input
                type="search"
                placeholder="Search names or descriptions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              <span className="wb-catalogue-filter-label">Filter by category</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          {cards.length === 0 ? (
            <p className="wb-catalogue-empty">No catalogue ideas yet. Add one to start the preview.</p>
          ) : visibleCards.length === 0 ? (
            <p className="wb-catalogue-empty" role="status">No ideas match these filters.</p>
          ) : (
            <ul className="wb-catalogue-cards">
              {visibleCards.map((card) => (
                <li key={card.id} className="wb-catalogue-item">
                  <span className="wb-catalogue-item__icon" aria-hidden="true">{card.icon}</span>
                  <div className="wb-catalogue-item__copy">
                    <span className="wb-catalogue-item__category">{card.category}</span>
                    <h3>{card.name}</h3>
                    <p>{card.description}</p>
                    <p><strong>Demo price:</strong> {formatPrice(card.price_minor)} · <strong>Demo stock:</strong> {card.stock_quantity}</p>
                    <p><strong>Fictional seller:</strong> {card.seller_name}</p>
                    <p>{card.seller_claim}</p>
                    <span className="wb-preview-pill">Concept only</span>
                  </div>
                  <div className="wb-catalogue-item__actions">
                    <Button variant="secondary" onClick={() => startEditing(card)}>Edit</Button>
                    <Button variant="danger" onClick={() => removeCard(card)}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wb-catalogue-editor" aria-labelledby="editor-title">
          <p className="wb-auth-eyebrow">{editingId === null ? "ADD AN IDEA" : "CHANGE THIS IDEA"}</p>
          <h2 id="editor-title">{editingId === null ? "Add to the preview" : "Edit catalogue idea"}</h2>
          <form className="wb-catalogue-form" onSubmit={saveCard}>
            <TextField
              label="Category (proposed)"
              maxLength={80}
              required
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            />
            <TextField
              label="Idea or product name"
              maxLength={100}
              required
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <label className="wb-catalogue-description">
              Short description
              <textarea
                maxLength={280}
                minLength={2}
                required
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <div className="wb-catalogue-form__row">
              <TextField
                label="Icon"
                maxLength={8}
                required
                value={draft.icon}
                onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))}
              />
              <TextField
                label="Display order"
                type="number"
                min={0}
                max={999}
                required
                value={draft.position}
                onChange={(event) => setDraft((current) => ({ ...current, position: Number(event.target.value) }))}
              />
            </div>
            <div className="wb-catalogue-form__row">
              <TextField
                label="Demo price (NGN)"
                type="number"
                min={0.01}
                max={1000000}
                step={0.01}
                required
                value={draft.price_minor / 100}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  price_minor: Math.round(Number(event.target.value) * 100),
                }))}
              />
              <TextField
                label="Demo stock quantity"
                type="number"
                min={0}
                max={10000}
                required
                value={draft.stock_quantity}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  stock_quantity: Number(event.target.value),
                }))}
              />
            </div>
            <TextField
              label="Fictional seller name"
              maxLength={100}
              minLength={2}
              required
              value={draft.seller_name}
              onChange={(event) => setDraft((current) => ({ ...current, seller_name: event.target.value }))}
            />
            <label className="wb-catalogue-description">
              Seller blurb (fictional sample only)
              <textarea
                maxLength={240}
                minLength={2}
                required
                rows={3}
                value={draft.seller_claim}
                onChange={(event) => setDraft((current) => ({ ...current, seller_claim: event.target.value }))}
              />
            </label>
            <div className="wb-catalogue-form__actions">
              <Button type="submit" loading={saving} loadingLabel="Saving preview">
                {editingId === null ? "Add preview idea" : "Save changes"}
              </Button>
              {editingId !== null && (
                <Button variant="secondary" onClick={cancelEditing}>Cancel</Button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
