'use client';

import { Eye, Pencil, Plus, Power, RefreshCw, Search, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { ConfirmModal, ConfirmModalState } from '../components/ConfirmModal';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate, formatNumber } from '../lib/format';
import type { CatalogPageConfig } from './catalogConfigs';

type CatalogItemRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  allowsSubcatalog?: boolean;
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentItemId?: string | null;
  parentItem?: {
    id: string;
    code: string;
    name: string;
    catalog?: { code: string; name: string };
  } | null;
};

type CatalogRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  items: CatalogItemRow[];
};

const pageSize = 10;

export default function CatalogosPage({ config }: { config: CatalogPageConfig }) {
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [parentFilter, setParentFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmModalState | null>(null);

  useEffect(() => {
    void loadCatalogs();
  }, [config.code]);

  const allItems = useMemo(() => catalogs.flatMap((row) => row.items), [catalogs]);
  const parentOptions = useMemo(() => {
    if (!config.parentCatalogCode) return [];
    return catalogs.find((row) => row.code === config.parentCatalogCode)?.items ?? [];
  }, [catalogs, config.parentCatalogCode]);
  const relations = useMemo(() => buildRelations(allItems), [allItems]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    return (catalog?.items ?? []).filter((item) => {
      const hierarchy = itemHierarchy(item, relations);
      const haystack = normalize([
        item.code,
        item.name,
        item.description ?? '',
        item.parentItem?.name ?? '',
        hierarchy.country?.name ?? '',
        hierarchy.department?.name ?? '',
        hierarchy.municipality?.name ?? '',
      ].join(' '));

      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (statusFilter !== 'ALL' && (statusFilter === 'ACTIVE') !== item.isActive) return false;
      if (parentFilter !== 'ALL' && item.parentItemId !== parentFilter) return false;

      return true;
    });
  }, [catalog?.items, parentFilter, query, relations, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, parentFilter, config.code]);

  async function loadCatalogs() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await Promise.all(
        relatedCatalogCodes(config.code).map((code) => adminApiRequest<CatalogRow>(`/catalogs/${code}?includeInactive=true`)),
      );
      const currentCatalog = result.find((row) => row.code === config.code) ?? null;
      setCatalogs(result);
      setCatalog(currentCatalog);
      if (!currentCatalog) {
        setMessage({ type: 'error', text: 'Catalogo no encontrado. Revisa la data inicial.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el catalogo.') });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleItem(item: CatalogItemRow) {
    const action = item.isActive ? 'inactivar' : 'reactivar';
    const warning = item.isActive
      ? 'Al inactivarlo dejara de estar disponible para seleccion en todas las plataformas, pero los registros historicos se conservaran.'
      : 'Al reactivarlo volvera a estar disponible donde corresponda.';
    setConfirmState({
      title: `¿Deseas ${action} este registro?`,
      description: warning,
      confirmLabel: action === 'inactivar' ? 'Inactivar' : 'Reactivar',
      onConfirm: () => void applyToggleItem(item),
    });
  }

  async function applyToggleItem(item: CatalogItemRow) {
    setConfirmState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/catalogs/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      setMessage({ type: 'success', text: item.isActive ? 'Registro inactivado correctamente.' : 'Registro reactivado correctamente.' });
      await loadCatalogs();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cambiar el estado del registro.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title={`Catalogos / ${config.title}`}>
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="customer-dashboard-toolbar">
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <div className="catalog-title-actions">
          <button className="admin-secondary" disabled={isLoading} onClick={() => void loadCatalogs()} type="button">
            <RefreshCw size={16} />
            Actualizar
          </button>
          <a className="admin-primary" href={`${config.basePath}/nuevo`}>
            <Plus size={16} />
            Agregar registro
          </a>
        </div>
      </section>

      <section className="catalogs-workspace catalog-list-workspace">
        <article className="customer-table-panel catalogs-table-panel">
          <div className="panel-header customer-table-header">
            <div>
              <h2>Tabla de {config.itemLabel}</h2>
              <p className="muted-copy">Busca, filtra y administra registros sin eliminarlos definitivamente.</p>
            </div>
            <span className="count-pill">{formatNumber(filteredItems.length)}</span>
          </div>

          <div className="customer-table-toolbar">
            <label className="customer-search">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por codigo, nombre o relacion..." />
              <Search size={17} />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Estado: Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
            {config.parentCatalogCode ? (
              <select value={parentFilter} onChange={(event) => setParentFilter(event.target.value)}>
                <option value="ALL">{config.parentLabel}: Todos</option>
                {parentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            ) : null}
          </div>

          <table className="customer-records-table catalog-items-table">
            <thead>
              <tr>
                {config.columns.map((column) => <th key={column}>{columnLabel(column, config)}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const hierarchy = itemHierarchy(item, relations);
                return (
                  <tr key={item.id}>
                    {config.columns.map((column) => (
                      <td key={column}>{renderCell(column, item, hierarchy, config, isSubmitting, toggleItem)}</td>
                    ))}
                  </tr>
                );
              })}
              {!isLoading && visibleItems.length === 0 ? <tr><td colSpan={config.columns.length}>No hay registros para mostrar.</td></tr> : null}
              {isLoading ? <tr><td colSpan={config.columns.length}>Cargando registros...</td></tr> : null}
            </tbody>
          </table>

          <div className="customer-table-footer">
            <span>Mostrando {formatNumber(visibleItems.length)} de {formatNumber(filteredItems.length)} registros</span>
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">‹</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">›</button>
            </div>
          </div>
        </article>
      </section>
      {confirmState ? (
        <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} isSubmitting={isSubmitting} />
      ) : null}
    </AdminRoutedShell>
  );
}

