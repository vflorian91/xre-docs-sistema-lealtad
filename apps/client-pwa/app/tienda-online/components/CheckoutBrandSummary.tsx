'use client';

import { ImageOff, Store } from 'lucide-react';
import { absoluteStoreMediaUrl, formatStoreMoney, StoreBrandGroup } from '../lib/clientStoreApi';

type Props = {
  brandGroups: StoreBrandGroup[];
};

export default function CheckoutBrandSummary({ brandGroups }: Props) {
  return (
    <div className="store-checkout-groups">
      {brandGroups.map((group) => {
        const logo = absoluteStoreMediaUrl(group.brandLogoUrl);
        return (
          <section className="store-brand-group" key={group.brandId}>
            <header className="store-brand-group-head">
              <span className="store-brand-group-check">
                <span className="store-brand-group-logo">{logo ? <img alt={group.brandName} src={logo} /> : <Store size={16} />}</span>
                <span className="store-brand-group-title">
                  <strong>{group.brandName}</strong>
                  <small>{group.totalItems} producto{group.totalItems === 1 ? '' : 's'}</small>
                </span>
              </span>
              <span className="store-brand-group-subtotal">Q{formatStoreMoney(group.subtotal)}</span>
            </header>
            <div className="store-brand-group-items">
              {group.items.map((item) => {
                const image = absoluteStoreMediaUrl(item.imageUrl);
                return (
                  <div className="store-checkout-line" key={item.id}>
                    <div className="store-checkout-line-image">{image ? <img alt={item.productName} src={image} /> : <ImageOff size={16} />}</div>
                    <div className="store-checkout-line-info">
                      <span>{item.productName}</span>
                      {item.variantLabel ? <small>{item.variantLabel}</small> : null}
                      <small>{item.quantity} × Q{formatStoreMoney(item.unitPrice)}</small>
                    </div>
                    <span className="store-price">Q{formatStoreMoney(item.subtotal)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
