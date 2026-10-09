'use client';

import { MapPin, Plus } from 'lucide-react';
import { CustomerAddress } from '../lib/clientStoreApi';

type Props = {
  addresses: CustomerAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  loading?: boolean;
};

export default function AddressSelector({ addresses, selectedId, onSelect, onAddNew, loading }: Props) {
  return (
    <div className="store-address-selector">
      {loading ? <div className="store-loading">Cargando direcciones...</div> : null}

      {!loading && addresses.length === 0 ? (
        <p className="store-address-empty">Aún no tienes direcciones guardadas. Agrega una para continuar.</p>
      ) : null}

      {addresses.map((address) => (
        <label className={`store-address-option${selectedId === address.id ? ' is-selected' : ''}`} key={address.id}>
          <input checked={selectedId === address.id} name="deliveryAddress" onChange={() => onSelect(address.id)} type="radio" />
          <span className="store-address-option-body">
            <span className="store-address-option-title">
              <MapPin size={14} />
              <strong>{address.label}</strong>
              {address.isDefault ? <span className="store-address-default">Predeterminada</span> : null}
            </span>
            <small>
              {address.addressLine}
              {address.zone ? `, Zona ${address.zone}` : ''} · {address.municipality}, {address.department}
            </small>
            <small>Tel: {address.contactPhone}</small>
          </span>
        </label>
      ))}

      <button className="store-address-add" onClick={onAddNew} type="button">
        <Plus size={16} /> Agregar dirección
      </button>
    </div>
  );
}
