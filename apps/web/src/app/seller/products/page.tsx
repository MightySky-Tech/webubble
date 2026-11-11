"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@webubble/ui";
import {
  isProductCategory,
  isRecord,
  isSellerProduct,
  productError,
  formatProductPrice,
  ProductCategory,
  SellerProduct,
} from "@webubble/api-client/products";

type ProductDraft = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  attributes: string;
};

const emptyDraft: ProductDraft = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  attributes: "",
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
    });
    setImages([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setNotice("");
    setError("");
  }

  function resetForm(): void {
    setEditingId(null);
    setDraft({ ...emptyDraft, categoryId: categories[0] ? String(categories[0].id) : "" });
    setImages([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setNotice("");
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
              {products.map((product) => (
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
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