function buildRelations(items: CatalogItemRow[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function relatedCatalogCodes(code: string) {
  if (code === 'ZONA') return ['ZONA', 'MUNICIPIO', 'DEPARTAMENTO', 'PAIS'];
  if (code === 'MUNICIPIO') return ['MUNICIPIO', 'DEPARTAMENTO', 'PAIS'];
  if (code === 'DEPARTAMENTO') return ['DEPARTAMENTO', 'PAIS'];
  if (code === 'SHOE_TYPES') return ['SHOE_TYPES', 'PRODUCTOS'];

  return [code];
}

function itemHierarchy(item: CatalogItemRow, relations: Map<string, CatalogItemRow>) {
  const parent = item.parentItemId ? relations.get(item.parentItemId) ?? null : null;
  const grandParent = parent?.parentItemId ? relations.get(parent.parentItemId) ?? null : null;
  const greatGrandParent = grandParent?.parentItemId ? relations.get(grandParent.parentItemId) ?? null : null;

  if (item.parentItem?.catalog?.code === 'PAIS') return { country: parent, department: null, municipality: null };
  if (item.parentItem?.catalog?.code === 'DEPARTAMENTO') return { country: grandParent, department: parent, municipality: null };
  if (item.parentItem?.catalog?.code === 'MUNICIPIO') return { country: greatGrandParent, department: grandParent, municipality: parent };
  if (item.parentItem?.catalog?.code === 'PRODUCTOS') return { country: null, department: null, municipality: null, product: parent };

  return { country: null, department: null, municipality: null, product: parent };
}

function renderCell(
  column: CatalogPageConfig['columns'][number],
  item: CatalogItemRow,
  hierarchy: ReturnType<typeof itemHierarchy>,
  config: CatalogPageConfig,
  isSubmitting: boolean,
  toggleItem: (item: CatalogItemRow) => void,
) {
  if (column === 'code') return <span className="code-pill">{item.code}</span>;
  if (column === 'name') return <div className="table-main-cell"><strong>{item.name}</strong><span>{config.itemLabel}</span></div>;
  if (column === 'description') return item.description || '-';
  if (column === 'allowsSubcatalog') return item.allowsSubcatalog ? 'Si' : 'No';
  if (column === 'country') return hierarchy.country?.name ?? (config.code === 'PAIS' ? item.name : '-');
  if (column === 'department') return hierarchy.department?.name ?? (config.code === 'DEPARTAMENTO' ? item.name : '-');
  if (column === 'municipality') return hierarchy.municipality?.name ?? (config.code === 'MUNICIPIO' ? item.name : '-');
  if (column === 'product') return hierarchy.product?.name ?? '-';
  if (column === 'status') return <span className={item.isActive ? 'badge green' : 'badge red'}>{item.isActive ? 'Activo' : 'Inactivo'}</span>;
  if (column === 'createdAt') return formatDate(item.createdAt);
  if (column === 'updatedAt') return formatDate(item.updatedAt);

  return (
    <div className="table-actions">
      <a className="customer-icon-action" href={`${config.basePath}/${item.id}`} aria-label={`Ver ${item.name}`}>
        <Eye size={16} />
      </a>
      <a className="customer-icon-action" href={`${config.basePath}/${item.id}/editar`} aria-label={`Editar ${item.name}`}>
        <Pencil size={16} />
      </a>
      <button className="customer-icon-action" disabled={isSubmitting} onClick={() => void toggleItem(item)} type="button" aria-label={`${item.isActive ? 'Inactivar' : 'Reactivar'} ${item.name}`}>
        {item.isActive ? <Power size={16} /> : <XCircle size={16} />}
      </button>
    </div>
  );
}

function columnLabel(column: CatalogPageConfig['columns'][number], config: CatalogPageConfig) {
  const labels = {
    code: 'Codigo',
    name: config.itemColumnLabel,
    description: 'Descripcion',
    allowsSubcatalog: 'Tiene subcatalogo',
    country: 'Pais',
    department: 'Departamento',
    municipality: 'Municipio',
    product: 'Producto padre',
    status: 'Estado',
    createdAt: 'Fecha de creacion',
    updatedAt: 'Ultima actualizacion',
    actions: 'Acciones',
  };

  return labels[column];
}

function normalize(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
