'use client';

import { useParams } from 'next/navigation';
import BannerDetailPage from '../../../banners/BannerDetailPage';

export default function StoreBannerDetailPage() {
  const params = useParams<{ id: string }>();
  return <BannerDetailPage basePath="/tienda-online/banners" bannerId={params.id} shellTitle="Tienda Online" />;
}
