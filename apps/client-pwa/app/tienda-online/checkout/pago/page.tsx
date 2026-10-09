import { Suspense } from 'react';
import PagoPlaceholderPage from './PagoPlaceholderPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="store-loading">Cargando...</div>}>
      <PagoPlaceholderPage />
    </Suspense>
  );
}
