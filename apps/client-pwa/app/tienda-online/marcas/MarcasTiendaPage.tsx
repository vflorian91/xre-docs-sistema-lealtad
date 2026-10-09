'use client';

import { ArrowLeft, ImageOff, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { absoluteStoreMediaUrl, clientStoreApiRequest, getErrorText } from '../lib/clientStoreApi';

type StoreBrand = {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  isFeatured?: boolean;
};

export default function MarcasTiendaPage() {
  const [brands, setBrands] = useState<StoreBrand[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadBrands();
  }, []);

  async function loadBrands() {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await clientStoreApiRequest<StoreBrand[]>('/pwa-client/store/brands');
      setBrands(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las marcas.') });
    } finally {
      setIsLoading(false);
    }
  }

  const visibleBrands = useMemo(() => {
    const term = search.trim().toLowerCase();
    return brands.filter((brand) => !term || brand.name.toLowerCase().includes(term) || brand.code.toLowerCase().includes(term));
  }, [brands, search]);

  return (
    <div className="store-screen">
      <header className="store-header">
        <a aria-label="Volver a inicio" className="store-back-link" href="/">
          <ArrowLeft size={18} />
        </a>
        <h1>Marcas</h1>
      </header>

      <main className="store-content">
        {message ? <div className="store-message error">{message.text}</div> : null}

        <label className="store-search store-brand-search">
          <Search size={20} />
          <input aria-label="Buscar marca" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar marca..." value={search} />
        </label>

        {isLoading ? <div className="store-loading">Cargando marcas...</div> : null}

        {!isLoading && visibleBrands.length === 0 ? (
          <div className="store-empty-state">
            <Search size={32} />
            <p>No encontramos marcas con esa búsqueda.</p>
          </div>
        ) : null}

        <div className="store-brand-list">
          {visibleBrands.map((brand) => {
            const logoUrl = absoluteStoreMediaUrl(brand.logoUrl);
            return (
              <a className="store-brand-list-item" href={`/tienda-online?marca=${encodeURIComponent(brand.id)}`} key={brand.id}>
                <span className="store-brand-list-logo">
                  {logoUrl ? <img alt={brand.name} src={logoUrl} /> : <ImageOff size={22} />}
                </span>
                <span>
                  <strong>{brand.name}</strong>
                  <small>{brand.isFeatured ? 'Marca destacada' : 'Ver productos'}</small>
                </span>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
