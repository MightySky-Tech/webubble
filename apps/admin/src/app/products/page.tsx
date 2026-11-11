"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { components } from "@webubble/api-client";
import { Alert, Button, TextField } from "@webubble/ui";
import {
  AdminProduct,
  ProductCategory,
  isAdminProduct,
  isProductCategory,
  isRecord,
  productError,
} from "@webubble/api-client/products";

type ReviewStatus = "approved" | "rejected" | "needs_more_info";
type AdminUser = components["schemas"]["User"];

function isAdminUser(value: unknown): value is AdminUser {
  return isRecord(value)
    && typeof value.id === "number"
    && typeof value.name === "string"
    && typeof value.email === "string"
    && Array.isArray(value.roles)
    && value.roles.includes("admin");
}

export default function ProductModerationPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyProduct, setBusyProduct] = useState<number | null>(null);
  const [busyCategory, setBusyCategory] = useState<number | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData(): Promise<void> {
    setError("");
    const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
    if (authResponse.status === 401) {
      window.location.assign("/sign-in");
      return;
    }
    const authPayload: unknown = await authResponse.json();
    if (!authResponse.ok) throw new Error("Unable to verify administrator access.");
    if (!isRecord(authPayload) || !isRecord(authPayload.data) || !isAdminUser(authPayload.data.user)) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(true);

    const [productResponse, categoryResponse] = await Promise.all([
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/products/categories", { cache: "no-store" }),
    ]);
    const [productPayload, categoryPayload]: [unknown, unknown] = await Promise.all([
      productResponse.json(),
      categoryResponse.json(),
    ]);
    if (!productResponse.ok) throw new Error(productError(productPayload, "Unable to load products for review."));
    if (!categoryResponse.ok) throw new Error(productError(categoryPayload, "Unable to load product categories."));
    if (
      !isRecord(productPayload) || !isRecord(productPayload.data)
      || !Array.isArray(productPayload.data.products)
      || !productPayload.data.products.every(isAdminProduct)
    ) {
      throw new Error("The server returned an invalid product moderation list.");
    }
    if (
      !isRecord(categoryPayload) || !isRecord(categoryPayload.data)
      || !Array.isArray(categoryPayload.data.categories)
      || !categoryPayload.data.categories.every(isProductCategory)
    ) {
      throw new Error("The server returned an invalid product category list.");
    }
    setProducts(productPayload.data.products);
    setCategories(categoryPayload.data.categories);
  }

  useEffect(() => {
    let active = true;
    loadData()
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load product moderation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reviewProduct(product: AdminProduct, status: ReviewStatus): Promise<void> {
    const note = notes[product.id]?.trim() ?? "";
    if (status !== "approved" && note.length < 3) {
      setError("Add a short reason when requesting changes or rejecting a listing.");
      return;
    }

    setBusyProduct(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/products/${product.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Unable to record the product review."));
      setNotice(`“${product.name}” ${status === "approved" ? "was published." : "was returned to the seller."}`);
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record the product review.");
    } finally {
      setBusyProduct(null);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreatingCategory(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Unable to add the product category."));
      setNewCategory("");
      setNotice("Category created inactive. Activate it after confirming it is appropriate for seller listings.");
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add the product category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function setCategoryActive(category: ProductCategory): Promise<void> {
    setBusyCategory(category.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/products/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(productError(payload, "Unable to update the category."));
      setNotice(`${category.name} ${category.is_active ? "deactivated" : "approved for listings"}.`);
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the category.");
    } finally {
      setBusyCategory(null);
    }
  }

  if (loading) return <main className="wb-product-admin" aria-live="polite">Loading product moderation…</main>;
  if (!isAdmin && !error) {
    return <main className="wb-product-admin"><h1>Administrator access required</h1><p>This account does not have the admin role.</p></main>;
  }

  return (
    <main className="wb-product-admin">
      <header className="wb-product-admin__header">
        <div>
          <p className="wb-auth-eyebrow">MARKETPLACE OPERATIONS</p>
          <h1>Product moderation</h1>
          <p>Review seller listings and manage the approved categories. Only approved listings appear in the live storefront.</p>
        </div>
        <nav aria-label="Admin tools">
          <Link href="/">Seller applications</Link>
          <Link href="/catalogue">Concept catalogue</Link>
        </nav>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <p className="wb-product-admin__notice" role="status">{notice}</p>}

      <div className="wb-product-admin__layout">
        <section aria-labelledby="pending-products-title">
          <div className="wb-product-admin__section-heading">
            <div>
              <p className="wb-auth-eyebrow">SELLER SUBMISSIONS</p>
              <h2 id="pending-products-title">Awaiting review</h2>
            </div>
            <span>{products.length}</span>
          </div>
          {products.length === 0 ? (
            <p className="wb-product-admin__empty">No products are waiting for review.</p>
          ) : (
            <ul className="wb-product-admin__list">
              {products.map((product) => (
                <li key={product.id}>
                  <article>
                    <div className="wb-product-admin__product-heading">
                      <div>
                        <p className="wb-auth-eyebrow">{product.category.name}</p>
                        <h3>{product.name}</h3>
                        <p>{product.seller.name} · {product.seller.email}</p>
                      </div>
                      <strong>{product.currency} {(product.price_minor / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <p className="wb-product-admin__description">{product.description}</p>
                    {product.media.length > 0 && (
                      <div className="wb-product-admin__media">
                        {product.media.map((media) => (
                          <Image
                            key={media.id}
                            width={208}
                            height={208}
                            unoptimized
                            src={`/api/products/${product.id}/media/${media.id}`}
                            alt={`${product.name} listing photo`}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                    {Object.keys(product.attributes).length > 0 && (
                      <dl className="wb-product-admin__attributes">
                        {Object.entries(product.attributes).map(([name, value]) => (
                          <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
                        ))}
                      </dl>
                    )}
                    {product.inventory_variants.length > 0 && (
                      <dl className="wb-product-admin__attributes">
                        {product.inventory_variants.map((variant) => (
                          <div key={variant.id}>
                            <dt>{variant.label}</dt>
                            <dd>
                              {variant.stock_quantity} in stock · low-stock alert at {variant.low_stock_threshold}
                              {variant.sku ? ` · SKU ${variant.sku}` : ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <TextField
                      label={`Review note for ${product.name}`}
                      value={notes[product.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [product.id]: event.target.value }))}
                      maxLength={1000}
                    />
                    <div className="wb-admin-actions">
                      <Button loading={busyProduct === product.id} onClick={() => reviewProduct(product, "approved")}>Approve and publish</Button>
                      <Button variant="secondary" loading={busyProduct === product.id} onClick={() => reviewProduct(product, "needs_more_info")}>Request changes</Button>
                      <Button variant="secondary" loading={busyProduct === product.id} onClick={() => reviewProduct(product, "rejected")}>Reject</Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wb-product-admin__categories" aria-labelledby="product-categories-title">
          <p className="wb-auth-eyebrow">SELLER CATEGORIES</p>
          <h2 id="product-categories-title">Approved categories</h2>
          <p>New categories stay inactive until reviewed. Deactivating a category hides its existing listings and blocks new submissions.</p>
          <form onSubmit={addCategory}>
            <TextField
              label="New category name"
              minLength={2}
              maxLength={80}
              required
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
            />
            <Button type="submit" loading={creatingCategory}>Add inactive category</Button>
          </form>
          <ul className="wb-product-admin__category-list">
            {categories.map((category) => (
              <li key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>{category.is_active ? "Approved" : "Inactive"}</span>
                </div>
                <Button
                  variant="secondary"
                  loading={busyCategory === category.id}
                  onClick={() => setCategoryActive(category)}
                >
                  {category.is_active ? "Deactivate" : "Approve"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
