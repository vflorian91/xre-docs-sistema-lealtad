'use client';

import { CalendarDays, Search, UserCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { formatDate } from '../../lib/format';
import { hasPermission } from '../../lib/permissions';
import {
  DeliveryStatusBadge,
  PAYMENT_METHOD_LABELS,
  PaymentStatusBadge,
} from '../pedidos/components/OrderStatusBadges';

type DriverOption = { id: string; fullName: string; phone: string; code?: string | null };

type ScheduleRow = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  deliveryStatus: string;
  clientPaymentStatus: string;
  paymentMethodRequested: string;
  suggestedDeliveryDate: string;
  confirmedDeliveryDate?: string | null;
  deliveryTimeRange?: string | null;
  customer: { id: string; fullName: string; phone: string; code: string };
  assignedDriver?: DriverOption | null;
};

type ScheduleResponse = {
  data: ScheduleRow[];
  meta: {
    cards: {
      pendientes: number;
      hoy: number;
      manana: number;
      reprogramadas: number;
      asignadas: number;
      sinMensajero: number;
    };
    drivers: DriverOption[];
  };
};

type Filters = {
  date: string;
  deliveryStatus: string;
  driverId: string;
  order: string;
  customer: string;
};

type ActionType = 'program' | 'reschedule' | 'assign' | 'change-driver' | 'cancel-schedule';

const initialFilters: Filters = { date: '', deliveryStatus: '', driverId: '', order: '', customer: '' };

const deliveryStatuses = [
  ['PENDIENTE_PROGRAMACION', 'Pendiente de programacion'],
  ['PROGRAMADA', 'Programada'],
  ['REPROGRAMADA', 'Reprogramada'],
  ['PREPARANDO_PEDIDO', 'Preparando pedido'],
  ['ASIGNADA', 'Asignada'],
  ['CANCELADA', 'Cancelada'],
];

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.deliveryStatus) params.set('deliveryStatus', filters.deliveryStatus);
  if (filters.driverId) params.set('driverId', filters.driverId);
  if (filters.order.trim()) params.set('order', filters.order.trim());
  if (filters.customer.trim()) params.set('customer', filters.customer.trim());
  return params.toString();
}

