'use client';

import { CheckCircle2, Eye, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate, formatMoney, formatNumber } from '../lib/format';

type PointRuleRow = {
  id: string;
  name: string;
  amountPerPoint: string;
  minimumAmount: string;
  maxPointsPerPurchase?: number | null;
  roundingMode: string;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  brandItemId?: string | null;
  brand?: { id: string; code: string; name: string } | null;
};

type SummaryResponse = {
  activePointRule?: PointRuleRow | null;
};

type PointRulesResponse = {
  data: PointRuleRow[];
};

const pageSize = 10;

export default function PuntosPage() {
  const [pointRules, setPointRules] = useState<PointRuleRow[]>([]);
  const [activePointRule, setActivePointRule] = useState<PointRuleRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void loadPoints();
  }, []);

  async function loadPoints() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [summary, rules] = await Promise.all([
        adminApiRequest<SummaryResponse>('/admin/summary'),
        adminApiRequest<PointRulesResponse>('/points/rules?limit=200'),
      ]);
      setActivePointRule(summary.activePointRule ?? rules.data.find((rule) => rule.isActive) ?? null);
      setPointRules(rules.data);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los puntos.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function activatePointRule(rule: PointRuleRow) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/points/rules/${rule.id}/activate`, { method: 'POST' });
      await loadPoints();
      setMessage({ type: 'success', text: `Regla ${rule.name} activada.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo activar la regla.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(pointRules.length / pageSize));
  const visibleRules = pointRules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AdminRoutedShell title="Puntos">
      <section className="customer-dashboard-toolbar">
        <div className="customer-profile-actions">
          <a className="admin-secondary" href="/puntos/ajustes">Ajustar puntos</a>
          <a className="admin-primary" href="/puntos/reglas/nueva"><Plus size={16} /> Nueva regla</a>
        </div>
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      {activePointRule ? (
        <div className="form-success" style={{ marginBottom: 12 }}>
          Regla activa: <strong>{activePointRule.name}</strong> — Q{formatMoney(activePointRule.amountPerPoint)} por punto
        </div>
      ) : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2>Tabla de reglas de puntos</h2></div>
          <span className="count-pill">{formatNumber(pointRules.length)}</span>
        </div>

        <table className="customer-records-table points-records-table">
          <thead>
            <tr>
              <th>Regla</th>
              <th>Marca</th>
              <th>Q por punto</th>
              <th>Minimo</th>
              <th>Maximo</th>
              <th>Inicio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleRules.map((rule) => (
              <tr key={rule.id}>
                <td><strong>{rule.name}</strong></td>
                <td>{rule.brand?.name ?? 'Todas las marcas'}</td>
                <td>Q{formatMoney(rule.amountPerPoint)}</td>
                <td>Q{formatMoney(rule.minimumAmount)}</td>
                <td>{rule.maxPointsPerPurchase ? formatNumber(rule.maxPointsPerPurchase) : 'Sin limite'}</td>
                <td>{formatDate(rule.startsAt)}</td>
                <td><span className={rule.isActive ? 'badge green' : 'badge red'}>{rule.isActive ? 'ACTIVA' : 'INACTIVA'}</span></td>
                <td>
                  <div className="customer-actions">
                    <a aria-label={`Ver regla ${rule.name}`} className="customer-icon-action" href={`/puntos/reglas/${rule.id}`}><Eye size={16} /></a>
                    <button aria-label={`Activar regla ${rule.name}`} className="customer-icon-action" disabled={isSubmitting || rule.isActive} onClick={() => void activatePointRule(rule)} type="button"><CheckCircle2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && visibleRules.length === 0 ? <tr><td colSpan={8}>No hay reglas registradas.</td></tr> : null}
            {isLoading ? <tr><td colSpan={8}>Cargando reglas...</td></tr> : null}
          </tbody>
        </table>

        {totalPages > 1 ? (
          <div className="customer-table-footer">
            <span>Mostrando página {formatNumber(currentPage)} de {formatNumber(totalPages)} · {formatNumber(pointRules.length)} reglas</span>
            <div className="customer-pagination">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} type="button">‹</button>
              {pageWindow(currentPage, totalPages).map((p) => (
                <button className={p === currentPage ? 'active' : ''} key={p} onClick={() => setCurrentPage(p)} type="button">{p}</button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} type="button">›</button>
            </div>
          </div>
        ) : null}
      </article>
    </AdminRoutedShell>
  );
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
