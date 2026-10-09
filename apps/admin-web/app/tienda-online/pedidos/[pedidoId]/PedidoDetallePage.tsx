'use client';

import { ArrowLeft, ClipboardList, CreditCard, MapPin, Package, Truck, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../../../components/ReasonModal';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { formatDate, formatMoney } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import { DeliveryStatusBadge, PAYMENT_METHOD_LABELS, PaymentStatusBadge } from '../components/OrderStatusBadges';
import '../pedidos.css';
import ConfirmPaymentModal, { ConfirmPaymentData } from './components/ConfirmPaymentModal';
import OrderClientInfo from './components/OrderClientInfo';
import OrderDeliveryInfo from './components/OrderDeliveryInfo';
import OrderFlowStepper, { FlowStage } from './components/OrderFlowStepper';
import OrderPaymentSection, { OrderPayment } from './components/OrderPaymentSection';
import OrderPickupSection from './components/OrderPickupSection';
import type { BrandGroup } from './components/OrderProductsByBrand';
import RegisterVisaLinkModal from './components/RegisterVisaLinkModal';
import RequiredActionCard, { NextAction } from './components/RequiredActionCard';

type OrderItem = {
  id: string;
  brandName: string;
  productName: string;
  variantLabel?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  pickupStatus?: string | null;
  originStore?: { id: string; code: string; name: string } | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  deliveryStatus: string;
  clientPaymentStatus: string;
  paymentMethodRequested: string;
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  suggestedDeliveryDate: string;
  confirmedDeliveryDate?: string | null;
  deliveryTimeRange?: string | null;
  deliveryAddress: string;
  deliveryReference?: string | null;
  deliveryPhone: string;
  receiverName?: string | null;
  deliveryCodeStatus?: string | null;
  deliveryCodeGeneratedAt?: string | null;
  deliveryCodeValidatedAt?: string | null;
  deliveryCodeValidatedByDriverId?: string | null;
  deliveryCodeFailedAttempts?: number;
  assignedDriver?: { id: string; fullName: string; phone: string; code?: string | null } | null;
  createdAt: string;
  customer: { id: string; fullName: string; phone: string; email?: string | null; code: string };
  items: OrderItem[];
  brandGroups: BrandGroup[];
  payments: OrderPayment[];
  timeline: Array<{ statusType: string; previousStatus: string | null; newStatus: string; comment: string | null; createdByName?: string | null; createdAt: string }>;
  // FRD 08 — flujo lineal calculado por backend.
  flow: FlowStage[];
  flowCurrentStage: string | null;
  flowTerminal: 'DELIVERED' | 'CANCELLED' | null;
  flowIncident: boolean;
  nextAction: NextAction;
  incidents?: OrderIncident[];
};

type OrderIncident = {
  id: string;
  incidentType: string;
  incidentLabel: string;
  comment: string | null;
  evidencePhotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  addressText: string | null;
  status: string;
  affectedStoreId?: string | null;
  affectedOrderItemId?: string | null;
  reportedAt: string;
  reviewedAt?: string | null;
  reviewedByAdminId?: string | null;
  adminResolution?: string | null;
  driverName: string | null;
};

type DriverOption = { id: string; fullName: string; phone: string; code?: string | null };

type ActiveModal =
  | 'visa-link'
  | 'confirm-payment'
  | 'reject-payment'
  | 'program-delivery'
  | 'reschedule-delivery'
  | 'assign-driver'
  | 'change-driver'
  | 'incident-review'
  | 'incident-reschedule'
  | 'incident-change-address'
  | 'incident-cancel'
  | 'cancel'
  | null;

type TabKey = 'resumen' | 'productos' | 'pago' | 'entrega';

function deliveryCodeLabel(status?: string | null) {
  const labels: Record<string, string> = {
    PENDING_VALIDATION: 'Pendiente de validar',
    VALIDATED: 'Validado por motorista',
    GENERATED: 'Generado',
  };
  return status ? labels[status] ?? status : 'No generado';
}

export default function PedidoDetallePage() {
  const params = useParams<{ pedidoId: string }>();
  const orderId = params.pedidoId;
  const permissions = getStoredAdminUser()?.permissions;
  const canCancel = hasPermission(permissions, 'store_orders.cancel');
  const canReview = hasPermission(permissions, 'store_orders.review');
  const canManagePayments = hasPermission(permissions, 'store_orders.payments');
  const canRegisterVisaLink = hasPermission(permissions, 'store_orders.visa_link');
  const canProgramDelivery = hasPermission(permissions, 'store_delivery_schedule.program');
  const canRescheduleDelivery = hasPermission(permissions, 'store_delivery_schedule.reschedule');
  const canAssignDelivery = hasPermission(permissions, 'store_delivery_schedule.assign');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('productos');

  useEffect(() => {
    void loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!canAssignDelivery) return;
    adminApiRequest<DriverOption[]>('/admin/store/drivers/active')
      .then((result) => setDrivers(result))
      .catch(() => setDrivers([]));
  }, [canAssignDelivery]);

  async function loadOrder() {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await adminApiRequest<OrderDetail>(`/admin/store/orders/${orderId}`);
      setOrder(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el pedido.') });
    } finally {
      setIsLoading(false);
    }
  }

  function closeModal() {
    setActiveModal(null);
  }

  async function runAction(path: string, body: unknown, successText: string) {
    setSubmitting(true);
    setMessage(null);
    try {
      await adminApiRequest(`/admin/store/orders/${orderId}${path}`, { method: 'POST', body: JSON.stringify(body) });
      await loadOrder();
      closeModal();
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo completar la accion.') });
    } finally {
      setSubmitting(false);
    }
  }

  async function runIncidentAction(incidentId: string, action: string, body: unknown, successText: string) {
    setSubmitting(true);
    setMessage(null);
    try {
      await adminApiRequest(`/admin/store/orders/${orderId}/incidents/${incidentId}/${action}`, { method: 'PATCH', body: JSON.stringify(body) });
      await loadOrder();
      closeModal();
      setActiveTab('entrega');
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo completar la accion.') });
    } finally {
      setSubmitting(false);
    }
  }

  const activePayment = order?.payments[0] ?? null;
  const activeIncident = order?.incidents?.[0] ?? null;

  const currentStageActor = useMemo<FlowStage['actor'] | null>(() => {
    if (!order) return null;
    const stage = order.flow.find((s) => s.key === order.flowCurrentStage);
    return stage?.actor ?? null;
  }, [order]);

  // Mapea la acción requerida (backend) a la apertura del modal/tab correspondiente.
  function handleRequiredAction(action: string) {
    if (action === 'APPROVE_PAYMENT') setActiveModal('confirm-payment');
    else if (action === 'SCHEDULE_DELIVERY') setActiveModal('program-delivery');
    else if (action === 'ASSIGN_DRIVER') setActiveModal('assign-driver');
    else if (action === 'ASSIGN_ORIGIN_STORE') setActiveTab('productos');
    else if (action === 'REVIEW_INCIDENT') setActiveTab('entrega');
  }

  const reasonModalConfig: ReasonModalState | null = (() => {
    if (!order) return null;
    if (activeModal === 'cancel') {
      return {
        title: 'Cancelar pedido',
        description: 'El pedido quedara cancelado y, si ya se habia descontado stock, se devolvera automaticamente.',
        confirmLabel: 'Cancelar pedido',
        onConfirm: (reason) => runAction('/cancel', { reason }, 'Pedido cancelado correctamente.'),
      };
    }
    if (activeModal === 'reject-payment') {
      return {
        title: 'Rechazar pago',
        description: 'El pago quedara marcado como rechazado y el cliente podra cargar un nuevo comprobante.',
        confirmLabel: 'Rechazar pago',
        onConfirm: (reason) => runAction('/payments/reject', { reason }, 'Pago rechazado correctamente.'),
      };
    }
    return null;
  })();

  // Acciones correctivas/paralelas disponibles según estado (no avanzan el flujo lineal).
  function correctiveButtons() {
    if (!order || order.flowTerminal) return null;
    const incidentActive = order.flowIncident && activeIncident;
    const visaActionable =
      canRegisterVisaLink &&
      order.paymentMethodRequested === 'VISA_LINK_MANUAL' &&
      ['PENDIENTE_LINK', 'VISA_LINK_SOLICITADO', 'LINK_ENVIADO'].includes(order.clientPaymentStatus);
    const paymentReviewable = canManagePayments && Boolean(activePayment);
    const scheduled = ['PROGRAMADA', 'REPROGRAMADA', 'ASIGNADA'].includes(order.deliveryStatus);

    return (
      <>
        {incidentActive && canReview ? (
          <button className="po-btn" onClick={() => setActiveModal('incident-review')} type="button">Marcar revisada</button>
        ) : null}
        {incidentActive && canRescheduleDelivery ? (
          <button className="po-btn" onClick={() => setActiveModal('incident-reschedule')} type="button">Reprogramar entrega</button>
        ) : null}
        {incidentActive && canRescheduleDelivery ? (
          <button className="po-btn" onClick={() => setActiveModal('incident-change-address')} type="button">Cambiar dirección y reprogramar</button>
        ) : null}
        {incidentActive && canCancel ? (
          <button className="po-btn danger" onClick={() => setActiveModal('incident-cancel')} type="button">Cancelar por incidencia</button>
        ) : null}
        {incidentActive ? (
          <button className="po-btn" disabled type="button">Iniciar devolución (Slice D)</button>
        ) : null}
        {visaActionable ? (
          <button className="po-btn" onClick={() => setActiveModal('visa-link')} type="button">Registrar / enviar Visa Link</button>
        ) : null}
        {paymentReviewable ? (
          <button className="po-btn" onClick={() => setActiveModal('confirm-payment')} type="button">Registrar pago manual</button>
        ) : null}
        {canRescheduleDelivery && scheduled ? (
          <button className="po-btn" onClick={() => setActiveModal('reschedule-delivery')} type="button">Reprogramar entrega</button>
        ) : null}
        {canAssignDelivery && scheduled && order.assignedDriver ? (
          <button className="po-btn" onClick={() => setActiveModal('change-driver')} type="button">Cambiar motorista</button>
        ) : null}
        {canCancel ? (
          <button className="po-btn danger subtle" onClick={() => setActiveModal('cancel')} type="button">Cancelar pedido</button>
        ) : null}
      </>
    );
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <div className="po-detail">
        <header className="po-header">
          <div className="po-header-left">
            <a aria-label="Volver a pedidos" className="customer-back-button" href="/tienda-online/pedidos">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>{order ? `Pedido ${order.orderNumber}` : 'Detalle de pedido'}</h2>
              {order ? <p>Creado el {formatDate(order.createdAt)}</p> : null}
            </div>
          </div>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando pedido...</div> : null}

        {order ? (
          <>
            <RequiredActionCard
              corrective={correctiveButtons()}
              currentStageActor={currentStageActor}
              currentStageLabel={order.flow.find((s) => s.key === order.flowCurrentStage)?.label ?? null}
              incident={order.flowIncident}
              nextAction={order.nextAction}
              onAction={handleRequiredAction}
              paymentMethodLabel={PAYMENT_METHOD_LABELS[order.paymentMethodRequested] ?? order.paymentMethodRequested}
              terminal={order.flowTerminal}
              totalLabel={`Q${formatMoney(order.totalAmount)}`}
            />

            <OrderFlowStepper incident={order.flowIncident} stages={order.flow} />

            <section className="po-tabs-panel">
              <div className="po-tabs">
                <button className={`po-tab ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')} type="button"><ClipboardList size={16} /> Resumen</button>
                <button className={`po-tab ${activeTab === 'productos' ? 'active' : ''}`} onClick={() => setActiveTab('productos')} type="button"><Package size={16} /> Productos y asignación</button>
                <button className={`po-tab ${activeTab === 'pago' ? 'active' : ''}`} onClick={() => setActiveTab('pago')} type="button"><CreditCard size={16} /> Pago</button>
                <button className={`po-tab ${activeTab === 'entrega' ? 'active' : ''}`} onClick={() => setActiveTab('entrega')} type="button"><Truck size={16} /> Entrega</button>
              </div>
              <div className="po-tab-content">
                {activeTab === 'resumen' ? (
                  <section className="po-summary-grid">
                    <div className="po-summary-card">
                      <div className="po-summary-head"><span className="po-summary-icon"><User size={18} /></span><h3>Cliente</h3></div>
                      <div className="po-summary-row"><span>Nombre</span><strong>{order.customer.fullName}</strong></div>
                      <div className="po-summary-row"><span>Teléfono</span><strong>{order.customer.phone}</strong></div>
                      <div className="po-summary-row"><span>Correo</span><strong>{order.customer.email || '--'}</strong></div>
                    </div>
                    <div className="po-summary-card">
                      <div className="po-summary-head"><span className="po-summary-icon"><MapPin size={18} /></span><h3>Entrega</h3></div>
                      <div className="po-summary-row"><span>Dirección</span><strong className="po-truncate">{order.deliveryAddress}</strong></div>
                      <div className="po-summary-row"><span>Referencia</span><strong>{order.deliveryReference || '--'}</strong></div>
                      <div className="po-summary-row"><span>Fecha programada</span><strong>{order.confirmedDeliveryDate ? formatDate(order.confirmedDeliveryDate) : '--'}</strong></div>
                      <div className="po-summary-row"><span>Ventana</span><strong>{order.deliveryTimeRange || '--'}</strong></div>
                    </div>
                    <div className="po-summary-card">
                      <div className="po-summary-head"><span className="po-summary-icon"><CreditCard size={18} /></span><h3>Pago</h3></div>
                      <div className="po-summary-row"><span>Método</span><strong>{PAYMENT_METHOD_LABELS[order.paymentMethodRequested] ?? order.paymentMethodRequested}</strong></div>
                      <div className="po-summary-row"><span>Estado</span><PaymentStatusBadge status={order.clientPaymentStatus} /></div>
                      <div className="po-summary-row"><span>Comprobante</span><strong>{activePayment?.receiptFileUrl ? 'Cargado' : 'No cargado'}</strong></div>
                      <div className="po-summary-row"><span>Boleta/Autorización</span><strong>{activePayment?.authorizationCode || activePayment?.voucherNumber || '--'}</strong></div>
                    </div>
                    <div className="po-summary-card">
                      <div className="po-summary-head"><span className="po-summary-icon"><Truck size={18} /></span><h3>Operación</h3></div>
                      <div className="po-summary-row"><span>Entrega</span><DeliveryStatusBadge status={order.deliveryStatus} /></div>
                      <div className="po-summary-row"><span>Motorista</span><strong>{order.assignedDriver?.fullName || 'Sin asignar'}</strong></div>
                      <div className="po-summary-row"><span>Tel. motorista</span><strong>{order.assignedDriver?.phone || '--'}</strong></div>
                      <div className="po-summary-row"><span>Productos</span><strong>{order.items.length}</strong></div>
                    </div>
                  </section>
                ) : null}
                {activeTab === 'productos' ? (
                  <OrderPickupSection
                    canAssign={canProgramDelivery || canAssignDelivery}
                    items={order.items.map((item) => ({ id: item.id, productName: item.productName, variantLabel: item.variantLabel, brandName: item.brandName, imageUrl: item.imageUrl, sku: item.sku, quantity: item.quantity, pickupStatus: item.pickupStatus, originStore: item.originStore }))}
                    onChanged={loadOrder}
                    orderId={order.id}
                  />
                ) : null}
                {activeTab === 'pago' ? <OrderPaymentSection payment={activePayment} /> : null}
                {activeTab === 'entrega' ? (
                  <>
                    <section className="po-code-audit">
                      <h3>Validación de código de entrega</h3>
                      <div className="po-code-audit-grid">
                        <div><span>Estado</span><strong>{deliveryCodeLabel(order.deliveryCodeStatus)}</strong></div>
                        <div><span>Generado</span><strong>{order.deliveryCodeGeneratedAt ? formatDate(order.deliveryCodeGeneratedAt) : '--'}</strong></div>
                        <div><span>Validado</span><strong>{order.deliveryCodeValidatedAt ? formatDate(order.deliveryCodeValidatedAt) : '--'}</strong></div>
                        <div><span>Intentos fallidos</span><strong>{order.deliveryCodeFailedAttempts ?? 0}</strong></div>
                      </div>
                      <p>El código no se muestra en Admin. Solo el cliente lo ve cuando el pedido está en ruta.</p>
                    </section>
                    {order.incidents && order.incidents.length > 0 ? (
                      <section className="po-incidents">
                        <h3>Incidencias de entrega</h3>
                        {order.incidents.map((incident) => (
                          <div className="po-incident-card" key={incident.id}>
                            <div className="po-incident-head">
                              <strong>{incident.incidentLabel}</strong>
                              <span className="po-chip po-chip-incident">{incident.status === 'PENDIENTE_REVISION' ? 'Pendiente revisión' : incident.status}</span>
                            </div>
                            {incident.comment ? <p className="po-incident-comment">{incident.comment}</p> : null}
                            <div className="po-incident-meta">
                              <span>Motorista: {incident.driverName ?? '—'}</span>
                              <span>{formatDate(incident.reportedAt)}</span>
                            </div>
                            {incident.affectedStoreId || incident.affectedOrderItemId ? (
                              <div className="po-incident-meta">
                                <span>Tienda afectada: {incident.affectedStoreId ?? '—'}</span>
                                <span>Producto afectado: {incident.affectedOrderItemId ?? '—'}</span>
                              </div>
                            ) : null}
                            {incident.reviewedAt ? (
                              <div className="po-incident-meta">
                                <span>Revisada: {formatDate(incident.reviewedAt)}</span>
                                <span>Admin: {incident.reviewedByAdminId ?? '—'}</span>
                              </div>
                            ) : null}
                            {incident.adminResolution ? <p className="po-incident-comment"><strong>Resolución admin:</strong> {incident.adminResolution}</p> : null}
                            {incident.latitude != null && incident.longitude != null ? (
                              <a className="po-incident-link" href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`} rel="noreferrer" target="_blank">Ver ubicación reportada</a>
                            ) : null}
                            {incident.evidencePhotoUrl ? (
                              <a className="po-incident-link" href={incident.evidencePhotoUrl} rel="noreferrer" target="_blank">Ver evidencia</a>
                            ) : null}
                          </div>
                        ))}
                      </section>
                    ) : null}
                    <div className="order-detail-grid">
                      <OrderDeliveryInfo order={order} />
                      <OrderClientInfo customer={order.customer} />
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>

      {activeModal === 'visa-link' ? (
        <RegisterVisaLinkModal
          onCancel={closeModal}
          onConfirm={(data) =>
            runAction('/payments/visa-link', { visaLinkUrl: data.visaLinkUrl, comment: data.comment || undefined }, 'Enlace Visa Link registrado.')
          }
          submitting={submitting}
        />
      ) : null}

      {activeModal === 'confirm-payment' && order && activePayment ? (
        <ConfirmPaymentModal
          onCancel={closeModal}
          onConfirm={(data: ConfirmPaymentData) =>
            runAction(
              '/payments/confirm',
              {
                amount: Number(data.amount),
                paidAt: data.paidAt,
                authorizationCode: data.authorizationCode || undefined,
                voucherNumber: data.voucherNumber || undefined,
                referenceNumber: data.referenceNumber || undefined,
                notes: data.notes || undefined,
                receiptFileUrl: data.receiptFileUrl || undefined,
                receiptFileName: data.receiptFileName || undefined,
              },
              'Pago confirmado correctamente.',
            )
          }
          orderId={order.id}
          paymentMethod={activePayment.paymentMethod}
          submitting={submitting}
          totalAmount={order.totalAmount}
        />
      ) : null}

      {reasonModalConfig ? <ReasonModal isSubmitting={submitting} minLength={3} onClose={closeModal} state={reasonModalConfig} /> : null}

      {order && ['program-delivery', 'reschedule-delivery', 'assign-driver', 'change-driver'].includes(activeModal ?? '') ? (
        <DeliveryActionModal
          drivers={drivers}
          modal={activeModal as LogisticsModal}
          onCancel={closeModal}
          onSubmit={(path, body, successText) => runAction(`/delivery/${path}`, body, successText)}
          order={order}
          submitting={submitting}
        />
      ) : null}

      {order && activeIncident && ['incident-review', 'incident-reschedule', 'incident-change-address', 'incident-cancel'].includes(activeModal ?? '') ? (
        <IncidentResolutionModal
          incident={activeIncident}
          modal={activeModal as IncidentModalType}
          onCancel={closeModal}
          onSubmit={(action, body, successText) => runIncidentAction(activeIncident.id, action, body, successText)}
          order={order}
          submitting={submitting}
        />
      ) : null}
    </AdminRoutedShell>
  );
}

