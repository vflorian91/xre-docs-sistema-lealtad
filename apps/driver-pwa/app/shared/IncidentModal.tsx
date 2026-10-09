'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getIncidentTypes, IncidentType, PickupDetail, reportIncident } from '../lib/driverApi';

export default function IncidentModal({ orderId, pickup, onClose, onSaved }: { orderId: string; pickup?: PickupDetail | null; onClose: () => void; onSaved: () => void }) {
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [code, setCode] = useState('');
  const [storeId, setStoreId] = useState('');
  const [itemId, setItemId] = useState('');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getIncidentTypes()
      .then((result) => {
        setTypes(result);
        setCode(result[0]?.code ?? '');
      })
      .catch(() => setTypes([]));
  }, []);

  const selected = types.find((t) => t.code === code);
  const stores = Array.from(new Map((pickup?.items ?? []).filter((item) => item.originStore).map((item) => [item.originStore!.id, item.originStore!])).values());
  const products = (pickup?.items ?? []).filter((item) => !storeId || item.originStore?.id === storeId);

  function captureLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('denied');
      return;
    }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('ok');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code) {
      setError('Selecciona el tipo de incidencia.');
      return;
    }
    if (selected?.requiresComment && !comment.trim()) {
      setError('Esta incidencia requiere un comentario.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await reportIncident(orderId, {
        incidentType: code,
        affectedStoreId: storeId || undefined,
        affectedOrderItemId: itemId || undefined,
        comment: comment.trim() || undefined,
        evidencePhotoUrl: photoUrl.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reportar la incidencia.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel driver-incident-modal" onSubmit={submit}>
        <div className="driver-modal-title"><h2>Reportar incidencia</h2><button aria-label="Cerrar" onClick={onClose} type="button">×</button></div>
        {error ? <div className="form-error">{error}</div> : null}

        {stores.length > 0 ? (
          <label className="field">Tienda afectada
            <select value={storeId} onChange={(event) => { setStoreId(event.target.value); setItemId(''); }}>
              <option value="">Selecciona una tienda</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
        ) : null}

        {products.length > 0 ? (
          <label className="field">Producto afectado
            <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">Selecciona un producto</option>
              {products.map((item) => <option key={item.id} value={item.id}>{item.productName}</option>)}
            </select>
          </label>
        ) : null}

        <label className="field">Tipo de incidencia
          <select value={code} onChange={(event) => setCode(event.target.value)}>
            {types.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}
          </select>
        </label>
        <div className="incident-examples">
          {types.slice(0, 5).map((type) => <button key={type.code} onClick={() => setCode(type.code)} type="button">{type.label}</button>)}
        </div>
        {selected ? <p className="incident-desc">{selected.description}</p> : null}

        <label className="field">Comentario{selected?.requiresComment ? ' *' : ' (opcional)'}
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Describe lo que ocurrió" />
        </label>

        {selected?.recommendsPhoto ? (
          <label className="field">Evidencia (URL de foto)
            <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://… (opcional)" />
          </label>
        ) : null}

        <button className="secondary-button" onClick={captureLocation} type="button">
          {geoState === 'loading' ? 'Obteniendo ubicación…' : geoState === 'ok' ? `Ubicación capturada ✓` : 'Capturar mi ubicación'}
        </button>
        {geoState === 'denied' ? <p className="incident-desc">Sin permiso de ubicación: se reportará sin GPS.</p> : null}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">Cancelar</button>
          <button className="primary-button" disabled={submitting} type="submit">{submitting ? 'Guardando…' : 'Guardar incidencia'}</button>
        </div>
      </form>
    </div>
  );
}
