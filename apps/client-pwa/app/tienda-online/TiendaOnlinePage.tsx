'use client';

import { ClipboardList, ImageOff, Search, ShoppingBag, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { absoluteStoreMediaUrl, clientStoreApiRequest, formatStoreMoney, getErrorText } from './lib/clientStoreApi';

type StoreBrand = { id: string; name: string; code: string; logoUrl?: string | null; isFeatured?: boolean };
type StoreProduct = {
  id: string;
  name: string;
  price: number;
  basePrice?: number;
  mainImageUrl?: string | null;
  stockQuantity: number;
  hasVariants?: boolean;
  productType?: string | null;
  genderTarget?: string | null;
  variants?: Array<{ isActive: boolean; productType?: string | null; genderTarget?: string | null }>;
  brand: { id: string; name: string; code: string };
};
type Cart = { items: Array<{ quantity: number }> };

const PRODUCT_TYPE_OPTIONS: Array<[string, string]> = [
  ['DEPORTIVO', 'Deportivo'], ['CASUAL', 'Casual'], ['FORMAL', 'Formal'], ['RUNNING', 'Running'],
  ['URBANO', 'Urbano'], ['ROPA', 'Ropa'], ['ACCESORIO', 'Accesorio'], ['OTRO', 'Otro'],
];
const GENDER_TARGET_OPTIONS: Array<[string, string]> = [
  ['HOMBRE', 'Hombre'], ['MUJER', 'Mujer'], ['NINO', 'Niño'], ['NINA', 'Niña'], ['UNISEX', 'Unisex'],
];

export default function TiendaOnlinePage() {
  const [brands, setBrands] = useState<StoreBrand[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const brandId = params.get('marca') ?? params.get('brand') ?? '';
    const query = params.get('q') ?? params.get('busqueda') ?? '';
    if (brandId) {
      setSelectedBrandId(brandId);
    }
    if (query) setSearch(query);
    void loadStore();
  }, []);

  async function loadStore() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [brandsResult, productsResult, cartResult] = await Promise.all([
        clientStoreApiRequest<StoreBrand[]>('/pwa-client/store/brands'),
        clientStoreApiRequest<StoreProduct[]>('/pwa-client/store/products'),
        clientStoreApiRequest<Cart>('/pwa-client/store/cart').catch(() => ({ items: [] })),
      ]);
      setBrands(brandsResult);
      setProducts(productsResult);
      setCartCount(cartResult.items.reduce((sum, item) => sum + item.quantity, 0));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la tienda. Inicia sesion para continuar.') });
    } finally {
      setIsLoading(false);
    }
  }

  // Inicio: solo marcas destacadas (máx 5). "Ver todas" navega a /tienda-online/marcas.
  const visibleBrands = useMemo(() => {
    const featured = brands.filter((brand) => brand.isFeatured).slice(0, 5);
    return featured.length > 0 ? featured : brands.slice(0, 5);
  }, [brands]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesBrand = !selectedBrandId || product.brand.id === selectedBrandId;
      const matchesSearch = !term || product.name.toLowerCase().includes(term) || product.brand.name.toLowerCase().includes(term);
      const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive);
      const matchesType = !filterType || product.productType === filterType || activeVariants.some((variant) => variant.productType === filterType);
      const matchesGender = !filterGender || product.genderTarget === filterGender || activeVariants.some((variant) => variant.genderTarget === filterGender);
      return matchesBrand && matchesSearch && matchesType && matchesGender;
    });
  }, [products, search, selectedBrandId, filterType, filterGender]);

  const activeFilterCount = (filterType ? 1 : 0) + (filterGender ? 1 : 0);

  async function addToCart(productId: string) {
    setAddingProductId(productId);
    setMessage(null);
    try {
      const cart = await clientStoreApiRequest<Cart>('/pwa-client/store/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
      setMessage({ type: 'success', text: 'Producto agregado al carrito.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo agregar el producto al carrito.') });
    } finally {
      setAddingProductId(null);
    }
  }

  return (
    <div className="store-screen">
      <header className="store-header">
        <h1>Tienda</h1>
        <a aria-label="Ver mis pedidos" className="store-back-link" href="/tienda-online/mis-pedidos">
          <ClipboardList size={18} />
        </a>
        <a aria-label="Ver carrito" className="store-cart-link" href="/tienda-online/carrito">
          <ShoppingCart size={18} />
          {cartCount > 0 ? <span className="store-cart-badge">{cartCount}</span> : null}
        </a>
      </header>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}

        <div className="store-search-row">
          <div className="store-search">
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto..." value={search} />
          </div>
          <button className={`store-filter-button${activeFilterCount > 0 ? ' is-active' : ''}`} onClick={() => setShowFilters(true)} type="button">
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 ? <span className="store-filter-badge">{activeFilterCount}</span> : null}
          </button>
        </div>

        <div className="store-brand-filter">
          <button className={`store-brand-chip${selectedBrandId === '' ? ' is-active' : ''}`} onClick={() => { window.location.href = '/tienda-online'; }} type="button">
            Todas
          </button>
          {visibleBrands.map((brand) => (
            <button
              className={`store-brand-chip${selectedBrandId === brand.id ? ' is-active' : ''}`}
              key={brand.id}
              onClick={() => { window.location.href = `/tienda-online?marca=${encodeURIComponent(brand.id)}`; }}
              type="button"
            >
              {brand.name}
            </button>
          ))}
          <button className="store-brand-chip is-ghost" onClick={() => { window.location.href = '/tienda-online/marcas'; }} type="button">
            Ver todas ({brands.length})
          </button>
        </div>

        {isLoading ? <div className="store-loading">Cargando productos...</div> : null}

        {!isLoading && filteredProducts.length === 0 ? (
          <div className="store-empty-state">
            <Search size={32} />
            <p>No encontramos productos con esos filtros.</p>
          </div>
        ) : null}

        <div className="store-product-grid">
          {filteredProducts.map((product) => {
            const imageUrl = absoluteStoreMediaUrl(product.mainImageUrl);
            const isAvailable = product.stockQuantity > 0;
            return (
              <article className="store-product-card" key={product.id}>
                <a href={`/tienda-online/producto/${product.id}`}>
                  <div className="store-product-image">
                    {imageUrl ? <img alt={product.name} src={imageUrl} /> : <ImageOff size={24} />}
                  </div>
                  <span className="store-brand-label">{product.brand.name}</span>
                  <p className="store-product-name">{product.name}</p>
                  <span className="store-price">{product.hasVariants ? 'Desde ' : ''}Q{formatStoreMoney(product.price)}</span>
                  <span className={`store-availability${isAvailable ? '' : ' is-unavailable'}`}>
                    {isAvailable ? 'Disponible' : 'No disponible'}
                  </span>
                </a>
                <button
                  className="store-add-button"
                  disabled={!isAvailable || addingProductId === product.id}
                  onClick={() => {
                    if (product.hasVariants) {
                      window.location.href = `/tienda-online/producto/${product.id}`;
                      return;
                    }
                    void addToCart(product.id);
                  }}
                  type="button"
                >
                  <ShoppingBag size={14} /> {product.hasVariants ? 'Elegir' : addingProductId === product.id ? 'Agregando...' : 'Agregar'}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {showFilters ? (
        <div className="store-modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="store-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Filtros</h2>
            <label className="store-form-field">
              Tipo
              <select onChange={(event) => setFilterType(event.target.value)} value={filterType}>
                <option value="">Todos</option>
                {PRODUCT_TYPE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <label className="store-form-field">
              Género
              <select onChange={(event) => setFilterGender(event.target.value)} value={filterGender}>
                <option value="">Todos</option>
                {GENDER_TARGET_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <div className="store-modal-actions">
              <button className="store-button-secondary" onClick={() => { setFilterType(''); setFilterGender(''); }} type="button">Limpiar</button>
              <button className="store-button-primary" onClick={() => setShowFilters(false)} type="button">Aplicar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
