'use client';

import { DriverFlowStage } from '../lib/driverApi';

// El motorista ve SOLO su sub-flujo (no el flujo administrativo completo).
const DRIVER_STAGES: Array<{ key: string; label: string }> = [
  { key: 'MOTORISTA_ASIGNADO', label: 'Asignado' },
  { key: 'EN_RECOLECCION', label: 'En recolección' },
  { key: 'RECOLECCION_COMPLETA', label: 'Recolección completa' },
  { key: 'EN_CAMINO', label: 'En camino' },
  { key: 'ENTREGADO', label: 'Entregado' },
];

export default function DriverFlowStepper({ flow }: { flow: DriverFlowStage[] }) {
  const byKey = new Map(flow.map((stage) => [stage.key, stage]));
  return (
    <div className="driver-stepper">
      {DRIVER_STAGES.map((stage, index) => {
        const real = byKey.get(stage.key);
        const status = real?.status ?? 'BLOCKED';
        const cls = status === 'COMPLETED' ? 'done' : status === 'CURRENT' ? 'current' : 'blocked';
        return (
          <div className={`driver-step ${cls}`} key={stage.key}>
            <span className="driver-step-dot">{index + 1}</span>
            <span className="driver-step-label">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}
