'use client';

import { ArrowLeft, Bell, Check, CheckCircle2, Clock, CreditCard, FileWarning, ImageOff, Info, Map as MapIcon, MapPin, Navigation, Package, Phone, Store, User, Wallet, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { DriverShell } from '../../components';
import IncidentModal from '../../shared/IncidentModal';
import RouteModal from '../../shared/RouteModal';
import {
  DeliveryDetail,
  completeDeliveryPickup,
  driverApiRequest,
  formatMoney,
  getDeliveryPickup,
  markItemPickedUp,
  PickupDetail,
  PickupItem,
  RouteTarget,
  startDeliveryRoute,
} from '../../lib/driverApi';

type Modal = 'confirm' | 'incident' | null;
type StoreGroup = { storeId: string; storeName: string; storeAddress?: string | null; items: PickupItem[] };

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'Contra entrega',
  VISA_LINK_MANUAL: 'Visa Link',
  TRANSFERENCIA_BANCARIA: 'Transferencia',
  DEPOSITO_BANCARIO: 'Deposito',
};

const STEP_LABELS = [
  { number: 7, label: 'En recoleccion', status: 'EN_RECOLECCION' },
  { number: 8, label: 'Recoleccion completa', status: 'RECOLECCION_COMPLETA' },
  { number: 9, label: 'En camino', status: 'EN_RUTA' },
  { number: 10, label: 'Entregado', status: 'ENTREGADA' },
] as const;

const STATUS_INDEX: Record<string, number> = {
  ASIGNADA: 0,
  EN_RECOLECCION: 0,
  RECOLECCION_COMPLETA: 1,
  EN_RUTA: 2,
  ENTREGADA: 3,
};

function groupByStore(items: PickupItem[]): StoreGroup[] {
  const map = new Map<string, StoreGroup>();
  for (const item of items) {
    const id = item.originStore?.id ?? 'SIN_TIENDA';
    let group = map.get(id);
    if (!group) {
      group = { storeId: id, storeName: item.originStore?.name ?? 'Sin tienda asignada', storeAddress: item.originStore?.address ?? null, items: [] };
      map.set(id, group);
    }
    group.items.push(item);
  }
  return [...map.values()];
}

function pickedCount(items: PickupItem[]) {
  return items.filter((item) => item.pickupStatus === 'RECOLECTADO').reduce((sum, item) => sum + item.quantity, 0);
}

