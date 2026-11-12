"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  formatProductPrice,
  isProductListing,
  isRecord,
  ProductListing,
  productError,
} from "@webubble/api-client/products";
import GlobalProductSearch from "../../GlobalProductSearch";

export default function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<ProductListing | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!/^\d+$/.test(productId)) {
      setError("This product could not be found.");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetch(`/api/catalogue/products/${productId}`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(productError(payload, "Unable to load this product."));
        if (!isRecord(payload) || !isRecord(payload.data) || !isProductListing(payload.data.product)) {
          throw new Error("The server returned an invalid product.");
        }
        if (active) {
          const item = payload.data.product;
          setProduct(item);
          setSelectedVariantId(
            item.variants.find((variant) => variant.is_available)?.id ?? item.variants[0]?.id ?? null,
          );
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load this product.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) return <main className="wb-product-detail" aria-live="polite">Loading product details…</main>;
  if (error || !product) {
    return (
      <main className="wb-product-detail">
        <Link className="wb-text-link" href="/products">← Back to products</Link>
        <p className="wb-catalogue-error" role="alert">{error || "This product could not be found."}</p>
      </main>
    );
  }

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? null;

  return (
    <main className="wb-product-detail">
      <header className="wb-product-detail__header">
        <Link className="wb-wordmark" href="/" aria-label="Webubble home">
          <Image className="wb-wordmark__image" src="/webubble_logo.jpg" alt="" width={32} height={32} priority />
          webubble
        </Link>
        <GlobalProductSearch />
        <Link className="wb-text-link" href="/products">← All products</Link>
      </header>
      <article className="wb-product-detail__layout">
        <div className="wb-product-detail__media">
          {product.media[0] ? (
            <Image
              src={`/api/catalogue/products/${product.id}/media/${product.media[0].id}`}
              alt={product.name}
              width={1000}
              height={760}
              unoptimized
              priority
            />
          ) : (
            <div aria-hidden="true">🧺</div>
          )}
        </div>
        <section className="wb-product-detail__content">
          <p className="wb-product-eyebrow">{product.category.name}</p>
          <h1>{product.name}</h1>
          <p className="wb-product-detail__price">{formatProductPrice(product.price_minor)}</p>
          <p className="wb-product-detail__description">{product.description}</p>
          {product.variants.length > 0 && (
            <fieldset className="wb-product-detail__variants">
              <legend>Choose an option</legend>
              {product.variants.map((variant) => (
                <label key={variant.id} className={!variant.is_available ? "wb-product-detail__variant--unavailable" : ""}>
                  <input
                    type="radio"
                    name="product-variant"
                    value={variant.id}
                    checked={selectedVariantId === variant.id}
                    disabled={!variant.is_available}
                    onChange={() => setSelectedVariantId(variant.id)}
                  />
                  <span>{variant.label}</span>
                  <span>{variant.is_available ? "Available" : "Out of stock"}</span>
                </label>
              ))}
            </fieldset>
          )}
          {selectedVariant && (
            <p className="wb-product-detail__availability" role="status">
              {selectedVariant.is_available
                ? `${selectedVariant.label} is available.`
                : `${selectedVariant.label} is currently out of stock.`}
            </p>
          )}
          <p className="wb-product-detail__seller">
            Sold by {product.seller_name}
            {product.seller_cac_verified && <span className="wb-cac-badge">CAC verified</span>}
          </p>
          {Object.keys(product.attributes).length > 0 && (
            <dl className="wb-product-detail__attributes">
              {Object.entries(product.attributes).map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          <p className="wb-product-detail__notice">
            Ordering is not available yet. No payment or purchase will be taken here.
          </p>
        </section>
      </article>
    </main>
  );
}
