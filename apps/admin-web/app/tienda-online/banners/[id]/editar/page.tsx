'use client';

import { useParams } from 'next/navigation';
import BannerFormPage from '../../../../banners/BannerFormPage';

export default function EditarStoreBannerPage() {
  const params = useParams<{ id: string }>();
  return (
    <BannerFormPage
      bannerId={params.id}
      basePath="/tienda-online/banners"
      mode="edit"
      placement="STORE"
      shellTitle="Tienda Online"
      showAudience={false}
    />
  );
}