function itemCount(items: PickupItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export default function DeliveryDetailPage() {
  const params = useParams<{ pedidoId: string }>();
  const orderId = params.pedidoId;
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [pickup, setPickup] = useState<PickupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [route, setRoute] = useState<{ target: RouteTarget; label: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [data, pick] = await Promise.all([
        driverApiRequest<DeliveryDetail>(`/driver/deliveries/${orderId}`),
        getDeliveryPickup(orderId).catch(() => null),
      ]);
      setDelivery(data);
      setPickup(pick);
      setNotFound(false);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo cargar la entrega.';
      if (text.toLowerCase().includes('no encontrada') || text.toLowerCase().includes('not found')) setNotFound(true);
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const header = (
    <header className="dd-op-header">
      <a aria-label="Volver" className="dd-op-back" href="/entregas"><ArrowLeft size={22} /></a>
      <div>
        <h1>Detalle de entrega</h1>
        <p>{delivery ? `Pedido ${delivery.orderNumber}` : 'Cargando pedido'}</p>
      </div>
      <button aria-label="Refrescar" className="dd-op-bell" disabled={loading} onClick={() => void load()} type="button">
        <Bell size={22} />
        <span>3</span>
      </button>
    </header>
  );

  async function markPicked(itemId: string) {
    setBusyItemId(itemId);
    setMessage(null);
    try {
      await markItemPickedUp(orderId, itemId);
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo marcar el producto.' });
    } finally {
      setBusyItemId(null);
    }
  }

  async function completePickup() {
    setSubmitting(true);
    setMessage(null);
    try {
      await completeDeliveryPickup(orderId);
      await load();
      setMessage({ type: 'success', text: 'Recoleccion completada. Ya puedes iniciar la ruta.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo completar la recoleccion.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function startRoute() {
    setSubmitting(true);
    setMessage(null);
    try {
      await startDeliveryRoute(orderId);
      await load();
      setMessage({ type: 'success', text: 'Ruta iniciada. El codigo ya esta disponible para el cliente.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo iniciar la ruta.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !delivery) {
    return <DriverShell title="Detalle de entrega" hideHeader>{header}<div className="dd-state">Cargando entrega...</div></DriverShell>;
  }

  if (notFound || !delivery) {
    return (
      <DriverShell title="Detalle de entrega" hideHeader>
        {header}
        <div className="dd-state">
          {message ? <div className="form-error">{message.text}</div> : <p>Pedido no encontrado o no asignado a ti.</p>}
          <a className="secondary-button" href="/entregas">Volver a mis entregas</a>
        </div>
      </DriverShell>
    );
  }

  const phone = delivery.customer.phone?.trim();
  const isCash = delivery.paymentMethodRequested === 'EFECTIVO_CONTRA_ENTREGA' || delivery.clientPaymentStatus === 'CONTRA_ENTREGA_PENDIENTE';
  const cityLine = [delivery.deliveryZone ? `Zona ${delivery.deliveryZone}` : null, delivery.deliveryCity].filter(Boolean).join(', ');
  const clientTarget: RouteTarget = { lat: delivery.deliveryLatitude, lng: delivery.deliveryLongitude, address: delivery.deliveryAddress };
  const storeGroups = groupByStore(pickup?.items ?? []);
  const allItems = pickup?.items ?? [];
  const collected = pickedCount(allItems);
  const totalItems = itemCount(allItems) || delivery.items.reduce((sum, item) => sum + item.quantity, 0);
  const currentStep = STATUS_INDEX[delivery.deliveryStatus] ?? 0;
  const canCompletePickup = Boolean(pickup?.readyForDelivery) && ['ASIGNADA', 'EN_RECOLECCION'].includes(delivery.deliveryStatus);
  const isPickupStage = ['ASIGNADA', 'EN_RECOLECCION'].includes(delivery.deliveryStatus);
  const isReadyStage = delivery.deliveryStatus === 'RECOLECCION_COMPLETA';
  const isRouteStage = delivery.deliveryStatus === 'EN_RUTA';
  const isDoneStage = delivery.deliveryStatus === 'ENTREGADA';
  const canReportIncident = ['ASIGNADA', 'EN_RECOLECCION', 'RECOLECCION_COMPLETA', 'EN_RUTA'].includes(delivery.deliveryStatus);

  return (
    <DriverShell title="Detalle de entrega" hideHeader>
      {header}
      <OperationStepper currentStep={currentStep} />
      {message ? <div className={`form-${message.type} dd-msg`}>{message.text}</div> : null}

      <CustomerSummary
        cityLine={cityLine}
        collected={collected}
        delivery={delivery}
        isCash={isCash}
        phone={phone}
        totalItems={totalItems}
      />

      {isPickupStage ? (
        <PickupSection
          busyItemId={busyItemId}
          canCompletePickup={canCompletePickup}
          groups={storeGroups}
          onCompletePickup={completePickup}
          onMarkPicked={markPicked}
          onOpenRoute={(target, label) => setRoute({ target, label })}
          pickup={pickup}
          submitting={submitting}
        />
      ) : null}

      {isReadyStage ? (
        <ReadyForRouteSection
          delivery={delivery}
          onStartRoute={startRoute}
          submitting={submitting}
        />
      ) : null}

      {isRouteStage ? (
        <RouteSection
          clientTarget={clientTarget}
          cityLine={cityLine}
          delivery={delivery}
          onConfirm={() => setModal('confirm')}
          onOpenRoute={(target, label) => setRoute({ target, label })}
          phone={phone}
        />
      ) : null}

      {isDoneStage ? <DeliveredSection delivery={delivery} isCash={isCash} /> : null}

      {delivery.flowIncident ? <div className="dd-incident-banner">Incidencia reportada. El equipo la esta revisando.</div> : null}
      {canReportIncident && !delivery.flowIncident && !isDoneStage ? (
        <button className="dd-outline-btn" onClick={() => setModal('incident')} type="button"><FileWarning size={18} /> Reportar incidencia</button>
      ) : null}

      {modal === 'confirm' ? <ConfirmModal delivery={delivery} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load(); }} /> : null}
      {modal === 'incident' ? <IncidentModal orderId={delivery.id} pickup={pickup} onClose={() => setModal(null)} onSaved={() => { setModal(null); setMessage({ type: 'success', text: 'Incidencia reportada. El equipo la revisara.' }); void load(); }} /> : null}
      {route ? <RouteModal label={route.label} onClose={() => setRoute(null)} target={route.target} /> : null}
    </DriverShell>
  );
}

function OperationStepper({ currentStep }: { currentStep: number }) {
  return (
    <section className="dd-operation-stepper" aria-label="Estado operativo">
      {STEP_LABELS.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <div className={`dd-op-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.number}>
            <span>{done ? <Check size={19} /> : step.number}</span>
            <strong>{step.label}</strong>
            <small>MOTORISTA</small>
          </div>
        );
      })}
    </section>
  );
}

function CustomerSummary({ delivery, phone, cityLine, isCash, collected, totalItems }: { delivery: DeliveryDetail; phone?: string; cityLine: string; isCash: boolean; collected: number; totalItems: number }) {
  return (
    <section className="dd-card dd-op-summary">
      <div className="dd-avatar"><User size={34} /></div>
      <div className="dd-op-summary-body">
        <h2>{delivery.customer.fullName}</h2>
        <div className="dd-op-meta">
          <span><Phone size={17} /> {phone || 'Sin telefono'}</span>
          <span><MapPin size={17} /> {cityLine || delivery.deliveryAddress}</span>
          <span><CreditCard size={17} /> {isCash ? 'Contra entrega' : PAYMENT_LABEL[delivery.paymentMethodRequested] ?? delivery.paymentMethodRequested}</span>
        </div>
        <div className="dd-op-summary-bottom">
          <div><small>Total</small><strong>{formatMoney(delivery.totalAmount)}</strong></div>
          <span className="dd-pickup-pill"><Package size={18} /> {collected}/{totalItems} recolectados</span>
        </div>
      </div>
    </section>
  );
}

function PickupSection({ pickup, groups, busyItemId, canCompletePickup, submitting, onMarkPicked, onCompletePickup, onOpenRoute }: {
  pickup: PickupDetail | null;
  groups: StoreGroup[];
  busyItemId: string | null;
  canCompletePickup: boolean;
  submitting: boolean;
  onMarkPicked: (itemId: string) => void;
  onCompletePickup: () => void;
  onOpenRoute: (target: RouteTarget, label: string) => void;
}) {
  return (
    <>
      <h3 className="dd-section-title">Productos por tienda <Info size={16} /></h3>
      {groups.map((group) => {
        const total = itemCount(group.items);
        const picked = pickedCount(group.items);
        return (
          <section className="dd-card dd-store-detail" key={group.storeId}>
            <header>
              <div><span className="dd-store-icon"><Store size={22} /></span><strong>{group.storeName}</strong><small>{total} producto{total === 1 ? '' : 's'}</small></div>
              <span className="dd-pickup-pill">{picked}/{total} recolectados</span>
            </header>
            {group.items.map((item) => {
              const checked = item.pickupStatus === 'RECOLECTADO';
              const canPick = ['TIENDA_ASIGNADA', 'PENDIENTE_RECOLECCION'].includes(item.pickupStatus) && Boolean(item.originStore);
              return (
                <div className="dd-pick-product" key={item.id}>
                  <div className="dd-product-img">{item.imageUrl ? <img alt="" src={item.imageUrl} /> : <ImageOff size={20} />}</div>
                  <div>
                    <strong>{item.productName}</strong>
                    <small>{item.brandName} · x{item.quantity}</small>
                    <small><MapPin size={13} /> {item.originStore?.address ?? item.originStore?.name ?? 'Sin tienda'}</small>
                  </div>
                  <button
                    aria-label={checked ? 'Producto recolectado' : 'Marcar producto recolectado'}
                    className={`dd-check ${checked ? 'checked' : ''}`}
                    disabled={checked || !canPick || busyItemId === item.id}
                    onClick={() => onMarkPicked(item.id)}
                    type="button"
                  >
                    {checked ? <Check size={18} /> : null}
                  </button>
                </div>
              );
            })}
            {group.storeId !== 'SIN_TIENDA' ? (
              <button className="dd-store-route" onClick={() => onOpenRoute({ address: group.storeAddress ?? group.storeName }, group.storeAddress ?? group.storeName)} type="button">
                <Navigation size={16} /> Abrir ruta a tienda
              </button>
            ) : null}
          </section>
        );
      })}
      <div className="dd-info-callout"><Info size={22} /> {pickup?.readyForDelivery ? 'Todos los productos fueron marcados. Confirma la recoleccion para continuar.' : 'Debes completar todos los productos o reportar una incidencia para continuar.'}</div>
      <button className="dd-primary-btn" disabled={!canCompletePickup || submitting} onClick={onCompletePickup} type="button">
        <CheckCircle2 size={19} /> {submitting ? 'Confirmando...' : 'Completar recoleccion'}
      </button>
    </>
  );
}

function ReadyForRouteSection({ delivery, submitting, onStartRoute }: { delivery: DeliveryDetail; submitting: boolean; onStartRoute: () => void }) {
  return (
    <>
      <section className="dd-card dd-ready-card">
        <CheckCircle2 size={52} />
        <h2>Recoleccion completa</h2>
        <p>Ya recibiste los productos del pedido {delivery.orderNumber}. Inicia ruta cuando salgas hacia el cliente.</p>
      </section>
      <button className="dd-primary-btn" disabled={submitting} onClick={onStartRoute} type="button"><Navigation size={19} /> {submitting ? 'Iniciando...' : 'Iniciar ruta'}</button>
    </>
  );
}

function RouteSection({ delivery, phone, cityLine, clientTarget, onOpenRoute, onConfirm }: { delivery: DeliveryDetail; phone?: string; cityLine: string; clientTarget: RouteTarget; onOpenRoute: (target: RouteTarget, label: string) => void; onConfirm: () => void }) {
  return (
    <>
      <section className="dd-card dd-route-card">
        <header><h2>En camino a la entrega</h2><span><Clock size={16} /> 12 min</span></header>
        <div className="dd-map-preview">
          <span className="dd-map-current"><Navigation size={20} /></span>
          <span className="dd-map-pin"><MapPin size={34} /></span>
          <svg viewBox="0 0 320 120" aria-hidden="true"><polyline points="34,72 88,82 134,62 178,72 220,45 286,64" /></svg>
        </div>
        <div className="dd-route-address">
          <MapPin size={31} />
          <div><small>Direccion de entrega</small><strong>{cityLine || delivery.deliveryAddress}</strong><span>{delivery.deliveryReference || delivery.deliveryAddress}</span></div>
        </div>
        <div className="dd-secondary-actions">
          {phone ? <a className="dd-secondary-btn" href={`tel:${phone}`}><Phone size={17} /> Llamar cliente</a> : <button className="dd-secondary-btn" disabled type="button"><Phone size={17} /> Llamar cliente</button>}
          <button className="dd-secondary-btn" onClick={() => onOpenRoute(clientTarget, delivery.deliveryAddress)} type="button"><MapIcon size={17} /> Abrir mapa</button>
        </div>
      </section>
      <div className="dd-info-callout"><Info size={22} /> Pedido listo para entregar</div>
      <button className="dd-primary-btn" onClick={onConfirm} type="button"><CheckCircle2 size={19} /> Llegue al destino</button>
    </>
  );
}

function DeliveredSection({ delivery, isCash }: { delivery: DeliveryDetail; isCash: boolean }) {
  const deliveredAt = delivery.deliveryCodeValidatedAt ? new Date(delivery.deliveryCodeValidatedAt) : null;
  return (
    <>
      <section className="dd-card dd-delivered-card">
        <div className="dd-success-mark"><Check size={42} /></div>
        <h2>Entrega completada</h2>
        <p>El pedido fue entregado correctamente.</p>
        <div className="dd-delivered-lines">
          <span><Wallet size={20} /> Metodo de pago:<strong>{isCash ? 'Contra entrega' : PAYMENT_LABEL[delivery.paymentMethodRequested] ?? delivery.paymentMethodRequested}</strong></span>
          <span><CreditCard size={20} /> Cobro recibido:<strong>{isCash ? formatMoney(delivery.totalAmount) : 'Pago validado'}</strong></span>
          <span><Clock size={20} /> Hora de entrega:<strong>{deliveredAt ? deliveredAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : 'Registrada'}</strong></span>
          <span><CheckCircle2 size={20} /> Codigo:<strong>Validado</strong></span>
        </div>
      </section>
      <a className="dd-primary-btn" href={`/entregas/${delivery.id}`}>Ver resumen</a>
      <a className="dd-outline-btn" href="/entregas">Finalizar</a>
    </>
  );
}

function ConfirmModal({ delivery, onClose, onSaved }: { delivery: DeliveryDetail; onClose: () => void; onSaved: () => void }) {
  const [deliveryCode, setDeliveryCode] = useState('');
  const [deliveryComment, setDeliveryComment] = useState('');
  const [receivedCash, setReceivedCash] = useState(false);
  const [amountReceived, setAmountReceived] = useState(String(delivery.totalAmount));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isCash = delivery.paymentMethodRequested === 'EFECTIVO_CONTRA_ENTREGA';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deliveryCode.trim()) {
      setError('Ingresa el codigo que ve el cliente.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await driverApiRequest<DeliveryDetail>(`/driver/deliveries/${delivery.id}/confirm-delivery`, {
        method: 'POST',
        body: JSON.stringify({
          deliveredAt: new Date().toISOString(),
          deliveryCode: deliveryCode.trim(),
          deliveryComment: deliveryComment.trim() || undefined,
          receivedCash: isCash ? receivedCash : undefined,
          amountReceived: isCash ? Number(amountReceived) : undefined,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la entrega.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel delivery-code-modal" onSubmit={submit}>
        <div className="driver-modal-title"><h2>Validar entrega</h2><button aria-label="Cerrar" onClick={onClose} type="button"><X size={19} /></button></div>
        <p className="delivery-code-help">Solicita al cliente el codigo visible en su pedido. Sin ese codigo no se puede cerrar la entrega.</p>
        {error ? <div className="form-error">{error}</div> : null}
        <label className="field">Codigo de entrega
          <input autoFocus inputMode="numeric" maxLength={12} value={deliveryCode} onChange={(event) => setDeliveryCode(event.target.value.replace(/\s/g, ''))} placeholder="000000" />
        </label>
        {isCash ? (
          <>
            <label className="field">Efectivo recibido<input inputMode="decimal" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} /></label>
            <label className="field field-check"><span><input checked={receivedCash} onChange={(event) => setReceivedCash(event.target.checked)} type="checkbox" /> Recibi efectivo completo</span></label>
          </>
        ) : null}
        <label className="field">Comentario opcional<textarea value={deliveryComment} onChange={(event) => setDeliveryComment(event.target.value)} placeholder="Ej. entregado a recepcion" /></label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">Cancelar</button>
          <button className="primary-button" disabled={submitting || !deliveryCode.trim() || (isCash && !receivedCash)} type="submit">{submitting ? 'Validando...' : 'Confirmar entrega'}</button>
        </div>
      </form>
    </div>
  );
}