type LogisticsModal = 'program-delivery' | 'reschedule-delivery' | 'assign-driver' | 'change-driver';
type IncidentModalType = 'incident-review' | 'incident-reschedule' | 'incident-change-address' | 'incident-cancel';

function DeliveryActionModal({
  drivers,
  modal,
  onCancel,
  onSubmit,
  order,
  submitting,
}: {
  drivers: DriverOption[];
  modal: LogisticsModal;
  onCancel: () => void;
  onSubmit: (path: string, body: Record<string, unknown>, successText: string) => void;
  order: OrderDetail;
  submitting: boolean;
}) {
  const [date, setDate] = useState(order.confirmedDeliveryDate?.slice(0, 10) ?? '');
  const [range, setRange] = useState(order.deliveryTimeRange ?? '09:00 a 12:00');
  const [driverId, setDriverId] = useState(order.assignedDriver?.id ?? drivers[0]?.id ?? '');
  const [reasonCode, setReasonCode] = useState(modal === 'change-driver' ? 'REASIGNACION_OPERATIVA' : 'SIN_DISPONIBILIDAD');
  const [comment, setComment] = useState('');

  const titles: Record<LogisticsModal, string> = {
    'program-delivery': 'Programar entrega',
    'reschedule-delivery': 'Reprogramar entrega',
    'assign-driver': 'Asignar motorista',
    'change-driver': 'Cambiar motorista',
  };

  function submit() {
    if (modal === 'program-delivery') {
      onSubmit('program', { confirmedDeliveryDate: date, deliveryTimeRange: range, comment: comment || undefined }, 'Entrega programada correctamente.');
      return;
    }
    if (modal === 'reschedule-delivery') {
      onSubmit('reschedule', { newConfirmedDeliveryDate: date, deliveryTimeRange: range, reasonCode, comment: comment || undefined }, 'Entrega reprogramada correctamente.');
      return;
    }
    if (modal === 'assign-driver') {
      onSubmit('assign-driver', { driverId, comment: comment || undefined }, 'Motorista asignado correctamente.');
      return;
    }
    onSubmit('change-driver', { driverId, reasonCode, comment: comment || undefined }, 'Motorista cambiado correctamente.');
  }

  const needsDate = modal === 'program-delivery' || modal === 'reschedule-delivery';
  const needsDriver = modal === 'assign-driver' || modal === 'change-driver';
  const needsReason = modal === 'reschedule-delivery' || modal === 'change-driver';
  const canSubmit = (!needsDate || (date && range)) && (!needsDriver || driverId) && (!needsReason || (reasonCode && (reasonCode !== 'OTRO' || comment.trim())));

  return (
    <div className="modal-backdrop">
      <div className="modal-card order-modal-card">
        <header className="modal-header">
          <div>
            <h2>{titles[modal]}</h2>
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
            <span>Motorista</span>
            <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName} - {driver.phone}</option>)}
            </select>
          </label>
        ) : null}

        {needsReason ? (
          <label className="customer-filter-field">
            <span>Motivo</span>
            <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
              {(modal === 'change-driver'
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
          <button className="admin-primary" disabled={submitting || !canSubmit} onClick={submit} type="button">{submitting ? 'Guardando...' : titles[modal]}</button>
        </footer>
      </div>
    </div>
  );
}

function IncidentResolutionModal({
  incident,
  modal,
  onCancel,
  onSubmit,
  order,
  submitting,
}: {
  incident: OrderIncident;
  modal: IncidentModalType;
  onCancel: () => void;
  onSubmit: (action: string, body: Record<string, unknown>, successText: string) => void;
  order: OrderDetail;
  submitting: boolean;
}) {
  const [date, setDate] = useState(order.confirmedDeliveryDate?.slice(0, 10) ?? '');
  const [range, setRange] = useState(order.deliveryTimeRange ?? '09:00 a 12:00');
  const [adminResolution, setAdminResolution] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [customerVisibleComment, setCustomerVisibleComment] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress);
  const [deliveryReference, setDeliveryReference] = useState(order.deliveryReference ?? '');
  const [deliveryPhone, setDeliveryPhone] = useState(order.deliveryPhone);
  const [receiverName, setReceiverName] = useState(order.receiverName ?? '');
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundRequired, setRefundRequired] = useState(false);
  const [returnRequired, setReturnRequired] = useState(false);

  const titles: Record<IncidentModalType, string> = {
    'incident-review': 'Marcar incidencia revisada',
    'incident-reschedule': 'Reprogramar por incidencia',
    'incident-change-address': 'Cambiar dirección y reprogramar',
    'incident-cancel': 'Cancelar por incidencia',
  };

  function submit() {
    if (modal === 'incident-review') {
      onSubmit('review', { adminResolution, adminComment: adminComment || undefined }, 'Incidencia marcada como revisada.');
      return;
    }
    if (modal === 'incident-reschedule') {
      onSubmit(
        'reschedule',
        { scheduledDeliveryDate: date, deliveryTimeRange: range, adminComment: adminComment || undefined, customerVisibleComment: customerVisibleComment || undefined },
        'Entrega reprogramada después de incidencia.',
      );
      return;
    }
    if (modal === 'incident-change-address') {
      onSubmit(
        'change-address',
        {
          deliveryAddress,
          deliveryReference: deliveryReference || undefined,
          deliveryPhone,
          receiverName: receiverName || undefined,
          scheduledDeliveryDate: date,
          deliveryTimeRange: range,
          reason: adminResolution,
          adminComment: adminComment || undefined,
          customerVisibleComment: customerVisibleComment || undefined,
        },
        'Dirección actualizada y entrega reprogramada.',
      );
      return;
    }
    onSubmit(
      'cancel-order',
      {
        cancellationReason,
        adminComment: adminComment || undefined,
        customerVisibleComment: customerVisibleComment || undefined,
        refundRequired,
        returnRequired,
      },
      'Pedido cancelado por incidencia.',
    );
  }

  const needsSchedule = modal === 'incident-reschedule' || modal === 'incident-change-address';
  const needsResolution = modal === 'incident-review' || modal === 'incident-change-address';
  const canSubmit =
    (modal !== 'incident-review' || adminResolution.trim().length >= 3) &&
    (!needsSchedule || (date && range)) &&
    (modal !== 'incident-change-address' || (deliveryAddress.trim().length >= 5 && adminResolution.trim().length >= 3 && deliveryPhone.trim().length >= 8)) &&
    (modal !== 'incident-cancel' || cancellationReason.trim().length >= 3);

  return (
    <div className="modal-backdrop">
      <div className="modal-card order-modal-card">
        <header className="modal-header">
          <div>
            <h2>{titles[modal]}</h2>
            <p>{order.orderNumber} · {incident.incidentLabel}</p>
          </div>
          <button onClick={onCancel} type="button">Cerrar</button>
        </header>

        <div className="form-success">
          Incidencia: {incident.comment || 'Sin comentario del motorista.'}
        </div>

        {needsSchedule ? (
          <>
            <label className="customer-filter-field"><span>Nueva fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="customer-filter-field">
              <span>Ventana</span>
              <select value={range} onChange={(event) => setRange(event.target.value)}>
                <option>09:00 a 12:00</option>
                <option>12:00 a 15:00</option>
                <option>15:00 a 18:00</option>
              </select>
            </label>
          </>
        ) : null}

        {modal === 'incident-change-address' ? (
          <>
            <label className="customer-filter-field"><span>Nueva dirección</span><textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} /></label>
            <label className="customer-filter-field"><span>Referencia</span><textarea value={deliveryReference} onChange={(event) => setDeliveryReference(event.target.value)} /></label>
            <label className="customer-filter-field"><span>Teléfono de entrega</span><input value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} /></label>
            <label className="customer-filter-field"><span>Recibe</span><input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} /></label>
          </>
        ) : null}

        {needsResolution ? (
          <label className="customer-filter-field">
            <span>{modal === 'incident-change-address' ? 'Motivo del cambio' : 'Resolución admin'}</span>
            <textarea value={adminResolution} onChange={(event) => setAdminResolution(event.target.value)} />
          </label>
        ) : null}

        {modal === 'incident-cancel' ? (
          <>
            <label className="customer-filter-field"><span>Motivo de cancelación</span><textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} /></label>
            <label className="po-check-row"><input checked={refundRequired} onChange={(event) => setRefundRequired(event.target.checked)} type="checkbox" /> Requiere revisión de reembolso</label>
            <label className="po-check-row"><input checked={returnRequired} onChange={(event) => setReturnRequired(event.target.checked)} type="checkbox" /> Requiere devolución (preparar Slice D)</label>
          </>
        ) : null}

        {modal !== 'incident-review' ? (
          <label className="customer-filter-field">
            <span>Comentario visible para cliente (opcional)</span>
            <textarea value={customerVisibleComment} onChange={(event) => setCustomerVisibleComment(event.target.value)} />
          </label>
        ) : null}

        <label className="customer-filter-field">
          <span>Comentario interno</span>
          <textarea value={adminComment} onChange={(event) => setAdminComment(event.target.value)} />
        </label>

        <footer className="modal-actions">
          <button className="admin-secondary" onClick={onCancel} type="button">Cancelar</button>
          <button className={modal === 'incident-cancel' ? 'admin-danger' : 'admin-primary'} disabled={submitting || !canSubmit} onClick={submit} type="button">
            {submitting ? 'Guardando...' : titles[modal]}
          </button>
        </footer>
      </div>
    </div>
  );
}
