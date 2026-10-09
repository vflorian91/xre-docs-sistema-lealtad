import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mensajero',
  description: 'PWA operativa para mensajeros',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