export default function AgendaEntregasPage({ initialDate }: { initialDate?: string }) {
  const permissions = getStoredAdminUser()?.permissions;
  const canProgram = hasPermission(permissions, 'store_delivery_schedule.program');
  const canReschedule = hasPermission(permissions, 'store_delivery_schedule.reschedule');
  const canAssign = hasPermission(permissions, 'store_delivery_schedule.assign');
  const canCancel = hasPermission(permissions, 'store_delivery_schedule.cancel');
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [cards, setCards] = useState<ScheduleResponse['meta']['cards'] | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, date: initialDate ?? '' });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...initialFilters, date: initialDate ?? '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<{ type: ActionType; order: ScheduleRow } | null>(null);

  useEffect(() => {
    void loadSchedule(appliedFilters);
  }, [appliedFilters]);

  async function loadSchedule(nextFilters: Filters) {
    setIsLoading(true);
    setMessage(null);
    try {
      const query = buildQuery(nextFilters);
      const result = await adminApiRequest<ScheduleResponse>(`/admin/store/delivery-schedule${query ? `?${query}` : ''}`);
      setRows(result.data);
      setCards(result.meta.cards);
      setDrivers(result.meta.drivers);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la agenda de entregas.') });
    } finally {
      setIsLoading(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  async function runAction(path: string, body: Record<string, unknown>, successText: string) {
    if (!activeAction) return;
    setMessage(null);
    try {
      await adminApiRequest(`/admin/store/orders/${activeAction.order.id}/delivery/${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setActiveAction(null);
      await loadSchedule(appliedFilters);
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo completar la accion.') });
    }
  }

  const cardItems = useMemo(
    () => [
      ['Pendientes de programacion', cards?.pendientes ?? 0],
      ['Programadas hoy', cards?.hoy ?? 0],
      ['Programadas manana', cards?.manana ?? 0],
      ['Reprogramadas', cards?.reprogramadas ?? 0],
      ['Asignadas', cards?.asignadas ?? 0],
      ['Sin mensajero', cards?.sinMensajero ?? 0],
    ],
    [cards],
  );

  return (
    <AdminRoutedShell title="Tienda Online">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <span className="customer-back-button"><CalendarDays size={22} /></span>
            <div>
              <h2>Agenda de Entregas</h2>
              <p>Programa entregas y asigna mensajeros a pedidos confirmados.</p>
            </div>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <div className="loyalty-summary-grid">
          {cardItems.map(([label, value]) => (
            <article className="loyalty-summary-card" key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <article className="panel table-panel wide-panel customer-table-panel">
          <form className="customer-table-toolbar" onSubmit={submitFilters}>
            <label className="customer-filter-field">
              <span>Fecha</span>
              <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
            </label>
            <label className="customer-filter-field">
              <span>Estado entrega</span>
              <select value={filters.deliveryStatus} onChange={(event) => setFilters({ ...filters, deliveryStatus: event.target.value })}>
                <option value="">Todos</option>
                {deliveryStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="customer-filter-field">
              <span>Mensajero</span>
              <select value={filters.driverId} onChange={(event) => setFilters({ ...filters, driverId: event.target.value })}>
                <option value="">Todos</option>
                <option value="none">Sin mensajero</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
              </select>
            </label>
            <label className="customer-filter-field">
              <span>Pedido</span>
              <input value={filters.order} onChange={(event) => setFilters({ ...filters, order: event.target.value })} placeholder="Numero" />
            </label>
            <label className="customer-filter-field">
              <span>Cliente</span>
              <input value={filters.customer} onChange={(event) => setFilters({ ...filters, customer: event.target.value })} placeholder="Nombre o telefono" />
            </label>
            <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit"><Search size={16} /> Buscar</button>
          </form>

          <table className="customer-records-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Telefono</th>
                <th>Fecha confirmada</th>
                <th>Rango</th>
                <th>Estado entrega</th>
                <th>Mensajero</th>
                <th>Pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><a className="table-main-text" href={`/tienda-online/pedidos/${row.id}`}>{row.orderNumber}</a></td>
                  <td>{row.customer.fullName}</td>
                  <td>{row.customer.phone}</td>
                  <td>{row.confirmedDeliveryDate ? formatDate(row.confirmedDeliveryDate) : 'Pendiente'}</td>
                  <td>{row.deliveryTimeRange ?? '-'}</td>
                  <td><DeliveryStatusBadge status={row.deliveryStatus} /></td>
                  <td>{row.assignedDriver ? row.assignedDriver.fullName : <span className="badge amber">Sin mensajero</span>}</td>
                  <td>
                    <span>{PAYMENT_METHOD_LABELS[row.paymentMethodRequested] ?? row.paymentMethodRequested}</span>
                    <br />
                    <PaymentStatusBadge status={row.clientPaymentStatus} />
                  </td>
                  <td>
                    <div className="customer-actions">
                      {canProgram ? <button className="customer-action-link" onClick={() => setActiveAction({ type: 'program', order: row })} type="button">Programar</button> : null}
                      {canReschedule ? <button className="customer-action-link" onClick={() => setActiveAction({ type: 'reschedule', order: row })} type="button">Reprogramar</button> : null}
                      {canAssign && !row.assignedDriver ? <button className="customer-action-link" onClick={() => setActiveAction({ type: 'assign', order: row })} type="button">Asignar</button> : null}
                      {canAssign && row.assignedDriver ? <button className="customer-action-link" onClick={() => setActiveAction({ type: 'change-driver', order: row })} type="button">Cambiar</button> : null}
                      {canCancel ? <button className="customer-action-link danger" onClick={() => setActiveAction({ type: 'cancel-schedule', order: row })} type="button">Cancelar agenda</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading ? <tr><td colSpan={9}>Cargando agenda...</td></tr> : null}
              {!isLoading && rows.length === 0 ? <tr><td colSpan={9}>No hay entregas con esos filtros.</td></tr> : null}
            </tbody>
          </table>
        </article>
      </section>

      {activeAction ? (
        <DeliveryActionModal
          action={activeAction.type}
          drivers={drivers}
          onCancel={() => setActiveAction(null)}
          onSubmit={(path, body, successText) => void runAction(path, body, successText)}
          order={activeAction.order}
        />
      ) : null}
    </AdminRoutedShell>
  );
}

function DeliveryActionModal({
  action,
  drivers,
  onCancel,
  onSubmit,
  order,
}: {
  action: ActionType;
  drivers: DriverOption[];
  onCancel: () => void;
  onSubmit: (path: string, body: Record<string, unknown>, successText: string) => void;
  order: ScheduleRow;
}) {
  const [date, setDate] = useState(order.confirmedDeliveryDate?.slice(0, 10) ?? '');
  const [range, setRange] = useState(order.deliveryTimeRange ?? '09:00 a 12:00');
  const [driverId, setDriverId] = useState(order.assignedDriver?.id ?? drivers[0]?.id ?? '');
  const [reasonCode, setReasonCode] = useState(action === 'change-driver' ? 'REASIGNACION_OPERATIVA' : 'SIN_DISPONIBILIDAD');
  const [comment, setComment] = useState('');

  const titleByAction: Record<ActionType, string> = {
    program: 'Programar entrega',
    reschedule: 'Reprogramar entrega',
    assign: 'Asignar mensajero',
    'change-driver': 'Cambiar mensajero',
    'cancel-schedule': 'Cancelar programacion',
  };

  function submit() {
    if (action === 'program') {
      onSubmit('program', { confirmedDeliveryDate: date, deliveryTimeRange: range, comment: comment || undefined }, 'Entrega programada correctamente.');
      return;
    }
    if (action === 'reschedule') {
      onSubmit('reschedule', { newConfirmedDeliveryDate: date, deliveryTimeRange: range, reasonCode, comment: comment || undefined }, 'Entrega reprogramada correctamente.');
      return;
    }
    if (action === 'assign') {
      onSubmit('assign-driver', { driverId, comment: comment || undefined }, 'Mensajero asignado correctamente.');
      return;
    }
    if (action === 'change-driver') {
      onSubmit('change-driver', { driverId, reasonCode, comment: comment || undefined }, 'Mensajero cambiado correctamente.');
      return;
    }
    onSubmit('cancel-schedule', { reasonCode: reasonCode || 'CANCELACION_OPERATIVA', comment: comment || undefined }, 'Programacion cancelada correctamente.');
  }

  const needsDate = action === 'program' || action === 'reschedule';
  const needsDriver = action === 'assign' || action === 'change-driver';
  const needsReason = action === 'reschedule' || action === 'change-driver' || action === 'cancel-schedule';
  const canSubmit = (!needsDate || (date && range)) && (!needsDriver || driverId) && (!needsReason || (reasonCode && (reasonCode !== 'OTRO' || comment.trim())));

  return (
    <div className="modal-backdrop">
      <div className="modal-card order-modal-card">
        <header className="modal-header">
          <div>
            <h2>{titleByAction[action]}</h2>
            <p>{order.orderNumber}</p>
          </div>
          <button onClick={onCancel} type="button">Cerrar</button>
        </header>

        {needsDate ? (
          <>
            <label className="customer-filter-field"><span>Fecha confirmada</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="customer-filter-field">
              <span>Rango horario</span>
              <select value={range} onChange={(event) => setRange(event.target.value)}>
                <option>09:00 a 12:00</option>
                <option>12:00 a 15:00</option>
                <option>15:00 a 18:00</option>
              </select>
            </label>
          </>
        ) : null}

        {needsDriver ? (
          <label className="customer-filter-field">
            <span>Mensajero</span>
            <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName} - {driver.phone}</option>)}
            </select>
          </label>
        ) : null}

        {needsReason ? (
          <label className="customer-filter-field">
            <span>Motivo</span>
            <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
              {(action === 'change-driver'
                ? ['MENSAJERO_NO_DISPONIBLE', 'REASIGNACION_OPERATIVA', 'ERROR_DE_ASIGNACION', 'CLIENTE_CAMBIO_FECHA', 'OTRO']
                : ['SIN_DISPONIBILIDAD', 'CLIENTE_SOLICITO_CAMBIO', 'DIRECCION_REQUIERE_VALIDACION', 'PRODUCTO_NO_LISTO', 'PROBLEMA_OPERATIVO', 'OTRO']
              ).map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </label>
        ) : null}

        <label className="customer-filter-field">
          <span>Comentario</span>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Comentario operativo" />
        </label>

        <footer className="modal-actions">
          <button className="admin-secondary" onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={!canSubmit} onClick={submit} type="button">{titleByAction[action]}</button>
        </footer>
      </div>
    </div>
  );
}
