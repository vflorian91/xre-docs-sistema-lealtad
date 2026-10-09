'use client';

import { useRef, useState } from 'react';
import { adminApiRequest, getErrorText, readFileAsBase64 } from '../../../../lib/adminApi';

export type ConfirmPaymentData = {
  amount: string;
  paidAt: string;
  authorizationCode: string;
  voucherNumber: string;
  referenceNumber: string;
  notes: string;
  receiptFileUrl: string;
  receiptFileName: string;
};

export default function ConfirmPaymentModal({
  onCancel,
  onConfirm,
  orderId,
  paymentMethod,
  submitting,
  totalAmount,
}: {
  onCancel: () => void;
  onConfirm: (data: ConfirmPaymentData) => void;
  orderId: string;
  paymentMethod: string;
  submitting: boolean;
  totalAmount: number;
}) {
  const [amount, setAmount] = useState(String(totalAmount.toFixed(2)));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFileUrl, setReceiptFileUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isVisaLink = paymentMethod === 'VISA_LINK_MANUAL';
  const isBankPayment = paymentMethod === 'TRANSFERENCIA_BANCARIA' || paymentMethod === 'DEPOSITO_BANCARIO';
  const requiresReceipt = isVisaLink || isBankPayment;

  async function handleFile(file?: File) {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setError('El comprobante debe ser PDF, JPG, JPEG o PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El comprobante no debe superar los 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await adminApiRequest<{ asset: { publicUrl: string } }>('/media/store/payments/receipt', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          purpose: 'STORE_PAYMENT_RECEIPT',
          filename: file.name,
          mimeType: file.type,
          dataBase64: await readFileAsBase64(file),
        }),
      });
      setReceiptFileUrl(result.asset.publicUrl);
      setReceiptFileName(file.name);
    } catch (uploadError) {
      setError(getErrorText(uploadError, 'No se pudo subir el comprobante.'));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (Number(amount) !== Number(totalAmount.toFixed(2))) {
      setError('El monto debe coincidir exactamente con el total del pedido.');
      return;
    }
    if (isVisaLink && (!authorizationCode.trim() || !referenceNumber.trim())) {
      setError('Para Visa Link, autorizacion y referencia son obligatorios.');
      return;
    }
    if (isBankPayment && !referenceNumber.trim()) {
      setError('Para transferencia o deposito, la referencia es obligatoria.');
      return;
    }
    if (requiresReceipt && !receiptFileUrl) {
      setError('Debes subir el comprobante de pago.');
      return;
    }

    setError(null);
    onConfirm({ amount, paidAt, authorizationCode, voucherNumber, referenceNumber, notes, receiptFileUrl, receiptFileName });
  }

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>Confirmar pago</h2>
        <p>No se permiten cobros parciales: el monto debe coincidir exactamente con el total del pedido.</p>
        {error ? <p className="confirm-field-error">{error}</p> : null}
        <label>
          Monto
          <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
        </label>
        <label>
          Fecha de pago
          <input onChange={(event) => setPaidAt(event.target.value)} type="date" value={paidAt} />
        </label>
        {isVisaLink ? (
          <label>
            Numero de autorizacion
            <input onChange={(event) => setAuthorizationCode(event.target.value)} value={authorizationCode} />
          </label>
        ) : null}
        {isVisaLink || isBankPayment ? (
          <label>
            Numero de referencia
            <input onChange={(event) => setReferenceNumber(event.target.value)} value={referenceNumber} />
          </label>
        ) : null}
        {requiresReceipt ? (
          <label>
            Comprobante de pago
            <input accept="application/pdf,image/jpeg,image/png" onChange={(event) => handleFile(event.target.files?.[0])} ref={fileInput} type="file" />
            {uploading ? <small>Subiendo comprobante...</small> : null}
            {receiptFileName ? <small>Archivo cargado: {receiptFileName}</small> : null}
          </label>
        ) : null}
        {!isVisaLink ? (
          <label>
            Observacion (opcional)
            <textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>
        ) : null}
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={submitting || uploading} onClick={submit} type="button">
            {submitting ? 'Confirmando...' : 'Confirmar pago'}
          </button>
        </div>
      </section>
    </div>
  );
}
