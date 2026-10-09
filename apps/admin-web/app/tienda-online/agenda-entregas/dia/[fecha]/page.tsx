'use client';

import { useParams } from 'next/navigation';
import AgendaEntregasPage from '../../AgendaEntregasPage';

export default function Page() {
  const params = useParams<{ fecha: string }>();
  return <AgendaEntregasPage initialDate={params.fecha} />;
}
