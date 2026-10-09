'use client';

import { FormEvent, useState } from 'react';
import { createCustomerAddress, CustomerAddress, getErrorText } from '../lib/clientStoreApi';

type Props = {
  onClose: () => void;
  onCreated: (address: CustomerAddress) => void;
};

export default function AddressFormModal({ onClose, onCreated }: Props) {
  const [label, setLabel] = useState('');
  const [department, setDepartment] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [zone, setZone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [reference, setReference] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !department.trim() || !municipality.trim() || !addressLine.trim() || contactPhone.length !== 8) {
      setError('Completa los campos obligatorios. El teléfono debe tener 8 dígitos.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const address = await createCustomerAddress({
        label: label.trim(),
        department: department.trim(),
        municipality: municipality.trim(),
        zone: zone.trim() || null,
        addressLine: addressLine.trim(),
        reference: reference.trim() || null,
        contactPhone,
        isDefault: makeDefault,
      });
      onCreated(address);
    } catch (err) {
      setError(getErrorText(err, 'No se pudo guardar la dirección.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="store-modal-overlay">
      <div className="store-modal">
        <h2>Nueva dirección</h2>
        {error ? <div className="store-message error">{error}</div> : null}
        <form className="store-address-form" onSubmit={handleSubmit}>
          <label className="store-form-field">
            Nombre de referencia
            <input onChange={(e) => setLabel(e.target.value)} placeholder="Casa, Oficina..." value={label} />
          </label>
          <label className="store-form-field">
            Departamento
            <input onChange={(e) => setDepartment(e.target.value)} value={department} />
          </label>
          <label className="store-form-field">
            Municipio
            <input onChange={(e) => setMunicipality(e.target.value)} value={municipality} />
          </label>
          <label className="store-form-field">
            Zona (opcional)
            <input onChange={(e) => setZone(e.target.value)} value={zone} />
          </label>
          <label className="store-form-field">
            Dirección exacta
            <input onChange={(e) => setAddressLine(e.target.value)} value={addressLine} />
          </label>
          <label className="store-form-field">
            Referencia (opcional)
            <input onChange={(e) => setReference(e.target.value)} value={reference} />
          </label>
          <label className="store-form-field">
            Teléfono de contacto
            <input
              inputMode="numeric"
              onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
              value={contactPhone}
            />
          </label>
          <label className="store-address-default-check">
            <input checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} type="checkbox" />
            Usar como dirección predeterminada
          </label>
          <div className="store-modal-actions">
            <button className="store-button-secondary" disabled={submitting} onClick={onClose} type="button">Cancelar</button>
            <button className="store-button-primary" disabled={submitting} type="submit">
              {submitting ? 'Guardando...' : 'Guardar dirección'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
