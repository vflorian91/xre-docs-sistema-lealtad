'use client';

import { useState } from 'react';

export default function RegisterVisaLinkModal({
  onCancel,
  onConfirm,
  submitting,
}: {
  onCancel: () => void;
  onConfirm: (data: { visaLinkUrl: string; comment: string }) => void;
  submitting: boolean;
}) {
  const [visaLinkUrl, setVisaLinkUrl] = useState('');
  const [comment, setComment] = useState('');

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>Registrar enlace Visa Link</h2>
        <p>Pega el enlace de pago generado fuera del sistema. El sistema no genera ni envia enlaces automaticamente.</p>
        <label>
          Enlace de pago
          <input onChange={(event) => setVisaLinkUrl(event.target.value)} placeholder="https://..." value={visaLinkUrl} />
        </label>
        <label>
          Comentario (opcional)
          <textarea onChange={(event) => setComment(event.target.value)} value={comment} />
        </label>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={submitting || visaLinkUrl.trim().length < 8} onClick={() => onConfirm({ visaLinkUrl, comment })} type="button">
            {submitting ? 'Guardando...' : 'Registrar enlace'}
          </button>
        </div>
      </section>
    </div>
  );
}
