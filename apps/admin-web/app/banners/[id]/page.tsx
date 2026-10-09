'use client';

import { useParams } from 'next/navigation';
import BannerDetailPage from '../BannerDetailPage';

export default function BannerPerfilPage() {
  const params = useParams<{ id: string }>();
  return <BannerDetailPage bannerId={params.id} />;
}
