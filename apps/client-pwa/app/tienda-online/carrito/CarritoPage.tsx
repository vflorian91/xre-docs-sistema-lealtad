'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import BrandCartGroup from '../components/BrandCartGroup';
import CartSummaryBar from '../components/CartSummaryBar';
import {
  clientStoreApiRequest,
  getCart,
  getErrorText,
  StoreBrandGroup,
  StoreCart,
} from '../lib/clientStoreApi';

// Fallback: si por algún motivo no llega brandGroups, agrupamos los items planos en cliente.
function buildBrandGroupsFallback(cart: StoreCart): StoreBrandGroup[] {
  const map = new Map<string, StoreBrandGroup>();
  for (const item of cart.items) {
    const brandId = item.brandId ?? 'SIN_MARCA';
    let group = map.get(brandId);
    if (!group) {
      group = { brandId, brandName: item.brandName ?? 'Sin marca', brandLogoUrl: item.brandLogoUrl ?? null, items: [], subtotal: 0, totalItems: 0 };
      map.set(brandId, group);
    }
    group.items.push(item);
    group.subtotal += item.subtotal;
    group.totalItems += item.quantity;
  }
  return [...map.values()];
}

export default function CarritoPage() {
  const router = useRouter();
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    void loadCart(true);
  }, []);

  const brandGroups = useMemo<StoreBrandGroup[]>(() => {
    if (!cart) return [];
    return cart.brandGroups && cart.brandGroups.length > 0 ? cart.brandGroups : buildBrandGroupsFallback(cart);
  }, [cart]);

  async function loadCart(selectAll = false) {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await getCart();
      setCart(result);
      const groups = result.brandGroups && result.brandGroups.length > 0 ? result.brandGroups : buildBrandGroupsFallback(result);
      setSelectedBrandIds((prev) => {
        if (selectAll) return groups.map((g) => g.brandId);
        // Conservar selección válida tras recargar.
        const valid = new Set(groups.map((g) => g.brandId));
        const kept = prev.filter((id) => valid.has(id));
        return kept.length > 0 ? kept : groups.map((g) => g.brandId);
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar tu carrito.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setBusyItemId(itemId);
    setMessage(null);
    try {
      const result = await clientStoreApiRequest<StoreCart>(`/pwa-client/store/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      setCart(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo actualizar la cantidad.') });
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    setBusyItemId(itemId);
    setMessage(null);
    try {
      const result = await clientStoreApiRequest<StoreCart>(`/pwa-client/store/cart/items/${itemId}`, { method: 'DELETE' });
      setCart(result);
      setMessage({ type: 'success', text: 'Producto eliminado del carrito.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo eliminar el producto.') });
    } finally {
      setBusyItemId(null);
    }
  }

  function toggleBrand(brandId: string) {
    setSelectedBrandIds((prev) => (prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]));
  }

  function selectAll() {
    setSelectedBrandIds(brandGroups.map((g) => g.brandId));
  }

  function deselectAll() {
    setSelectedBrandIds([]);
  }

  const selectedGroups = brandGroups.filter((g) => selectedBrandIds.includes(g.brandId));
  const selectedTotal = selectedGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const selectedProducts = selectedGroups.reduce((sum, g) => sum + g.totalItems, 0);
  const allSelected = brandGroups.length > 0 && selectedBrandIds.length === brandGroups.length;

  function handleContinue() {
    if (selectedBrandIds.length === 0) return;
    setContinuing(true);
    const query = encodeURIComponent(selectedBrandIds.join(','));
    router.push(`/tienda-online/checkout/resumen?brands=${query}`);
  }

  const isEmpty = !isLoading && (!cart || cart.items.length === 0);

  return (
    <div className="store-screen">
      <header className="store-header">
        <a aria-label="Volver a tienda" className="store-back-link" href="/tienda-online">
          <ArrowLeft size={18} />
        </a>
        <h1>Mi carrito</h1>
      </header>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="store-loading">Cargando carrito...</div> : null}

        {isEmpty ? (
          <div className="store-empty-state">
            <p>Tu carrito está vacío.</p>
            <p>Agrega productos desde la tienda para solicitar tu pedido.</p>
            <a className="store-button-secondary" href="/tienda-online">Ir a tienda</a>
          </div>
        ) : null}

        {!isEmpty && cart ? (
          <>
            <div className="store-brand-toolbar">
              <button className="store-link-button" onClick={selectAll} type="button" disabled={allSelected}>Seleccionar todas</button>
              <button className="store-link-button" onClick={deselectAll} type="button" disabled={selectedBrandIds.length === 0}>Quitar selección</button>
            </div>

            {brandGroups.map((group) => (
              <BrandCartGroup
                busyItemId={busyItemId}
                group={group}
                key={group.brandId}
                onQuantityChange={updateQuantity}
                onRemove={removeItem}
                onToggle={toggleBrand}
                selected={selectedBrandIds.includes(group.brandId)}
              />
            ))}

            <CartSummaryBar
              disabled={selectedBrandIds.length === 0}
              loading={continuing}
              onContinue={handleContinue}
              selectedBrands={selectedGroups.length}
              selectedProducts={selectedProducts}
              total={selectedTotal}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
