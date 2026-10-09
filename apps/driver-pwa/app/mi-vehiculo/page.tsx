'use client';

import { ArrowLeft, Bike, FileText, Hash, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DriverShell } from '../components';
import { DriverUser, driverApiRequest } from '../lib/driverApi';

export default function MiVehiculoPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    driverApiRequest<DriverUser>('/driver/profile')
      .then((result) => { if (mounted) setProfile(result); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : 'No se pudo cargar el vehículo.'); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const vehicle = profile?.vehicle ?? null;

  return (
    <DriverShell title="Mi vehículo" hideHeader>
      <section className="dp-page">
        <header className="dp-header">
          <button aria-label="Volver" className="dp-back" onClick={() => router.push('/perfil')} type="button"><ArrowLeft size={20} /></button>
          <h1>Mi vehículo</h1>
        </header>

        {error ? <div className="form-error">{error}</div> : null}
        {isLoading ? <section className="profile-card dp-loading">Cargando...</section> : null}

        {!isLoading && !vehicle ? (
          <section className="profile-card mv-empty">
            <span className="mv-empty-icon"><Bike size={34} /></span>
            <strong>Sin vehículo asignado</strong>
            <p>La empresa aún no te ha asignado un vehículo. Cuando lo haga, aparecerá aquí.</p>
          </section>
        ) : null}

        {vehicle ? (
          <>
            <section className="profile-card mv-hero">
              <span className="mv-hero-icon"><Bike size={30} /></span>
              <div>
                <strong>{vehicle.type || 'Vehículo'}</strong>
                <p>{[vehicle.brand, vehicle.model].filter(Boolean).join(' · ') || 'Marca/modelo no registrado'}</p>
              </div>
              <span className={`mv-badge ${vehicle.status === 'Activo' ? 'on' : 'off'}`}>{vehicle.status ?? '—'}</span>
            </section>

            <section className="profile-card dp-fields">
              <MvField icon={<Hash size={18} />} label="Número de placa" value={vehicle.plate || 'No registrada'} />
              <MvField icon={<Tag size={18} />} label="Tipo" value={vehicle.type || 'No registrado'} />
              <MvField icon={<Tag size={18} />} label="Marca" value={vehicle.brand || 'No registrada'} />
              <MvField icon={<FileText size={18} />} label="Línea / modelo" value={vehicle.model || 'No registrado'} last />
            </section>

            <p className="dp-section-note">La información del vehículo la asigna la empresa. Si hay un error, contacta al administrador.</p>
          </>
        ) : null}
      </section>
    </DriverShell>
  );
}

function MvField({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`dp-field${last ? ' last' : ''}`}>
      <span className="dp-field-icon">{icon}</span>
      <span className="dp-field-text"><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}
