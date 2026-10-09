import './tienda-online.css';
import StoreAppShell from './StoreAppShell';

export default function TiendaOnlineLayout({ children }: { children: React.ReactNode }) {
  return <StoreAppShell>{children}</StoreAppShell>;
}
