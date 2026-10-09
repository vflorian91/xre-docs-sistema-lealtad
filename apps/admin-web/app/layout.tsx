import './globals.css';
import './dashboard-visual.css';
import './base-admin-screens.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administrador | Sistema de Lealtad',
  description: 'Web Administrador del Sistema de Lealtad y Premiacion',
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
