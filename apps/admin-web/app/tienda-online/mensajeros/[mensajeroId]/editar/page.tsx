'use client';

import { useParams } from 'next/navigation';
import DriverFormPage from '../../DriverFormPage';

export default function Page() {
  const params = useParams<{ mensajeroId: string }>();
  return <DriverFormPage mode="edit" driverId={params.mensajeroId} />;
}
