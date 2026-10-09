'use client';

import { ArrowLeft } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';
import { formatMoney } from '../../../lib/format';
import '../../pedidos/pedidos.css';
import { PAYMENT_METHOD_LABELS } from '../components/SettlementStatusBadges';
import CreateSettlementModal from './components/CreateSettlementModal';
import MarkIncidentModal from './components/MarkIncidentModal';
import PendingPaymentsFilters, { initialPendingFilters, PendingFiltersState } from './components/PendingPaymentsFilters';
import PendingPaymentsTable, { PendingPaymentRow } from './components/PendingPaymentsTable';

function buildQuery(filters: PendingFiltersState) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  return params.toString();
}

export default function NuevaLiquidacionPage() {
  const [payments, setPayments] = useState<PendingPaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<PendingFiltersState>(initialPendingFilters);
  const [appliedFilters, setAppliedFilters] = useState<PendingFiltersState>(initialPendingFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [incidentTarget, setIncidentTarget] = useState<PendingPaymentRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadPending(appliedFilters);
  }, [appliedFilters]);

  async function loadPending(nextFilters: PendingFiltersState) {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await adminApiRequest<PendingPaymentRow[]>(`/admin/store/payment-settlements/pending?${buildQuery(nextFilters)}`);
      setPayments(result);
      setSelectedIds((current) => new Set(Array.from(current).filter((id) => result.some((payment) => payment.paymentId === id))));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los pagos pendientes.') });
    } finally {
      setIsLoading(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function toggleSelection(paymentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  }

  const selectedPayments = useMemo(() => payments.filter((payment) => selectedIds.has(payment.paymentId)), [payments, selectedIds]);
  const selectedTotal = useMemo(() => selectedPayments.reduce((sum, payment) => sum + payment.amount, 0), [selectedPayments]);
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of selectedPayments) {
      map.set(payment.paymentMethod, (map.get(payment.paymentMethod) ?? 0) + payment.amount);
    }
    return Array.from(map.entries());
  }, [selectedPayments]);

  async function confirmIncident(data: { reasonCode: string; comment: string }) {
    if (!incidentTarget) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await adminApiRequest(`/admin/store/payments/${incidentTarget.paymentId}/settlement-incident`, {
        method: 'POST',
        body: JSON.stringify({ reasonCode: data.reasonCode, comment: data.comment || undefined }),
      });
      setIncidentTarget(null);
      await loadPending(appliedFilters);
      setMessage({ type: 'success', text: 'Pago marcado con incidencia.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo marcar la incidencia.') });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCreateSettlement(data: { reference: string; comment: string }) {
    setSubmitting(true);
    setMessage(null);
    try {
      const settlement = await adminApiRequest<{ id: string }>('/admin/store/payment-settlements', {
        method: 'POST',
        body: JSON.stringify({
          paymentIds: Array.from(selectedIds),
          settlementDate: new Date().toISOString(),
          reference: data.reference || undefined,
          comment: data.comment || undefined,
        }),
      });
      window.location.href = `/tienda-online/liquidaciones-cobros/${settlement.id}`;
    } catch (error) {
      setShowCreateModal(false);
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear la liquidacion.') });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <div className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a liquidaciones" className="customer-back-button" href="/tienda-online/liquidaciones-cobros">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Nueva liquidación</h2>
              <p>Selecciona los pagos confirmados que deseas incluir en esta liquidación.</p>
            </div>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <article className="panel table-panel wide-panel customer-table-panel">
          <PendingPaymentsFilters filters={filters} onChange={setFilters} onSubmit={submitFilters} />
          <PendingPaymentsTable
            isLoading={isLoading}
            onMarkIncident={setIncidentTarget}
            onToggle={toggleSelection}
            payments={payments}
            selectedIds={selectedIds}
          />
        </article>

        <div className="order-selection-bar">
          <div>
            <strong>{selectedPayments.length}</strong> pagos seleccionados — Total: <strong>Q{formatMoney(selectedTotal)}</strong>
            <div className="order-selection-bar-breakdown">
              {breakdown.map(([method, amount]) => (
                <span key={method}>{PAYMENT_METHOD_LABELS[method] ?? method}: Q{formatMoney(amount)}</span>
              ))}
            </div>
          </div>
          <button className="order-action-button primary" disabled={selectedPayments.length === 0} onClick={() => setShowCreateModal(true)} type="button">
            Crear liquidación
          </button>
        </div>
      </div>

      {incidentTarget ? (
        <MarkIncidentModal
          onCancel={() => setIncidentTarget(null)}
          onConfirm={confirmIncident}
          orderNumber={incidentTarget.orderNumber}
          submitting={submitting}
        />
      ) : null}

      {showCreateModal ? (
        <CreateSettlementModal
          count={selectedPayments.length}
          onCancel={() => setShowCreateModal(false)}
          onConfirm={confirmCreateSettlement}
          submitting={submitting}
          totalAmount={selectedTotal}
        />
      ) : null}
    </AdminRoutedShell>
  );
}
