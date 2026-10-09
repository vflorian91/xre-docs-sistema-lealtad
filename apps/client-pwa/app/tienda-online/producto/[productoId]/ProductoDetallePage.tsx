'use client';

import { Heart, ImageOff, Share2, ShoppingBag } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { absoluteStoreMediaUrl, clientStoreApiRequest, formatStoreMoney, getErrorText } from '../../lib/clientStoreApi';

type Variant = {
  id: string;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  price: number;
  promotionalPrice?: number | null;
  effectivePrice: number;
  stockQuantity: number;
  isActive: boolean;
};

type StoreProductDetail = {
  id: string;
  name: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  price: number;
  basePrice?: number;
  stockQuantity: number;
  hasVariants?: boolean;
  variants?: Variant[];
  mainImageUrl?: string | null;
  brand: { id: string; name: string };
};

export default function ProductoDetallePage() {
  const params = useParams<{ productoId: string }>();
  const productId = params.productoId;
  const [product, setProduct] = useState<StoreProductDetail | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadProduct() {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await clientStoreApiRequest<StoreProductDetail>(`/pwa-client/store/products/${productId}`);
      setProduct(result);
      setSelectedColor(null);
      setSelectedSize(null);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el producto.') });
    } finally {
      setIsLoading(false);
    }
  }

  const activeVariants = useMemo(() => (product?.variants ?? []).filter((v) => v.isActive), [product]);
  const hasColors = activeVariants.some((v) => v.color);
  const hasSizes = activeVariants.some((v) => v.size);

  // Colores únicos con imagen/precio representativos.
  const colors = useMemo(() => {
    const map = new Map<string, { color: string; image?: string | null; price: number; regularPrice: number; available: boolean; hasDiscount: boolean }>();
    for (const v of activeVariants) {
      if (!v.color) continue;
      const existing = map.get(v.color);
      const available = v.stockQuantity > 0;
      if (!existing) {
        map.set(v.color, { color: v.color, image: v.imageUrl, price: v.effectivePrice, regularPrice: v.price, available, hasDiscount: Boolean(v.promotionalPrice) });
      } else {
        existing.price = Math.min(existing.price, v.effectivePrice);
        existing.regularPrice = Math.min(existing.regularPrice, v.price);
        existing.hasDiscount = existing.hasDiscount || Boolean(v.promotionalPrice);
        existing.available = existing.available || available;
        if (!existing.image && v.imageUrl) existing.image = v.imageUrl;
      }
    }
    return [...map.values()];
  }, [activeVariants]);

  // Tallas disponibles para el color seleccionado (solo las que existen; deshabilita sin stock).
  const sizes = useMemo(() => {
    const relevant = activeVariants.filter((v) => !hasColors || v.color === selectedColor);
    const map = new Map<string, { size: string; available: boolean }>();
    for (const v of relevant) {
      if (!v.size) continue;
      const existing = map.get(v.size);
      const available = v.stockQuantity > 0;
      if (!existing) map.set(v.size, { size: v.size, available });
      else existing.available = existing.available || available;
    }
    return [...map.values()];
  }, [activeVariants, hasColors, selectedColor]);

  const selectedVariant = activeVariants.find(
    (v) => (!hasColors || v.color === selectedColor) && (!hasSizes || v.size === selectedSize),
  );

  const colorImage = colors.find((c) => c.color === selectedColor)?.image;
  const displayImage = absoluteStoreMediaUrl(selectedVariant?.imageUrl ?? colorImage ?? product?.mainImageUrl);
  const currentStock = selectedVariant?.stockQuantity ?? (product?.hasVariants ? 0 : product?.stockQuantity ?? 0);
  const currentPrice = selectedVariant?.effectivePrice ?? colors.find((c) => c.color === selectedColor)?.price ?? product?.basePrice ?? product?.price ?? 0;
  const needsVariant = Boolean(product?.hasVariants);
  const isAvailable = currentStock > 0 && (!needsVariant || Boolean(selectedVariant));
  const availabilityText = needsVariant && !selectedVariant ? 'Selecciona una variante' : isAvailable ? 'Disponible' : 'No disponible';
  const isVariantLayout = Boolean(product?.hasVariants && (colors.length || sizes.length));
  const carouselDots = Math.max(3, Math.min(5, colors.length || 3));

  function pickColor(color: string) {
    setSelectedColor(color);
    setQuantity(1);
    // Si la talla actual no existe en ese color, intenta elegir la primera disponible.
    const sizesForColor = activeVariants.filter((v) => v.color === color && v.size);
    if (hasSizes && !sizesForColor.some((v) => v.size === selectedSize)) {
      const firstAvail = sizesForColor.find((v) => v.stockQuantity > 0) ?? sizesForColor[0];
      setSelectedSize(firstAvail?.size ?? null);
    }
  }

  async function addToCart() {
    if (!product) return;
    if (needsVariant && !selectedVariant) {
      setMessage({ type: 'error', text: 'Selecciona una variante disponible.' });
      return;
    }
    setIsAdding(true);
    setMessage(null);
    try {
      await clientStoreApiRequest('/pwa-client/store/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, variantId: selectedVariant?.id ?? null, quantity }),
      });
      setMessage({ type: 'success', text: 'Producto agregado al carrito.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo agregar el producto al carrito.') });
    } finally {
      setIsAdding(false);
    }
  }

  async function shareProduct() {
    if (!product) return;
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: product.name, text: product.shortDescription ?? product.name, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setMessage({ type: 'success', text: 'Enlace copiado.' });
  }

  return (
    <div className={`store-screen${isVariantLayout ? ' store-product-detail-screen' : ''}`}>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="store-loading">Cargando producto...</div> : null}

        {product ? (
          <article className="store-product-detail">
            <section className="store-product-hero">
              <div className="store-product-sales-note">9K+ comprados el último mes</div>
              <div className="store-detail-image">{displayImage ? <img alt={product.name} src={displayImage} /> : <ImageOff size={40} />}</div>
              <div className="store-product-media-actions">
                <div className="store-product-dots" aria-hidden="true">
                  {Array.from({ length: carouselDots }, (_, index) => (
                    <span className={index === 0 ? 'is-active' : ''} key={index} />
                  ))}
                </div>
                <button aria-label="Guardar producto" className="store-product-icon-action" type="button"><Heart size={32} /></button>
                <button aria-label="Compartir producto" className="store-product-icon-action" onClick={shareProduct} type="button"><Share2 size={30} /></button>
              </div>
            </section>

            <section className="store-product-choice-panel">
              <div className="store-product-title-row">
                <div>
                  <span className="store-brand-label">{product.brand.name}</span>
                  <h2>{product.name}</h2>
                </div>
                <div className="store-product-price-stack">
                  <span className="store-price">Q{formatStoreMoney(currentPrice)}</span>
                  {selectedVariant?.promotionalPrice ? <span>Q{formatStoreMoney(selectedVariant.price)}</span> : null}
                </div>
              </div>
              {needsVariant && !selectedVariant ? <p className="store-detail-description muted-copy">Producto principal. Elige una variante para agregarlo al carrito.</p> : null}
              <span className={`store-availability${isAvailable ? '' : ' is-unavailable'}`}>{availabilityText}</span>

              {colors.length > 0 ? (
                <div className="store-color-section">
                  <strong className="store-variant-title">Color: <span>{selectedColor ?? '—'}</span></strong>
                  <div className="store-color-cards">
                    {colors.map((c) => {
                      const img = absoluteStoreMediaUrl(c.image ?? product.mainImageUrl);
                      return (
                        <button
                          className={`store-color-card${selectedColor === c.color ? ' is-active' : ''}${c.available ? '' : ' is-out'}`}
                          key={c.color}
                          onClick={() => pickColor(c.color)}
                          type="button"
                        >
                          <span className="store-color-thumb">{img ? <img alt={c.color} src={img} /> : <ImageOff size={20} />}</span>
                          <span className="store-color-name">{c.color}</span>
                          <span className="store-color-price">Q{formatStoreMoney(c.price)}</span>
                          {c.hasDiscount ? <span className="store-color-regular-price">Q{formatStoreMoney(c.regularPrice)}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {sizes.length > 0 ? (
                <div className="store-size-section">
                  <div className="store-size-title-row">
                    <strong className="store-variant-title">Talla: <span>{selectedSize ?? '—'}</span></strong>
                    <button type="button">Guía de tallas</button>
                  </div>
                  <div className="store-size-chips">
                    {sizes.map((s) => (
                      <button
                        className={`store-size-chip${selectedSize === s.size ? ' is-active' : ''}${s.available ? '' : ' is-out'}`}
                        disabled={!s.available}
                        key={s.size}
                        onClick={() => { setSelectedSize(s.size); setQuantity(1); }}
                        type="button"
                      >
                        {s.size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedVariant?.sku ? <small className="muted-copy">SKU: {selectedVariant.sku}</small> : null}
              {product.shortDescription ? <p className="store-detail-description">{product.shortDescription}</p> : null}
              {product.fullDescription ? <p className="store-detail-description muted-copy">{product.fullDescription}</p> : null}

              {isAvailable ? (
                <div className="store-quantity-selector">
                  <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button">-</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity((value) => Math.min(currentStock, value + 1))} type="button">+</button>
                </div>
              ) : null}

              <button className="store-button-primary" disabled={!isAvailable || isAdding} onClick={addToCart} type="button">
                <ShoppingBag size={16} /> {isAdding ? 'Agregando...' : 'Agregar al carrito'}
              </button>
              <a className="store-button-secondary" href="/tienda-online">Volver a tienda</a>
            </section>
          </article>
        ) : null}
      </div>
    </div>
  );
}
