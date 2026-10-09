'use client';

import { Eye, Plus, Search, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { formatDate, formatMoney, formatNumber } from '../../lib/format';

type PointRuleRow = {
  id: string;
  name: string;
  amountPerPoint: string;
  pointValueAmount: string;
  minimumAmount: string;
  maxPointsPerPurchase?: number | null;
  brand?: { id: string; code: string; name: string } | null;
  pointsExpirationDays?: number | null;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  createdByInternalUserId?: string | null;
  createdAt: string;
};

type PointRulesResponse = {
  data: PointRuleRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const pageSize = 10;
const emptyMeta = { page: 1, limit: pageSize, total: 0, totalPages: 1 };

export default function ParametrosPuntosPage() {
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [rules, setRules] = useState<PointRuleRow[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = Boolean(user?.permissions.includes('settings.manage'));
  useEffect(() => {
    setUser(getStoredAdminUser());
  }, []);

  useEffect(() => {
    void loadRules();
  }, [currentPage]);

  async function loadRules(nextPage = currentPage) {
    setIsLoading(true);
    setMessage(null);

    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(pageSize),
    });

    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (statusFilter) params.set('status', statusFilter);

    try {
      const result = await adminApiRequest<PointRulesResponse>(`/points/rules?${params.toString()}`);
      setRules(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las reglas de puntos.') });
    } finally {
      setIsLoading(false);
    }
  }

  function setFilter(update: () => void) {
    update();
    setCurrentPage(1);
  }

  return (
    <AdminRoutedShell title="Parametros / Puntos">
      <section className="customer-dashboard-toolbar">
        <span />
        {canManage ? <Link className="admin-primary" href="/parametros/puntos/nuevo"><Plus size={16} /> Nuevo</Link> : null}
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Settings size={24} /> Tabla de puntos</h2></div>
          <span className="count-pill">{formatNumber(meta.total)}</span>
        </div>

        <div className="customer-table-toolbar">
          <label className="customer-search">
            <input aria-label="Buscar reglas de puntos" value={searchTerm} onChange={(event) => setFilter(() => setSearchTerm(event.target.value))} placeholder="Buscar regla..." />
            <Search size={18} />
          </label>
          <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setFilter(() => setStatusFilter(event.target.value))}>
            <option value="">Estado: Todos</option>
            <option value="ACTIVE">Activa</option>
            <option value="INACTIVE">Finalizada/Inactiva</option>
          </select>
          <button className="admin-secondary" onClick={() => void loadRules(1)} type="button">Filtrar</button>
        </div>

        <table className="customer-records-table points-records-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Q gastados por punto</th>
              <th>Marca</th>
              <th>Valor punto</th>
              <th>Compra minima</th>
              <th>Maximo</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Finalizacion</th>
              <th>Creacion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <span className="store-code-pill">{rule.id.slice(-8).toUpperCase()}</span>
                  <p className="table-subtitle">{rule.name}</p>
                </td>
                <td>Q{formatMoney(rule.amountPerPoint)}</td>
                <td>{rule.brand?.name ?? '-'}</td>
                <td>Q{formatPointValue(rule.pointValueAmount)}</td>
                <td>Q{formatMoney(rule.minimumAmount)}</td>
                <td>{rule.maxPointsPerPurchase ? formatNumber(rule.maxPointsPerPurchase) : 'Sin limite'}</td>
                <td>{rule.pointsExpirationDays ? `${formatNumber(rule.pointsExpirationDays)} dias` : 'Sin vencimiento'}</td>
                <td><span className={rule.isActive ? 'badge green' : 'badge red'}>{rule.isActive ? 'Activa' : 'Finalizada'}</span></td>
                <td>{formatDate(rule.startsAt)}</td>
                <td>{formatDate(rule.endsAt)}</td>
                <td>{formatDate(rule.createdAt)}</td>
                <td>
                  <div className="customer-actions">
                    <Link aria-label={`Ver regla ${rule.name}`} className="customer-icon-action" href={`/parametros/puntos/${rule.id}`}><Eye size={16} /></Link>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && rules.length === 0 ? <tr><td colSpan={12}>No hay reglas de puntos registradas.</td></tr> : null}
            {isLoading ? <tr><td colSpan={12}>Cargando reglas...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Pagina {formatNumber(meta.page)} de {formatNumber(meta.totalPages)}</span>
          <div className="customer-pagination">
            <button disabled={meta.page <= 1 || isLoading} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} type="button">‹</button>
            <button className="active" type="button">{formatNumber(meta.page)}</button>
            <button disabled={meta.page >= meta.totalPages || isLoading} onClick={() => setCurrentPage((value) => value + 1)} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function formatPointValue(value: string | number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(Number(value));
}
