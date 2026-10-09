'use client';

import { Check } from 'lucide-react';

const STEPS = ['Buscar cliente', 'Seleccionar cliente', 'Registrar canje', 'Confirmar'] as const;

export function CanjeStepper({ activeStep, allDone }: { activeStep: number; allDone?: boolean }) {
  return (
    <ol className="canje-stepper">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const state = allDone || stepNumber < activeStep ? 'done' : stepNumber === activeStep ? 'active' : 'pending';
        return (
          <li className={`canje-step ${state}`} key={label}>
            <span className="canje-step-bullet">{state === 'done' ? <Check size={15} /> : stepNumber}</span>
            <span className="canje-step-label">{label}</span>
            {stepNumber < STEPS.length ? <span className="canje-step-line" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
