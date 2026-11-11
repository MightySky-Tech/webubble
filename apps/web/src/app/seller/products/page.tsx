"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@webubble/ui";
import {
  InventoryAdjustment,
  isProductCategory,
  isInventoryAdjustment,
  isRecord,
  isSellerProductVariant,
  isSellerProduct,
  productError,
  formatProductPrice,
  ProductCategory,
  SellerProduct,
  SellerProductVariant,
} from "@webubble/api-client/products";

type VariantDraft = {
  id?: number;
  label: string;
  sku: string;
  stock_quantity?: number;
};

type ProductDraft = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  attributes: string;
  variants: VariantDraft[];
};

type InventoryDraft = {
  stockQuantity: string;
  lowStockThreshold: string;
  reason: string;
};

type InventoryHistoryState = {
  loading: boolean;
  adjustments?: InventoryAdjustment[];
  error?: string;
};

const emptyDraft: ProductDraft = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  attributes: "",
  variants: [{ label: "Standard", sku: "" }],
};

function parseAttributes(text: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [index, line] of text.split("\n").entries()) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    const name = separator < 0 ? "" : line.slice(0, separator).trim();
    const value = separator < 0 ? "" : line.slice(separator + 1).trim();
    if (!name || !value) {
      throw new Error(`Attribute line ${index + 1} must use “name: value”.`);
    }
    if (name.length > 60 || value.length > 160) {
      throw new Error("Attribute names are limited to 60 characters and values to 160.");
    }
    attributes[name] = value;
  }
  if (Object.keys(attributes).length > 20) {
    throw new Error("A product can have up to 20 attributes.");
  }
  return attributes;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [images, setImages] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [sellerAccessDenied, setSellerAccessDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [inventoryBusyVariantId, setInventoryBusyVariantId] = useState<number | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<number, InventoryDraft>>({});
  const [inventoryHistory, setInventoryHistory] = useState<Record<number, InventoryHistoryState>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData(): Promise<void> {
    setError("");
    const [productResponse, categoryResponse] = await Promise.all([
      fetch("/api/seller/products", { cache: "no-store" }),
      fetch("/api/catalogue/categories", { cache: "no-store" }),
    ]);
    const productPayload: unknown = await productResponse.json();
    if (productResponse.status === 401) {
      window.location.assign("/sign-in");
      return;
    }
    if (productResponse.status === 403) {
      setSellerAccessDenied(true);
      return;
    }
    if (!productResponse.ok) {
      throw new Error(productError(productPayload, "Unable to load your product listings."));
    }
    if (
      !isRecord(productPayload) || !isRecord(productPayload.data)
      || !Array.isArray(productPayload.data.products)
      || !productPayload.data.products.every(isSellerProduct)
    ) {
      throw new Error("The server returned an invalid seller product list.");
    }

    const categoryPayload: unknown = await categoryResponse.json();
    if (!categoryResponse.ok) {
      throw new Error(productError(categoryPayload, "Unable to load approved product categories."));
    }
    if (
      !isRecord(categoryPayload) || !isRecord(categoryPayload.data)
      || !Array.isArray(categoryPayload.data.categories)
      || !categoryPayload.data.categories.every(isProductCategory)
    ) {
      throw new Error("The server returned an invalid product category list.");
    }

    setProducts(productPayload.data.products);
    setCategories(categoryPayload.data.categories.filter(isProductCategory));
  }

  async function loadInventoryHistory(productId: number): Promise<void> {
    const current = inventoryHistory[productId];
    if (current?.loading || current?.adjustments) return;
    setInventoryHistory((previous) => ({ ...previous, [productId]: { loading: true } }));
    try {
      const response = await fetch(`/api/seller/products/${productId}/inventory-adjustments`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Unable to load inventory history."));
      const data = isRecord(payload) ? payload.data : null;
      const adjustments = isRecord(data) ? data.adjustments : null;
      if (
        !Array.isArray(adjustments)
        || !adjustments.every(isInventoryAdjustment)
      ) {
        throw new Error("The server returned an invalid inventory history.");
      }
      setInventoryHistory((previous) => ({
        ...previous,
        [productId]: { loading: false, adjustments },
      }));
    } catch (reason) {
      setInventoryHistory((previous) => ({
        ...previous,
        [productId]: {
          loading: false,
          error: reason instanceof Error ? reason.message : "Unable to load inventory history.",
        },
      }));
    }
  }

  useEffect(() => {
    let active = true;
    loadData()
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load seller products.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draft.categoryId && categories[0]) {
      setDraft((current) => ({ ...current, categoryId: String(categories[0].id) }));
    }
  }, [categories, draft.categoryId]);

  function editProduct(product: SellerProduct): void {
    setEditingId(product.id);
    setDraft({
      categoryId: String(product.category.id),
      name: product.name,
      description: product.description,
      price: (product.price_minor / 100).toFixed(2),
      attributes: Object.entries(product.attributes).map(([name, value]) => `${name}: ${value}`).join("\n"),
      variants: product.inventory_variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        sku: variant.sku ?? "",
        stock_quantity: variant.stock_quantity,
      })),
    });
    setImages([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setNotice("");
    setError("");
  }

  function resetForm(): void {
    setEditingId(null);
    setDraft({
      ...emptyDraft,
      categoryId: categories[0] ? String(categories[0].id) : "",
      variants: [...emptyDraft.variants],
    });
    setImages([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setNotice("");
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>): void {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) => (
        itemIndex === index ? { ...variant, ...patch } : variant
      )),
    }));
  }

  function addVariant(): void {
    setDraft((current) => ({
      ...current,
      variants: [...current.variants, { label: "", sku: "" }],
    }));
  }

  function removeVariant(index: number): void {
    setDraft((current) => ({
      ...current,
      variants: current.variants.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const priceMinor = Math.round(Number(draft.price) * 100);
      if (!Number.isSafeInteger(priceMinor) || priceMinor < 1) {
        throw new Error("Enter a valid product price.");
      }

      const form = new FormData();
      form.set("category_id", draft.categoryId);
      form.set("name", draft.name.trim());
      form.set("description", draft.description.trim());
      form.set("price_minor", String(priceMinor));
      form.set("attributes", JSON.stringify(parseAttributes(draft.attributes)));
      form.set("variants", JSON.stringify(draft.variants.map(({ id, label, sku }) => ({
        ...(id ? { id } : {}),
        label: label.trim(),
        sku: sku.trim() || null,
      }))));
      for (const image of images) form.append("images[]", image);

      const response = await fetch(
        editingId ? `/api/seller/products/${editingId}` : "/api/seller/products",
        { method: editingId ? "PUT" : "POST", body: form, cache: "no-store" },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(productError(payload, "Unable to save this product."));
      }
      if (!isRecord(payload) || !isRecord(payload.data) || !isSellerProduct(payload.data.product)) {
        throw new Error("The server returned an invalid product response.");
      }

      resetForm();
      setNotice("Draft saved. Submit it for review before it appears in the live catalogue.");
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save this product.");
    } finally {
      setSaving(false);
    }
  }

  async function saveInventory(
    event: FormEvent<HTMLFormElement>,
    product: SellerProduct,
    variant: SellerProductVariant,
  ): Promise<void> {
    event.preventDefault();
    const draftValues = inventoryDrafts[variant.id] ?? {
      stockQuantity: String(variant.stock_quantity),
      lowStockThreshold: String(variant.low_stock_threshold),
      reason: "",
    };
    const stockQuantity = Number(draftValues.stockQuantity);
    const lowStockThreshold = Number(draftValues.lowStockThreshold);
    if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1_000_000) {
      setError("Enter a stock count between 0 and 1,000,000.");
      return;
    }
    if (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1_000_000) {
      setError("Enter a low-stock threshold between 0 and 1,000,000.");
      return;
    }
    if (draftValues.reason.trim().length < 3) {
      setError("Explain why this inventory is changing.");
      return;
    }

    setInventoryBusyVariantId(variant.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/seller/products/${product.id}/variants/${variant.id}/inventory`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expected_stock_quantity: variant.stock_quantity,
            stock_quantity: stockQuantity,
            expected_low_stock_threshold: variant.low_stock_threshold,
            low_stock_threshold: lowStockThreshold,
            reason: draftValues.reason.trim(),
          }),
          cache: "no-store",
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = productError(payload, "Unable to update inventory.");
        if (response.status === 409) await loadData();
        throw new Error(message);
      }
      if (!isRecord(payload) || !isRecord(payload.data) || !isSellerProductVariant(payload.data.variant)) {
        throw new Error("The server returned an invalid inventory response.");
      }
      setInventoryDrafts((previous) => {
        const next = { ...previous };
        delete next[variant.id];
        return next;
      });
      setNotice(`${variant.label} inventory updated.`);
      await loadData();
      setInventoryHistory((previous) => {
        const next = { ...previous };
        delete next[product.id];
        return next;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update inventory.");
    } finally {
      setInventoryBusyVariantId(null);
    }
  }

  async function submitForReview(product: SellerProduct): Promise<void> {
    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/seller/products/${product.id}/submit`, {
        method: "POST",
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Unable to submit this product."));
      setNotice("Product submitted. It will appear in the storefront after administrator approval.");
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit this product.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeProduct(product: SellerProduct): Promise<void> {
    const message = product.status === "approved"
      ? "Unpublish this listing? It will disappear from the live storefront."
      : "Remove this draft listing?";
    if (!window.confirm(message)) return;

    setBusyId(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/seller/products/${product.id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(productError(payload, "Unable to remove this product."));
      }
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (editingId === product.id) resetForm();
      setNotice(product.status === "approved" ? "Listing unpublished." : "Draft removed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove this product.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <main className="wb-product-page" aria-live="polite">Loading your listings…</main>;
  if (sellerAccessDenied) {
    return (
      <main className="wb-product-page">
        <h1>Approved seller account required</h1>
        <p>Product listings are available after your seller application has been approved.</p>
        <Link className="wb-text-link" href="/seller/onboarding">Check your seller application <span aria-hidden="true">→</span></Link>
      </main>
    );
  }

  return (
    <main className="wb-product-page">
      <header className="wb-product-header">
        <Link className="wb-product-wordmark" href="/" aria-label="Webubble home">webubble</Link>
        <nav aria-label="Seller navigation">
          <Link href="/account">My account</Link>
          <Link href="/seller/onboarding">Seller profile</Link>
        </nav>
      </header>

      <section className="wb-product-intro">
        <p className="wb-product-eyebrow">YOUR STORE</p>
        <h1>Products that bring your shop to life.</h1>
        <p>Create a listing, add clear photos and details, then send it for moderation. Only approved listings appear in the live storefront.</p>
      </section>

      {error && <p className="wb-product-alert" role="alert">{error}</p>}
      {notice && <p className="wb-product-notice" role="status">{notice}</p>}

      <div className="wb-product-workspace">
        <section className="wb-product-editor" aria-labelledby="product-editor-title">
          <div className="wb-product-section-heading">
            <div>
              <p className="wb-product-eyebrow">{editingId ? "UPDATE YOUR LISTING" : "START A LISTING"}</p>
              <h2 id="product-editor-title">{editingId ? "Edit product" : "Add a product"}</h2>
            </div>
            {editingId && <button className="wb-product-text-button" type="button" onClick={resetForm}>Cancel edit</button>}
          </div>
          <form className="wb-product-form" onSubmit={saveProduct}>
            <label>
              Product name
              <input
                required
                minLength={3}
                maxLength={120}
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Category
              <select
                required
                value={draft.categoryId}
                onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
              >
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            {categories.length === 0 && <p className="wb-product-help">No categories are approved yet. Please check back later.</p>}
            <label>
              Description
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label>
              Price (NGN)
              <input
                required
                type="number"
                min="0.01"
                max="1000000000"
                step="0.01"
                value={draft.price}
                onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
              />
            </label>
            <label>
              Product details (one per line: <code>name: value</code>)
              <textarea
                rows={3}
                placeholder={"Material: Cotton\nMade in: Lagos"}
                value={draft.attributes}
                onChange={(event) => setDraft((current) => ({ ...current, attributes: event.target.value }))}
              />
            </label>
            <fieldset className="wb-product-variant-editor">
              <legend>Variants</legend>
              <p>Each option has its own stock count. The product price is shared by all options.</p>
              {draft.variants.map((variant, index) => (
                <div className="wb-product-variant-editor__row" key={variant.id ?? `new-${index}`}>
                  <label>
                    Option name
                    <input
                      required
                      maxLength={120}
                      placeholder="e.g. 1 kg, Medium / Blue"
                      value={variant.label}
                      onChange={(event) => updateVariant(index, { label: event.target.value })}
                    />
                  </label>
                  <label>
                    SKU (optional)
                    <input
                      maxLength={80}
                      value={variant.sku}
                      onChange={(event) => updateVariant(index, { sku: event.target.value })}
                    />
                  </label>
                  {variant.stock_quantity !== undefined && variant.stock_quantity > 0 && (
                    <p className="wb-product-help">Set this option&apos;s stock to zero before removing it.</p>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={draft.variants.length === 1 || (variant.stock_quantity ?? 0) > 0}
                    onClick={() => removeVariant(index)}
                  >
                    Remove option
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addVariant}>Add another option</Button>
            </fieldset>
            <label>
              Photos (up to 5; JPG, PNG or WebP; 5 MB each)
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setImages(Array.from(event.target.files ?? []))}
                required={!editingId}
              />
            </label>
            {editingId && <p className="wb-product-help">Choose new photos to replace the current set; leave empty to keep them.</p>}
            {images.length > 5 && <p className="wb-product-alert" role="alert">Choose no more than five photos.</p>}
            <Button type="submit" fullWidth loading={saving} loadingLabel="Saving product" disabled={categories.length === 0 || images.length > 5}>
              Save draft
            </Button>
          </form>
        </section>

        <section className="wb-product-list" aria-labelledby="seller-products-title">
          <div className="wb-product-section-heading">
            <div>
              <p className="wb-product-eyebrow">PRODUCTS</p>
              <h2 id="seller-products-title">Your listings</h2>
            </div>
            <span className="wb-product-count">{products.length}</span>
          </div>
          {products.length === 0 ? (
            <p className="wb-product-empty">Your store is ready for its first product. Saved drafts stay private until approved.</p>
          ) : (
            <div className="wb-product-listings">
              {products.map((product) => {
                const history = inventoryHistory[product.id];
                return (
                  <article className="wb-product-listing" key={product.id}>
                  {product.media[0] && (
                    <Image
                      className="wb-product-listing__image"
                      src={`/api/seller/products/${product.id}/media/${product.media[0].id}`}
                      alt={product.name}
                      width={232}
                      height={232}
                      unoptimized
                    />
                  )}
                  <div className="wb-product-listing__body">
                    <div className="wb-product-listing__heading">
                      <div>
                        <p className="wb-product-eyebrow">{product.category.name}</p>
                        <h3>{product.name}</h3>
                      </div>
                      <span className={`wb-product-status wb-product-status--${product.status}`}>{product.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="wb-product-listing__price">{formatProductPrice(product.price_minor)}</p>
                    {product.review_notes && <p className="wb-product-review-note">{product.review_notes}</p>}
                    <section className="wb-inventory-panel" aria-label={`Inventory for ${product.name}`}>
                      <h4>Stock and low-stock alerts</h4>
                      {product.inventory_variants.map((variant) => {
                        const values = inventoryDrafts[variant.id] ?? {
                          stockQuantity: String(variant.stock_quantity),
                          lowStockThreshold: String(variant.low_stock_threshold),
                          reason: "",
                        };

                        return (
                          <form
                            className="wb-inventory-variant"
                            key={variant.id}
                            onSubmit={(event) => saveInventory(event, product, variant)}
                          >
                            <div>
                              <strong>{variant.label}</strong>
                              {variant.sku && <span>SKU {variant.sku}</span>}
                              <span>
                                {variant.stock_quantity} in stock
                                {variant.is_low_stock ? " · Low stock" : ""}
                              </span>
                            </div>
                            <label>
                              Stock on hand
                              <input
                                type="number"
                                min="0"
                                max="1000000"
                                step="1"
                                required
                                value={values.stockQuantity}
                                onChange={(event) => setInventoryDrafts((previous) => ({
                                  ...previous,
                                  [variant.id]: { ...values, stockQuantity: event.target.value },
                                }))}
                              />
                            </label>
                            <label>
                              Low-stock alert at
                              <input
                                type="number"
                                min="0"
                                max="1000000"
                                step="1"
                                required
                                value={values.lowStockThreshold}
                                onChange={(event) => setInventoryDrafts((previous) => ({
                                  ...previous,
                                  [variant.id]: { ...values, lowStockThreshold: event.target.value },
                                }))}
                              />
                            </label>
                            <label>
                              Reason for change
                              <input
                                required
                                minLength={3}
                                maxLength={200}
                                placeholder="e.g. Restock or count correction"
                                value={values.reason}
                                onChange={(event) => setInventoryDrafts((previous) => ({
                                  ...previous,
                                  [variant.id]: { ...values, reason: event.target.value },
                                }))}
                              />
                            </label>
                            <Button type="submit" variant="secondary" loading={inventoryBusyVariantId === variant.id}>
                              Update stock
                            </Button>
                          </form>
                        );
                      })}
                      <details
                        className="wb-inventory-history"
                        onToggle={(event) => {
                          if (event.currentTarget.open) void loadInventoryHistory(product.id);
                        }}
                      >
                        <summary>Inventory change history</summary>
                        {history?.loading && <p>Loading inventory history…</p>}
                        {history?.error && <p role="alert">{history.error}</p>}
                        {history?.adjustments?.length === 0 && (
                          <p>No inventory adjustments have been recorded.</p>
                        )}
                        {history?.adjustments && (
                          <ol>
                            {history.adjustments.map((adjustment) => (
                              <li key={adjustment.id}>
                                <strong>{adjustment.variant_label}</strong>
                                <span>
                                  {adjustment.previous_stock_quantity} → {adjustment.new_stock_quantity} in stock
                                  {" · "}threshold {adjustment.previous_low_stock_threshold} → {adjustment.new_low_stock_threshold}
                                </span>
                                <span>By {adjustment.actor?.email ?? "Former account"}</span>
                                <time dateTime={adjustment.created_at}>
                                  {new Intl.DateTimeFormat("en-NG", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(adjustment.created_at))}
                                </time>
                                <p>{adjustment.reason}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </details>
                    </section>
                    <div className="wb-product-actions">
                      {product.status !== "pending" && product.status !== "archived" && (
                        <>
                          <Button variant="secondary" onClick={() => editProduct(product)}>Edit</Button>
                          <Button
                            loading={busyId === product.id}
                            onClick={() => submitForReview(product)}
                          >
                            Submit for review
                          </Button>
                        </>
                      )}
                      {product.status !== "pending" && (
                        <Button variant="secondary" loading={busyId === product.id} onClick={() => removeProduct(product)}>
                          {product.status === "approved" ? "Unpublish" : "Remove"}
                        </Button>
                      )}
                    </div>
                  </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
