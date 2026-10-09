import { Suspense } from 'react';
import ResumenPage from './ResumenPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="store-loading">Cargando...</div>}>
      <ResumenPage />
    </Suspense>
  );
}
