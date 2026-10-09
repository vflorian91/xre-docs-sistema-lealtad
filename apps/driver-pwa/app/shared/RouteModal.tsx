'use client';

import { MapPin, Navigation } from 'lucide-react';
import { googleMapsUrl, RouteTarget, wazeUrl } from '../lib/driverApi';

export default function RouteModal({ target, label, onClose }: { target: RouteTarget; label: string; onClose: () => void }) {
  function open(url: string) {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel route-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Abrir ruta con</h2>
        <p className="route-modal-target"><MapPin size={14} /> {label}</p>
        <button className="primary-button" onClick={() => open(googleMapsUrl(target))} type="button">
          <Navigation size={16} /> Google Maps
        </button>
        <button className="primary-button waze" onClick={() => open(wazeUrl(target))} type="button">
          <Navigation size={16} /> Waze
        </button>
        <button className="secondary-button" onClick={onClose} type="button">Cancelar</button>
      </div>
    </div>
  );
}
