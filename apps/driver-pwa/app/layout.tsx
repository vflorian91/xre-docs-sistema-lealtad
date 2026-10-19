import './globals.css';
import './vintage-theme.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zapateria XDOC | Mensajeros',
  description: 'Portal de entregas de Zapateria XDOC',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
