'use client';

import { ArrowLeft, Boxes, Calendar, Pencil, ShoppingBag, Tag } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { absoluteMediaUrl, adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';

type StoreProductDetail = {
  id: string;
  name: string;
  sku?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  price: number;
  stockQuantity: number;
  minimumStock?: number | null;
  mainImageUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  brand: { id: string; name: string; code: string; isActive: boolean };
  createdAt: string;
  updatedAt: string;
};

export default function ProductoPerfilPage() {
  const params = useParams<{ productoId: string }>();
  const productId = params.productoId;
  const canEdit = hasPermission(getStoredAdminUser()?.permissions, 'store_products.edit');
  const [product, setProduct] = useState<StoreProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadProduct();
  }, [productId]);

  async function loadProduct() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<StoreProductDetail>(`/admin/store/products/${productId}`);
      setProduct(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el producto.') });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a productos" className="customer-back-button" href="/tienda-online/productos">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Perfil del producto</h2>
              <p>Consulta precio, stock, marca e imagen del producto.</p>
            </div>
          </div>
          {product && canEdit ? (
            <div className="customer-profile-actions">
              <a className="admin-primary" href={`/tienda-online/productos/${product.id}/editar`}><Pencil size={16} /> Editar producto</a>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando producto...</div> : null}

        {product ? (
          <>
            <section className="customer-profile-hero">
              <div className="customer-avatar-large">
                {product.mainImageUrl ? <img alt="" src={absoluteMediaUrl(product.mainImageUrl)} /> : <ShoppingBag size={64} />}
              </div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>{product.name}</h3>
                  <span className={product.isActive ? 'badge green' : 'badge red'}>{product.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                  {product.isFeatured ? <span className="loyalty-level-badge gold">Destacado</span> : null}
                </div>
                <p className="customer-code-line"><Tag size={14} /> {product.brand.name} {product.sku ? `· ${product.sku}` : ''}</p>
                <div className="customer-profile-info-grid">
                  <span>Q{formatMoney(product.price)}</span>
                  <span><Boxes size={16} /> Stock {formatNumber(product.stockQuantity)}</span>
                  <span><Calendar size={16} /> Creado el {formatDate(product.createdAt)}</span>
                  <span><Calendar size={16} /> Actualizado el {formatDate(product.updatedAt)}</span>
                </div>
              </div>
            </section>

            <section className="customer-history-layout">
              <article className="customer-history-panel">
                <h3>Descripcion</h3>
                <p className="muted-copy">{product.shortDescription || product.fullDescription || 'Este producto no tiene descripcion configurada.'}</p>
              </article>
            </section>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}
