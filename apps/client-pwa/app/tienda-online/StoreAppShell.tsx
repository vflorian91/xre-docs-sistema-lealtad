'use client';

import { Bell, ChevronRight, Gift, Home, MapPin, QrCode, ShoppingCart, Star, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getCart, listCustomerAddresses, type CustomerAddress } from './lib/clientStoreApi';

const STORE_NAV = [
  { label: 'Inicio', icon: Home, href: '/' },
  { label: 'Puntos lealtad', icon: Star, href: '/mis-puntos' },
  { label: 'QR', icon: QrCode, href: '/qr', floating: true },
  { label: 'Canjes', icon: Gift, href: '/premios' },
  { label: 'Perfil', icon: UserRound, href: '/perfil' },
];

function formatDeliveryAddress(address?: CustomerAddress | null) {
  if (!address) return 'Configura tu dirección';
  return [address.addressLine, address.zone ? `zona ${address.zone}` : null, address.municipality]
    .filter(Boolean)
    .join(' ');
}

export default function StoreAppShell({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [addressText, setAddressText] = useState('Configura tu dirección');

  useEffect(() => {
    void Promise.all([
      getCart().then((cart) => setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0))).catch(() => undefined),
      listCustomerAddresses()
        .then((addresses) => {
          const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
          setAddressText(formatDeliveryAddress(defaultAddress));
        })
        .catch(() => undefined),
    ]);
  }, []);

  const activePath = useMemo(() => (typeof window === 'undefined' ? '' : window.location.pathname), []);

  return (
    <main className="client-stage store-app-stage">
      <section className="client-screen store-app-screen">
        <header className="client-mobile-header store-app-topbar">
          <div className="client-mobile-header-main">
            <a className="delivery-pill in-header store-app-delivery" href="/direcciones" aria-label="Cambiar direccion de entrega">
              <MapPin size={14} />
              <span>Entrega en: <b>{addressText}</b></span>
              <ChevronRight size={14} />
            </a>
            <div className="client-mobile-actions">
              <a className="client-icon-badge" aria-label="Notificaciones" href="/notificaciones">
                <Bell size={24} strokeWidth={2.1} />
              </a>
              <a className="client-icon-badge" aria-label="Ver carrito" href="/tienda-online/carrito">
                <ShoppingCart size={25} strokeWidth={2.1} />
                {cartCount ? <span>{cartCount}</span> : null}
              </a>
            </div>
          </div>
        </header>

        <section className="store-app-content">
          {children}
        </section>

        <nav className="client-nav store-app-nav">
          {STORE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? activePath === '/' : activePath.startsWith(item.href);
            if (item.floating) {
              return (
                <a className={`client-nav-floating${isActive ? ' active' : ''}`} href={item.href} key={item.label}>
                  <span className="client-nav-floating-icon"><Icon size={23} /></span>
                  <span className="client-nav-floating-label">{item.label}</span>
                </a>
              );
            }
            return (
              <a className={isActive ? 'active' : ''} href={item.href} key={item.label}>
                <Icon size={22} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </section>
    </main>
  );
}
