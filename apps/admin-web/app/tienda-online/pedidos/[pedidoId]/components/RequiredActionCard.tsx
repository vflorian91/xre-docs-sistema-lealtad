'use client';

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export type NextAction = { stageKey: string; action: string; label: string } | null;

const ADMIN_ACTION_COPY: Record<string, { title: string; button: string }> = {
  APPROVE_PAYMENT: { title: 'Revisa el comprobante y confirma (o rechaza) el pago reportado por el cliente.', button: 'Revisar pago' },
  SCHEDULE_DELIVERY: { title: 'El pago está confirmado. Programa la fecha y ventana de entrega.', button: 'Programar entrega' },
  ASSIGN_ORIGIN_STORE: { title: 'Asigna la tienda origen a cada producto para habilitar la recolección.', button: 'Asignar tiendas origen' },
  ASSIGN_DRIVER: { title: 'La entrega está programada. Asigna un motorista.', button: 'Asignar motorista' },
  REVIEW_INCIDENT: { title: 'Revisa la incidencia de entrega reportada por el motorista.', button: 'Ver incidencia' },
};

const ACTOR_WAIT_COPY: Record<string, string> = {
  CLIENT: 'Esperando una acción del cliente',
  DRIVER: 'Esperando una acción del motorista',
};

export default function RequiredActionCard({
  nextAction,
  currentStageActor,
  currentStageLabel,
  terminal,
  incident,
  onAction,
  corrective,
  paymentMethodLabel,
  totalLabel,
}: {
  nextAction: NextAction;
  currentStageActor: 'CLIENT' | 'ADMIN' | 'DRIVER' | null;
  currentStageLabel: string | null;
  terminal: 'DELIVERED' | 'CANCELLED' | null;
  incident?: boolean;
  onAction: (action: string) => void;
  corrective?: React.ReactNode;
  paymentMethodLabel: string;
  totalLabel: string;
}) {
  let tone = 'wait';
  let icon = <Info size={20} />;
  let title = 'Sin acciones pendientes';
  let description = currentStageLabel ? `Etapa actual: ${currentStageLabel}.` : 'El pedido está en curso.';

  if (terminal === 'DELIVERED') {
    tone = 'done';
    icon = <CheckCircle2 size={20} />;
    title = 'Pedido finalizado';
    description = 'El pedido fue entregado. No hay más acciones operativas.';
  } else if (terminal === 'CANCELLED') {
    tone = 'cancelled';
    icon = <XCircle size={20} />;
    title = 'Pedido cerrado';
    description = 'El pedido fue cancelado o cerrado por incidencia.';
  } else if (incident) {
    tone = 'incident';
    icon = <AlertTriangle size={20} />;
    title = nextAction?.action === 'REVIEW_INCIDENT' ? 'Revisar incidencia de entrega' : 'Incidencia de entrega';
    description = 'Hay una incidencia activa. Revisa el caso y decide cómo continuar.';
  } else if (nextAction && currentStageActor === 'ADMIN') {
    tone = 'admin';
    icon = <Info size={20} />;
    const copy = ADMIN_ACTION_COPY[nextAction.action] ?? { title: nextAction.label, button: nextAction.label };
    title = 'Siguiente acción requerida';
    description = copy.title;
  } else {
    tone = 'wait';
    icon = <Info size={20} />;
    title = currentStageActor ? ACTOR_WAIT_COPY[currentStageActor] ?? 'En espera' : 'En espera';
    description = `${description} El admin no tiene una acción pendiente en este momento.`;
  }

  return (
    <section className={`po-required-card tone-${tone}`}>
      <div className="po-required-icon">{icon}</div>
      <div className="po-required-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="po-required-metrics">
        <div className="po-required-metric"><span>Método de pago</span><strong>{paymentMethodLabel}</strong></div>
        <div className="po-required-metric"><span>Total</span><strong>{totalLabel}</strong></div>
      </div>
      {nextAction && currentStageActor === 'ADMIN' && nextAction.action !== 'ASSIGN_ORIGIN_STORE' && !incident && !terminal ? (
        <button className="po-btn primary compact" onClick={() => onAction(nextAction.action)} type="button">
          {ADMIN_ACTION_COPY[nextAction.action]?.button ?? nextAction.label}
        </button>
      ) : null}
      {corrective ? <div className="po-action-buttons">{corrective}</div> : null}
    </section>
  );
}
