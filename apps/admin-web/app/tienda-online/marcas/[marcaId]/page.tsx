'use client';

import { ArrowLeft, Calendar, Globe, Pencil, ShoppingBag, Tag } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { absoluteMediaUrl, adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { formatDate, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';

type StoreBrandDetail = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isActive: boolean;
  activeProductsCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function MarcaPerfilPage() {
  const params = useParams<{ marcaId: string }>();
  const brandId = params.marcaId;
  const canEdit = hasPermission(getStoredAdminUser()?.permissions, 'store_brands.edit');
  const [brand, setBrand] = useState<StoreBrandDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadBrand();
  }, [brandId]);

  async function loadBrand() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<StoreBrandDetail>(`/admin/store/brands/${brandId}`);
      setBrand(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la marca.') });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a marcas" className="customer-back-button" href="/tienda-online/marcas">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Perfil de la marca</h2>
              <p>Consulta informacion, logo y productos asociados.</p>
            </div>
          </div>
          {brand && canEdit ? (
            <div className="customer-profile-actions">
              <a className="admin-primary" href={`/tienda-online/marcas/${brand.id}/editar`}><Pencil size={16} /> Editar marca</a>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando marca...</div> : null}

        {brand ? (
          <>
            <section className="customer-profile-hero">
              <div className="customer-avatar-large">
                {brand.logoUrl ? <img alt="" src={absoluteMediaUrl(brand.logoUrl)} /> : <Tag size={64} />}
              </div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>{brand.name}</h3>
                  <span className={brand.isActive ? 'badge green' : 'badge red'}>{brand.isActive ? 'ACTIVA' : 'INACTIVA'}</span>
                </div>
                <p className="customer-code-line"><strong>{brand.code}</strong></p>
                <div className="customer-profile-info-grid">
                  <span><ShoppingBag size={16} /> {formatNumber(brand.activeProductsCount)} productos</span>
                  {brand.websiteUrl ? <span><Globe size={16} /> {brand.websiteUrl}</span> : null}
                  <span><Calendar size={16} /> Creada el {formatDate(brand.createdAt)}</span>
                  <span><Calendar size={16} /> Actualizada el {formatDate(brand.updatedAt)}</span>
                </div>
              </div>
            </section>

            <section className="customer-history-layout">
              <article className="customer-history-panel">
                <h3>Descripcion</h3>
                <p className="muted-copy">{brand.description || 'Esta marca no tiene descripcion configurada.'}</p>
              </article>
            </section>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}
