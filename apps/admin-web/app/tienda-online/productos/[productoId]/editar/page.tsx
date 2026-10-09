'use client';

import { useParams } from 'next/navigation';
import ProductFormPage from '../../ProductFormPage';

export default function EditarProductoPage() {
  const params = useParams<{ productoId: string }>();
  return <ProductFormPage mode="edit" productId={params.productoId} />;
}
