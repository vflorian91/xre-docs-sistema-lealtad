'use client';

import { ArrowLeft, CalendarDays, Mail, Pencil, Phone, UserCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { formatDate } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import { DeliveryStatusBadge } from '../../pedidos/components/OrderStatusBadges';

type DriverDetail = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  code?: string | null;
  type: string;
  isActive: boolean;
  notes?: string | null;
  assignedOrders: Array<{
    id: string;
    orderNumber: string;
    deliveryStatus: string;
    confirmedDeliveryDate?: string | null;
    deliveryTimeRange?: string | null;
    customer: { id: string; fullName: string; phone: string };
  }>;
  assignmentHistoryTo: Array<{
    id: string;
    reasonCode?: string | null;
    comment?: string | null;
    createdAt: string;
    order: { id: string; orderNumber: string };
    previousDriver?: { id: string; fullName: string } | null;
    newDriver?: { id: string; fullName: string } | null;
  }>;
};

export default function MensajeroDetallePage() {
  const params = useParams<{ mensajeroId: string }>();
  const driverId = params.mensajeroId;
  const canEdit = hasPermission(getStoredAdminUser()?.permissions, 'store_drivers.edit');
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    adminApiRequest<DriverDetail>(`/admin/store/drivers/${driverId}`)
      .then((result) => setDriver(result))
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el mensajero.') }))
      .finally(() => setIsLoading(false));
  }, [driverId]);

  return (
    <AdminRoutedShell title="Tienda Online">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a mensajeros" className="customer-back-button" href="/tienda-online/mensajeros"><ArrowLeft size={22} /></a>
            <div>
              <h2>Detalle del mensajero</h2>
              <p>Consulta datos operativos, entregas asignadas e historial.</p>
            </div>
          </div>
          {driver && canEdit ? (
            <div className="customer-profile-actions">
              <a className="admin-primary" href={`/tienda-online/mensajeros/${driver.id}/editar`}><Pencil size={16} /> Editar mensajero</a>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando mensajero...</div> : null}

        {driver ? (
          <>
            <section className="customer-profile-hero">
              <div className="customer-avatar-large"><UserCircle size={64} /></div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>{driver.fullName}</h3>
                  <span className={driver.isActive ? 'badge green' : 'badge red'}>{driver.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
                <p className="customer-code-line">{driver.code ?? 'Sin codigo'} · {driver.type}</p>
                <div className="customer-profile-info-grid">
                  <span><Phone size={16} /> {driver.phone}</span>
                  {driver.email ? <span><Mail size={16} /> {driver.email}</span> : null}
                  <span><CalendarDays size={16} /> {driver.assignedOrders.length} entregas asignadas</span>
                </div>
              </div>
            </section>

            <section className="customer-history-layout">
              <article className="customer-history-panel">
                <h3>Notas</h3>
                <p className="muted-copy">{driver.notes || 'Este mensajero no tiene notas configuradas.'}</p>
              </article>
            </section>

            <article className="panel table-panel wide-panel customer-table-panel">
              <div className="panel-header customer-table-header"><div><h2>Entregas asignadas</h2></div></div>
              <table className="customer-records-table">
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Rango</th><th>Estado</th></tr></thead>
                <tbody>
                  {driver.assignedOrders.map((order) => (
                    <tr key={order.id}>
                      <td><a className="table-main-text" href={`/tienda-online/pedidos/${order.id}`}>{order.orderNumber}</a></td>
                      <td>{order.customer.fullName}</td>
                      <td>{order.confirmedDeliveryDate ? formatDate(order.confirmedDeliveryDate) : 'Pendiente'}</td>
                      <td>{order.deliveryTimeRange ?? '-'}</td>
                      <td><DeliveryStatusBadge status={order.deliveryStatus} /></td>
                    </tr>
                  ))}
                  {driver.assignedOrders.length === 0 ? <tr><td colSpan={5}>No hay entregas asignadas.</td></tr> : null}
                </tbody>
              </table>
            </article>

            <article className="panel table-panel wide-panel customer-table-panel">
              <div className="panel-header customer-table-header"><div><h2>Historial de asignaciones</h2></div></div>
              <table className="customer-records-table">
                <thead><tr><th>Fecha</th><th>Pedido</th><th>Mensajero anterior</th><th>Motivo</th><th>Comentario</th></tr></thead>
                <tbody>
                  {driver.assignmentHistoryTo.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDate(event.createdAt)}</td>
                      <td><a className="table-main-text" href={`/tienda-online/pedidos/${event.order.id}`}>{event.order.orderNumber}</a></td>
                      <td>{event.previousDriver?.fullName ?? '-'}</td>
                      <td>{event.reasonCode ?? '-'}</td>
                      <td>{event.comment ?? '-'}</td>
                    </tr>
                  ))}
                  {driver.assignmentHistoryTo.length === 0 ? <tr><td colSpan={5}>No hay historial de asignaciones.</td></tr> : null}
                </tbody>
              </table>
            </article>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}
