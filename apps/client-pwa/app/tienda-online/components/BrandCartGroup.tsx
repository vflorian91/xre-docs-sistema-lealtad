'use client';

import { ImageOff, Store } from 'lucide-react';
import { absoluteStoreMediaUrl, formatStoreMoney, StoreBrandGroup } from '../lib/clientStoreApi';

type Props = {
  group: StoreBrandGroup;
  selected: boolean;
  onToggle: (brandId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  busyItemId?: string | null;
};

export default function BrandCartGroup({ group, selected, onToggle, onQuantityChange, onRemove, busyItemId }: Props) {
  const logo = absoluteStoreMediaUrl(group.brandLogoUrl);

  return (
    <section className={`store-brand-group${selected ? ' is-selected' : ''}`}>
      <header className="store-brand-group-head">
        <label className="store-brand-group-check">
          <input checked={selected} onChange={() => onToggle(group.brandId)} type="checkbox" />
          <span className="store-brand-group-logo">{logo ? <img alt={group.brandName} src={logo} /> : <Store size={16} />}</span>
          <span className="store-brand-group-title">
            <strong>{group.brandName}</strong>
            <small>{group.totalItems} producto{group.totalItems === 1 ? '' : 's'}</small>
          </span>
        </label>
        <span className="store-brand-group-subtotal">Q{formatStoreMoney(group.subtotal)}</span>
      </header>

      <div className="store-brand-group-items">
        {group.items.map((item) => {
          const image = absoluteStoreMediaUrl(item.imageUrl);
          const busy = busyItemId === item.id;
          return (
            <div className="store-cart-item" key={item.id}>
              <div className="store-cart-item-image">{image ? <img alt={item.productName} src={image} /> : <ImageOff size={20} />}</div>
              <div className="store-cart-item-info">
                <strong>{item.productName}</strong>
                {item.variantLabel ? <small>{item.variantLabel}</small> : null}
                {item.sku ? <small>SKU: {item.sku}</small> : null}
                {!item.isAvailable ? <span className="store-brand-group-warning">Sin disponibilidad</span> : null}
                <div className="store-cart-item-row">
                  <div className="store-quantity-selector">
                    <button disabled={busy || item.quantity <= 1} onClick={() => onQuantityChange(item.id, item.quantity - 1)} type="button">-</button>
                    <span>{item.quantity}</span>
                    <button disabled={busy || item.quantity >= item.availableStock} onClick={() => onQuantityChange(item.id, item.quantity + 1)} type="button">+</button>
                  </div>
                  <span className="store-price">Q{formatStoreMoney(item.subtotal)}</span>
                </div>
                <button className="store-remove-button" disabled={busy} onClick={() => onRemove(item.id)} type="button">Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
