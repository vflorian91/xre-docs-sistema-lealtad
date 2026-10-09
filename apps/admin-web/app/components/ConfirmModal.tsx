'use client';

export type ConfirmModalState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmModal({
  state,
  onClose,
  isSubmitting,
}: {
  state: ConfirmModalState;
  onClose: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div className="confirm-backdrop" role="presentation" onClick={onClose}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-modal-title">{state.title}</h2>
        <p>{state.description}</p>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={isSubmitting} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="admin-primary" disabled={isSubmitting} onClick={() => void state.onConfirm()} type="button">
            {isSubmitting ? 'Procesando...' : state.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
