'use client';

import { useParams } from 'next/navigation';
import BrandFormPage from '../../BrandFormPage';

export default function EditarMarcaPage() {
  const params = useParams<{ marcaId: string }>();
  return <BrandFormPage mode="edit" brandId={params.marcaId} />;
}
