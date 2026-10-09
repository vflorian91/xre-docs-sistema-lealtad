'use client';

import { Clock3, ImageIcon, Save, ShoppingBag, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApiRequest, getErrorText } from '../../../../lib/adminApi';
import { assignOriginStore } from '../lib/pickupApi';

type PickupItem = {
  id: string;
  productName: string;
  variantLabel?: string | null;
  brandName: string;
  imageUrl?: string | null;
  sku?: string | null;
  quantity: number;
  pickupStatus?: string | null;
  originStore?: { id: string; code: string; name: string } | null;
};

type StoreOption = { id: string; code: string; name: string };

const PICKUP_LABELS: Record<string, string> = {
  PENDIENTE_ASIGNAR_TIENDA: 'Pendiente asignación',
  TIENDA_ASIGNADA: 'Tienda asignada',
  PENDIENTE_RECOLECCION: 'Pendiente recolección',
  RECOLECTADO: 'Recolectado',
  NO_DISPONIBLE: 'No disponible',
  SUSTITUCION_REQUERIDA: 'Sustitución requerida',
  CANCELADO: 'Cancelado',
};

const ASSIGNABLE_STATUSES = ['PENDIENTE_ASIGNAR_TIENDA', 'TIENDA_ASIGNADA', 'PENDIENTE_RECOLECCION'];

export default function OrderPickupSection({
  orderId,
  items,
  canAssign,
  onChanged,
}: {
  orderId: string;
  items: PickupItem[];
  canAssign: boolean;
  onChanged: () => void;
}) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!canAssign) return;
    adminApiRequest<StoreOption[]>('/stores/public')
      .then((result) => setStores(result))
      .catch(() => setStores([]));
  }, [canAssign]);

  async function assign(itemId: string) {
    const storeId = selected[itemId];
    if (!storeId) {
      setMessage({ type: 'error', text: 'Selecciona una tienda origen.' });
      return;
    }
    setBusyId(itemId);
    setMessage(null);
    try {
      await assignOriginStore(orderId, itemId, storeId);
      setMessage({ type: 'success', text: 'Tienda origen guardada.' });
      onChanged();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo asignar la tienda origen.') });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="po-pickup-section">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      <p className="po-pickup-hint">
        El admin asigna la tienda origen por producto. Esta asignación se usará para la preparación y recolección.
      </p>

      <div className="po-pickup-list">
        {items.map((item) => {
          const status = item.pickupStatus ?? 'PENDIENTE_ASIGNAR_TIENDA';
          const assignable = canAssign && ASSIGNABLE_STATUSES.includes(status);
          const selectedStore = selected[item.id] ?? item.originStore?.id ?? '';
          const currentStoreName = item.originStore?.name ?? 'Sin asignar';

          return (
            <article className="po-pickup-row" key={item.id}>
              <div className="po-product-thumb">
                {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <ImageIcon size={38} />}
                <span>x{item.quantity}</span>
              </div>

              <div className="po-pickup-info">
                <strong>{item.productName}</strong>
                {item.variantLabel ? <small>{item.variantLabel}</small> : null}
                <small><Tag size={13} /> SKU: {item.sku ?? item.id.slice(-8).toUpperCase()} <span>•</span> <ShoppingBag size={13} /> Tienda Online</small>
                <small>Tienda actual: <b>{currentStoreName}</b></small>
              </div>

              <span className={`po-chip po-assignment-status ${status === 'PENDIENTE_ASIGNAR_TIENDA' ? 'pending' : status === 'RECOLECTADO' ? 'po-pickup-ok' : 'po-pickup-muted'}`}>
                <Clock3 size={13} /> {PICKUP_LABELS[status] ?? 'Pendiente'}
              </span>

              {assignable ? (
                <div className="po-pickup-assign">
                  <label>
                    <span>Tienda origen</span>
                    <select
                      onChange={(event) => setSelected((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      value={selectedStore}
                    >
                      <option value="">Selecciona tienda...</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="po-btn compact"
                    disabled={busyId === item.id || !selectedStore}
                    onClick={() => assign(item.id)}
                    type="button"
                  >
                    <Save size={15} /> {busyId === item.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
