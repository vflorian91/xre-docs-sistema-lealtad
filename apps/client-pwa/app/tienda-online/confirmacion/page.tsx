import { Suspense } from 'react';
import ConfirmacionPage from './ConfirmacionPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="store-loading">Cargando...</div>}>
      <ConfirmacionPage />
    </Suspense>
  );
}
