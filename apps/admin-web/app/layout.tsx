import './globals.css';
import './dashboard-visual.css';
import './base-admin-screens.css';
import './vintage-admin.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zapateria XDOC | Administración',
  description: 'Panel administrativo de Zapateria XDOC: tienda, clientes y programa de lealtad.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
