import './globals.css';
import './vintage-theme.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Zapateria XDOC | Tu próximo par',
  description: 'Descubre tu próximo par y disfruta tus puntos y beneficios en Zapateria XDOC.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '384x384', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#855b38',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
