'use client';

import { Home, LogOut, PackageCheck, ShoppingBag, UserCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { clearDriverSession, driverApiRequest, getStoredDriverUser, statusLabel } from './lib/driverApi';

export async function logoutDriver() {
  try {
    await driverApiRequest('/driver/auth/logout', { method: 'POST' });
  } catch {
    // Clear local state even when the remote session is already expired.
  }
  clearDriverSession();
  window.location.href = '/login';
}

export function DriverShell({ title, children, hideHeader = false }: { title: string; children: React.ReactNode; hideHeader?: boolean }) {
  const user = getStoredDriverUser();
  const pathname = usePathname();
  const isHome = pathname === '/inicio';

  return (
    <main className={`driver-shell ${isHome ? 'driver-home-shell' : ''}`}>
      {!isHome && !hideHeader ? (
        <>
          <header className="driver-topbar">
            <a className="driver-brand" href="/inicio"><PackageCheck size={22} /><span>Mensajero</span></a>
            <button aria-label="Cerrar sesion" className="icon-button" onClick={logoutDriver} type="button"><LogOut size={19} /></button>
          </header>
          <section className="driver-page-heading">
            <div>
              <p>{user?.fullName ?? 'Mensajero'}</p>
              <h1>{title}</h1>
            </div>
            <a aria-label="Perfil" className="profile-chip" href="/perfil"><UserCircle size={18} /></a>
          </section>
        </>
      ) : null}
      <nav className="driver-bottom-nav" aria-label="Navegacion principal">
        <a className={pathname === '/inicio' ? 'active' : ''} href="/inicio"><Home size={24} /><span>Inicio</span></a>
        <a className={pathname.startsWith('/entregas') ? 'active' : ''} href="/entregas"><ShoppingBag size={24} /><span>Entregas</span></a>
        <a className={pathname === '/perfil' ? 'active' : ''} href="/perfil"><UserCircle size={24} /><span>Perfil</span></a>
      </nav>
      {children}
    </main>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'ENTREGADA' || status === 'PAGO_CONFIRMADO'
    ? 'green'
    : status === 'EN_RUTA' || status === 'ASIGNADA'
      ? 'blue'
      : status === 'NO_ENTREGADA' || status === 'NO_PAGADO' || status === 'CANCELADA'
        ? 'red'
        : 'amber';
  return <span className={`status-badge ${tone}`}>{statusLabel(status)}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
