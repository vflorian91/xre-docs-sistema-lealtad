'use client';

import { useParams } from 'next/navigation';
import BannerFormPage from '../../BannerFormPage';

export default function EditarBannerPage() {
  const params = useParams<{ id: string }>();
  return <BannerFormPage mode="edit" bannerId={params.id} />;
}
