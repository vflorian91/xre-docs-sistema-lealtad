'use client';

import { Eye, Pencil, Search, Tag } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { formatNumber } from '../../lib/format';
import { hasPermission } from '../../lib/permissions';

type StoreBrandRow = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  activeProductsCount: number;
};

type BrandFilters = {
  name: string;
  code: string;
  status: '' | 'true' | 'false';
};

const initialFilters: BrandFilters = { name: '', code: '', status: '' };

function buildQuery(filters: BrandFilters) {
  const params = new URLSearchParams();
  if (filters.name.trim()) params.set('name', filters.name.trim());
  if (filters.code.trim()) params.set('code', filters.code.trim());
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

export default function MarcasPage() {
  const permissions = getStoredAdminUser()?.permissions;
  const canCreate = hasPermission(permissions, 'store_brands.create');
  const canEdit = hasPermission(permissions, 'store_brands.edit');
  const [brands, setBrands] = useState<StoreBrandRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<BrandFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<BrandFilters>(initialFilters);

  useEffect(() => {
    void loadBrands(appliedFilters);
  }, [appliedFilters]);

  async function loadBrands(nextFilters: BrandFilters) {
    setIsLoading(true);
    setMessage(null);

    try {
      const query = buildQuery(nextFilters);
      const result = await adminApiRequest<StoreBrandRow[]>(`/admin/store/brands${query ? `?${query}` : ''}`);
      setBrands(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las marcas.') });
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
          <div><h2><Tag size={24} /> Marcas de tienda online</h2></div>
          {canCreate ? <a className="admin-primary customer-action-button" href="/tienda-online/marcas/nueva">Nueva marca</a> : null}
        </div>

        <form className="customer-table-toolbar store-brand-filter-toolbar" onSubmit={submitFilters}>
          <label className="customer-filter-field">
            <span>Marca</span>
            <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} placeholder="Buscar marca" />
          </label>
          <label className="customer-filter-field">
            <span>Codigo</span>
            <input value={filters.code} onChange={(event) => setFilters({ ...filters, code: event.target.value.toUpperCase() })} placeholder="Ej. NINE_WEST" />
          </label>
          <label className="customer-filter-field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as BrandFilters['status'] })}>
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </label>
          <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        <table className="customer-records-table store-brand-records-table">
          <colgroup>
            <col className="store-brand-col-name" />
            <col className="store-brand-col-code" />
            <col className="store-brand-col-products" />
            <col className="store-brand-col-status" />
            <col className="store-brand-col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Marca</th>
              <th>Codigo</th>
              <th className="numeric-cell">Productos</th>
              <th className="status-cell">Estado</th>
              <th className="actions-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td><span className="table-main-text">{brand.name}</span></td>
                <td>{brand.code}</td>
                <td className="numeric-cell">{formatNumber(brand.activeProductsCount)}</td>
                <td className="status-cell"><span className={brand.isActive ? 'badge green' : 'badge red'}>{brand.isActive ? 'Activa' : 'Inactiva'}</span></td>
                <td className="actions-cell">
                  <div className="customer-actions">
                    <a aria-label={`Ver marca ${brand.name}`} className="customer-icon-action" href={`/tienda-online/marcas/${brand.id}`}><Eye size={16} /></a>
                    {canEdit ? <a aria-label={`Editar marca ${brand.name}`} className="customer-icon-action" href={`/tienda-online/marcas/${brand.id}/editar`}><Pencil size={16} /></a> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && brands.length === 0 ? <tr><td colSpan={5}>No hay marcas con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={5}>Cargando marcas...</td></tr> : null}
          </tbody>
        </table>
      </article>
    </AdminRoutedShell>
  );
}
