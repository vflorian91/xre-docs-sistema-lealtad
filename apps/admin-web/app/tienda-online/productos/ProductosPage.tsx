'use client';

import { Eye, Pencil, Search, ShoppingBag } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { formatMoney, formatNumber } from '../../lib/format';
import { hasPermission } from '../../lib/permissions';

type StoreProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  brand: { id: string; name: string; code: string; isActive: boolean };
};

type StoreBrandOption = { id: string; name: string; code: string };

type ProductFilters = {
  name: string;
  brandId: string;
  status: '' | 'true' | 'false';
};

const initialFilters: ProductFilters = { name: '', brandId: '', status: '' };

function buildQuery(filters: ProductFilters) {
  const params = new URLSearchParams();
  if (filters.name.trim()) params.set('name', filters.name.trim());
  if (filters.brandId) params.set('brandId', filters.brandId);
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

export default function ProductosPage() {
  const permissions = getStoredAdminUser()?.permissions;
  const canCreate = hasPermission(permissions, 'store_products.create');
  const canEdit = hasPermission(permissions, 'store_products.edit');
  const [products, setProducts] = useState<StoreProductRow[]>([]);
  const [brands, setBrands] = useState<StoreBrandOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(initialFilters);

  useEffect(() => {
    adminApiRequest<StoreBrandOption[]>('/admin/store/brands')
      .then((result) => setBrands(result))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadProducts(appliedFilters);
  }, [appliedFilters]);

  async function loadProducts(nextFilters: ProductFilters) {
    setIsLoading(true);
    setMessage(null);

    try {
      const query = buildQuery(nextFilters);
      const result = await adminApiRequest<StoreProductRow[]>(`/admin/store/products${query ? `?${query}` : ''}`);
      setProducts(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los productos.') });
    } finally {
      setIsLoading(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><ShoppingBag size={24} /> Productos de tienda online</h2></div>
          {canCreate ? <a className="admin-primary customer-action-button" href="/tienda-online/productos/nuevo">Nuevo producto</a> : null}
        </div>

        <form className="customer-table-toolbar store-product-filter-toolbar" onSubmit={submitFilters}>
          <label className="customer-filter-field">
            <span>Producto</span>
            <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} placeholder="Buscar producto" />
          </label>
          <label className="customer-filter-field">
            <span>Marca</span>
            <select value={filters.brandId} onChange={(event) => setFilters({ ...filters, brandId: event.target.value })}>
              <option value="">Todas las marcas</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as ProductFilters['status'] })}>
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </label>
          <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        <table className="customer-records-table store-product-records-table">
          <colgroup>
            <col className="store-product-col-product" />
            <col className="store-product-col-brand" />
            <col className="store-product-col-price" />
            <col className="store-product-col-stock" />
            <col className="store-product-col-status" />
            <col className="store-product-col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th className="numeric-cell">Precio</th>
              <th className="numeric-cell">Stock</th>
              <th className="status-cell">Estado</th>
              <th className="actions-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><span className="table-main-text">{product.name}</span></td>
                <td>{product.brand.name}</td>
                <td className="numeric-cell">Q{formatMoney(product.price)}</td>
                <td className="numeric-cell">{formatNumber(product.stockQuantity)}</td>
                <td className="status-cell"><span className={product.isActive ? 'badge green' : 'badge red'}>{product.isActive ? 'Activo' : 'Inactivo'}</span></td>
                <td className="actions-cell">
                  <div className="customer-actions">
                    <a aria-label={`Ver producto ${product.name}`} className="customer-icon-action" href={`/tienda-online/productos/${product.id}`}><Eye size={16} /></a>
                    {canEdit ? <a aria-label={`Editar producto ${product.name}`} className="customer-icon-action" href={`/tienda-online/productos/${product.id}/editar`}><Pencil size={16} /></a> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && products.length === 0 ? <tr><td colSpan={6}>No hay productos con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={6}>Cargando productos...</td></tr> : null}
          </tbody>
        </table>
      </article>
    </AdminRoutedShell>
  );
}
