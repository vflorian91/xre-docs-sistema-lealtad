'use client';

import { Download, Eye, Pencil, Search, Store, StoreIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, clearAdminSession, getErrorText } from '../lib/adminApi';
import { exportRowsToXlsx } from '../lib/exportExcel';
import { formatDate, formatNumber } from '../lib/format';

type StoreStatus = 'ACTIVE' | 'INACTIVE';
type StoreLocationType = 'CAPITAL' | 'DEPARTMENT';
type SortBy = 'code' | 'name' | 'status' | 'locationType' | 'createdAt';
type SortDirection = 'asc' | 'desc';

type StoreUserRef = { id: string; fullName: string; email: string };

type StoreRow = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  locationType: StoreLocationType;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string | null;
  createdByInternalUser?: StoreUserRef | null;
  updatedByInternalUser?: StoreUserRef | null;
  deactivatedByInternalUser?: StoreUserRef | null;
};

type StoresResponse = {
  data: StoreRow[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    departments: number;
    capital: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const emptyResponse: StoresResponse = {
  data: [],
  summary: { total: 0, active: 0, inactive: 0, departments: 0, capital: 0 },
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

type TiendasPageProps = {
  basePath?: string;
};

export default function TiendasPage({ basePath = '/catalogos/tiendas' }: TiendasPageProps) {
  const [result, setResult] = useState<StoresResponse>(emptyResponse);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryString = useMemo(
    () => buildStoreQuery({ page: currentPage, limit: pageSize, searchTerm, statusFilter, locationFilter, sortBy, sortDirection }),
    [currentPage, searchTerm, statusFilter, locationFilter, sortBy, sortDirection],
  );

  useEffect(() => {
    void loadStores();
  }, [queryString]);

  async function loadStores() {
    setIsLoading(true);
    setMessage(null);

    try {
      const nextResult = await adminApiRequest<StoresResponse>(`/stores?${queryString}`);
      setResult(nextResult);
    } catch (error) {
      const text = getErrorText(error, 'No se pudieron cargar las tiendas. Intenta nuevamente.');
      setMessage({ type: 'error', text });
      if (/sesion|token|unauthorized|expirada/i.test(text)) {
        clearAdminSession();
      }
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilters(update: () => void) {
    update();
    setCurrentPage(1);
  }

  function toggleSort(nextSortBy: SortBy) {
    setCurrentPage(1);
    if (sortBy === nextSortBy) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(nextSortBy);
    setSortDirection('asc');
  }

  function clearFilters() {
    setSearchTerm('');
    setStatusFilter('');
    setLocationFilter('');
    setSortBy('createdAt');
    setSortDirection('desc');
    setCurrentPage(1);
  }

  async function exportStores() {
    setIsExporting(true);
    setMessage(null);

    try {
      const exportQuery = buildStoreQuery({
        page: 1,
        limit: 500,
        searchTerm,
        statusFilter,
        locationFilter,
        sortBy,
        sortDirection,
        exportAll: true,
      });
      const exportResult = await adminApiRequest<StoresResponse>(`/stores?${exportQuery}`);
      const headers = [
        'Código de tienda',
        'Nombre de tienda',
        'Dirección',
        'Ubicación',
        'Estado',
        'Fecha de creación',
        'Fecha de última actualización',
        'Creado por',
        'Actualizado por',
        'Fecha de inactivación',
        'Inactivado por',
      ];
      const rows = exportResult.data.map((store) => [
        store.code,
        store.name,
        store.address ?? '',
        locationLabel(store.locationType),
        statusLabel(store.status),
        formatDate(store.createdAt),
        formatDate(store.updatedAt),
        store.createdByInternalUser?.fullName ?? '',
        store.updatedByInternalUser?.fullName ?? '',
        formatDate(store.deactivatedAt),
        store.deactivatedByInternalUser?.fullName ?? '',
      ]);
      await exportRowsToXlsx(`tiendas-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Tiendas', [headers, ...rows]);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el archivo XLSX. Intenta nuevamente.') });
    } finally {
      setIsExporting(false);
    }
  }

  const hasFilters = Boolean(searchTerm || statusFilter || locationFilter);

  return (
    <AdminRoutedShell title="Tiendas">
      <section className="customer-dashboard-toolbar">
        <span />
        <a className="admin-primary" href={`${basePath}/nuevo`}>Nueva tienda</a>
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><StoreIcon size={27} /> Tabla de tiendas</h2></div>
          <span className="count-pill">{formatNumber(result.meta.total)}</span>
        </div>

        <div className="customer-table-toolbar">
          <label className="customer-search">
            <input aria-label="Buscar tiendas" value={searchTerm} onChange={(event) => updateFilters(() => setSearchTerm(event.target.value))} placeholder="Buscar código, tienda o dirección..." />
            <Search size={18} />
          </label>
          <select aria-label="Filtrar tiendas por estado" value={statusFilter} onChange={(event) => updateFilters(() => setStatusFilter(event.target.value))}>
            <option value="">Estado: Todas</option>
            <option value="ACTIVE">Activas</option>
            <option value="INACTIVE">Inactivas</option>
          </select>
          <select aria-label="Filtrar tiendas por ubicación" value={locationFilter} onChange={(event) => updateFilters(() => setLocationFilter(event.target.value))}>
            <option value="">Ubicación: Todas</option>
            <option value="CAPITAL">Capital</option>
            <option value="DEPARTMENT">Departamento</option>
          </select>
          {hasFilters ? <button className="admin-secondary" onClick={clearFilters} type="button">Limpiar</button> : null}
          <button className="admin-secondary customer-export-button" disabled={isExporting} onClick={() => void exportStores()} type="button">
            <Download size={16} />
            {isExporting ? 'Exportando...' : 'Exportar XLSX'}
          </button>
        </div>

        <table className="customer-records-table stores-records-table">
          <thead>
            <tr>
              <SortableTh label="Código de tienda" active={sortBy === 'code'} direction={sortDirection} onClick={() => toggleSort('code')} />
              <SortableTh label="Nombre de tienda" active={sortBy === 'name'} direction={sortDirection} onClick={() => toggleSort('name')} />
              <th>Dirección</th>
              <SortableTh label="Ubicación" active={sortBy === 'locationType'} direction={sortDirection} onClick={() => toggleSort('locationType')} />
              <SortableTh label="Estado" active={sortBy === 'status'} direction={sortDirection} onClick={() => toggleSort('status')} />
              <SortableTh label="Fecha de creación" active={sortBy === 'createdAt'} direction={sortDirection} onClick={() => toggleSort('createdAt')} />
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((store) => (
              <tr key={store.id}>
                <td><span className="store-code-pill">{store.code}</span></td>
                <td><span className="table-main-text">{store.name}</span></td>
                <td><span className="table-wrap-cell">{store.address}</span></td>
                <td>{locationLabel(store.locationType)}</td>
                <td><span className={store.status === 'ACTIVE' ? 'badge green' : 'badge red'}>{statusLabel(store.status)}</span></td>
                <td>{formatDate(store.createdAt)}</td>
                <td>
                  <div className="customer-actions">
                    <a aria-label={`Ver tienda ${store.name}`} className="customer-icon-action" href={`${basePath}/${store.id}`}><Eye size={16} /></a>
                    <a aria-label={`Editar tienda ${store.name}`} className="customer-icon-action" href={`${basePath}/${store.id}/editar`}><Pencil size={16} /></a>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && result.data.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  {hasFilters ? 'No se encontraron tiendas con los criterios seleccionados.' : 'Aún no hay tiendas registradas. Crea tu primera tienda para poder asignarla a usuarios y registrar operaciones.'}
                </td>
              </tr>
            ) : null}
            {isLoading ? <tr><td colSpan={7}>Cargando tiendas...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando {formatNumber(result.data.length)} de {formatNumber(result.meta.total)} tiendas</span>
          <div className="customer-pagination">
            <button disabled={result.meta.page === 1 || isLoading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">‹</button>
            {Array.from({ length: Math.min(5, result.meta.totalPages) }, (_, index) => pageWindow(result.meta.page, result.meta.totalPages)[index]).filter(Boolean).map((page) => (
              <button className={page === result.meta.page ? 'active' : undefined} key={page} onClick={() => setCurrentPage(page)} type="button">{page}</button>
            ))}
            <button disabled={result.meta.page === result.meta.totalPages || isLoading} onClick={() => setCurrentPage((page) => Math.min(result.meta.totalPages, page + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: SortDirection; onClick: () => void }) {
  return (
    <th>
      <button className="table-sort-button" onClick={onClick} type="button">
        {label}
        <span>{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

function buildStoreQuery(input: {
  page: number;
  limit: number;
  searchTerm: string;
  statusFilter: string;
  locationFilter: string;
  sortBy: SortBy;
  sortDirection: SortDirection;
  exportAll?: boolean;
}) {
  const params = new URLSearchParams({
    page: String(input.page),
    limit: String(input.limit),
    sortBy: input.sortBy,
    sortDirection: input.sortDirection,
  });
  if (input.searchTerm.trim()) params.set('search', input.searchTerm.trim());
  if (input.statusFilter) params.set('status', input.statusFilter);
  if (input.locationFilter) params.set('locationType', input.locationFilter);
  if (input.exportAll) params.set('exportAll', 'true');
  return params.toString();
}

function locationLabel(value: StoreLocationType) {
  return value === 'CAPITAL' ? 'Capital' : 'Departamento';
}

function statusLabel(value: StoreStatus) {
  return value === 'ACTIVE' ? 'Activa' : 'Inactiva';
}

function pageWindow(currentPage: number, totalPages: number) {
  const size = Math.min(5, totalPages);
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}
