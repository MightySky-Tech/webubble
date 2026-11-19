"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  formatProductPrice,
  isDemoProductListing,
  isProductListing,
  isRecord,
  ProductListing,
  productError,
} from "@webubble/api-client/products";
import GlobalProductSearch from "../../GlobalProductSearch";
import { addToCart } from "@/lib/cart";

function AddToCartForm({ product, selectedVariantId }: { product: ProductListing; selectedVariantId: number | null }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const isOutOfStock = !selectedVariant?.is_available;

  const handleAddToCart = async () => {
    if (!selectedVariant || isOutOfStock) return;

    try {
      setLoading(true);
      setMessage(null);

      addToCart(window.localStorage, product, selectedVariant, quantity);
      setMessage({ type: "success", text: `${product.name} added to cart!` });
      setQuantity(1);

      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to add to cart. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    handleAddToCart();
    setTimeout(() => {
      router.push("/cart");
    }, 500);
  };

  return (
    <div className="wb-add-to-cart">
      {message && (
        <div className={`wb-add-to-cart__message wb-add-to-cart__message--${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <div className="wb-add-to-cart__quantity">
        <label htmlFor="quantity">Quantity:</label>
        <div className="wb-quantity-selector">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isOutOfStock}
            aria-label="Quantity"
          />
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            disabled={isOutOfStock}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="wb-add-to-cart__actions">
        <button
          className="wb-add-to-cart__button wb-add-to-cart__button--primary"
          onClick={handleAddToCart}
          disabled={loading || isOutOfStock}
          aria-label={`Add ${quantity} ${product.name} to cart`}
        >
          {loading ? "Adding..." : "Add to Cart"}
        </button>
        <button
          className="wb-add-to-cart__button wb-add-to-cart__button--checkout"
          onClick={handleCheckout}
          disabled={loading || isOutOfStock}
          aria-label={`Add ${quantity} ${product.name} to cart and proceed to checkout`}
        >
          {loading ? "Processing..." : "Add & Checkout"}
        </button>
      </div>

      {isOutOfStock && (
        <p className="wb-add-to-cart__notice" role="alert">
          This variant is currently out of stock.
        </p>
      )}
    </div>
  );
}

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
          {isDemoProductListing(product) && (
            <p className="wb-demo-badge" role="note">DEMO ONLY · fictional test data · not for sale</p>
          )}
          {Object.keys(product.attributes).length > 0 && (
            <dl className="wb-product-detail__attributes">
              {Object.entries(product.attributes).map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          <AddToCartForm product={product} selectedVariantId={selectedVariantId} />
        </section>
      </article>
    </main>
  );
}
