'use client';

import { ImageOff, Store } from 'lucide-react';
import { formatMoney } from '../../../../lib/format';

export type BrandGroupItem = {
  id: string;
  productName: string;
  variantLabel?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  pickupStatus?: string | null;
  originStore?: { id: string; code: string; name: string } | null;
};

export type BrandGroup = {
  brandId: string;
  brandName: string;
  brandLogoUrl?: string | null;
  subtotal: number;
  totalItems: number;
  items: BrandGroupItem[];
};

const PICKUP_LABELS: Record<string, string> = {
  PENDIENTE_ASIGNAR_TIENDA: 'Pendiente asignar tienda',
  TIENDA_ASIGNADA: 'Tienda asignada',
  PENDIENTE_RECOLECCION: 'Pendiente recolección',
  RECOLECTADO: 'Recolectado',
  NO_DISPONIBLE: 'No disponible',
  SUSTITUCION_REQUERIDA: 'Sustitución requerida',
  CANCELADO: 'Cancelado',
  DEVUELTO_PENDIENTE_REVISION: 'Devuelto (revisión)',
  REINTEGRADO: 'Reintegrado',
};

function pickupTone(status?: string | null) {
  if (status === 'RECOLECTADO' || status === 'REINTEGRADO') return 'ok';
  if (status === 'NO_DISPONIBLE' || status === 'SUSTITUCION_REQUERIDA' || status === 'CANCELADO') return 'warn';
  return 'muted';
}

export default function OrderProductsByBrand({
  brandGroups,
  subtotalAmount,
  shippingAmount,
  totalAmount,
}: {
  brandGroups: BrandGroup[];
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
}) {
  return (
    <div className="po-brand-groups">
      {brandGroups.map((group) => (
        <section className="po-brand-group" key={group.brandId}>
          <header className="po-brand-group-head">
            <strong>{group.brandName}</strong>
            <span className="po-brand-group-meta">
              {group.totalItems} prod. · Q{formatMoney(group.subtotal)}
            </span>
          </header>
          <div className="po-brand-group-items">
            {group.items.map((item) => (
              <div className="po-brand-item" key={item.id}>
                <div className="po-brand-item-img">{item.imageUrl ? <img alt={item.productName} src={item.imageUrl} /> : <ImageOff size={18} />}</div>
                <div className="po-brand-item-info">
                  <span className="po-brand-item-name">{item.productName}</span>
                  {item.variantLabel ? <span className="po-brand-item-sub">{item.variantLabel}</span> : null}
                  {item.sku ? <span className="po-brand-item-sub">SKU: {item.sku}</span> : null}
                  <span className="po-brand-item-sub">
                    {item.quantity} × Q{formatMoney(item.unitPrice)} = Q{formatMoney(item.subtotal)}
                  </span>
                  <span className="po-brand-item-store">
                    <Store size={12} /> {item.originStore ? item.originStore.name : 'Sin tienda origen'}
                  </span>
                </div>
                <span className={`po-chip po-pickup-${pickupTone(item.pickupStatus)}`}>
                  {PICKUP_LABELS[item.pickupStatus ?? ''] ?? 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="po-brand-totals">
        <div className="po-summary-row"><span>Subtotal</span><strong>Q{formatMoney(subtotalAmount)}</strong></div>
        <div className="po-summary-row"><span>Envío</span><strong>Q{formatMoney(shippingAmount)}</strong></div>
        <div className="po-summary-row is-total"><span>Total</span><strong>Q{formatMoney(totalAmount)}</strong></div>
      </div>
    </div>
  );
}
