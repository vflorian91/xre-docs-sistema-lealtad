'use client';

export type FlowStage = {
  key: string;
  label: string;
  actor: 'CLIENT' | 'ADMIN' | 'DRIVER';
  status: 'COMPLETED' | 'CURRENT' | 'BLOCKED';
  action: string | null;
};

const ACTOR_LABELS: Record<FlowStage['actor'], string> = {
  CLIENT: 'Cliente',
  ADMIN: 'Admin',
  DRIVER: 'Motorista',
};

export default function OrderFlowStepper({ stages, incident }: { stages: FlowStage[]; incident?: boolean }) {
  return (
    <section className="po-stepper-card">
      <div className="po-stepper-head">
        <h3>Flujo del pedido</h3>
        {incident ? <span className="po-chip po-chip-incident">Incidencia activa</span> : null}
      </div>
      <ol className="po-stepper">
        {stages.map((stage, index) => {
          const cls = stage.status === 'COMPLETED' ? 'done' : stage.status === 'CURRENT' ? 'current' : 'blocked';
          return (
            <li className={`po-step ${cls}`} key={stage.key}>
              <span className="po-step-bullet">{index + 1}</span>
              <span className="po-step-body">
                <span className="po-step-label">{stage.label}</span>
                <span className={`po-step-actor actor-${stage.actor.toLowerCase()}`}>{ACTOR_LABELS[stage.actor]}</span>
              </span>
              <span className="po-step-state">
                {stage.status === 'COMPLETED' ? 'Completado' : stage.status === 'CURRENT' ? 'Actual' : 'Bloqueado'}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
