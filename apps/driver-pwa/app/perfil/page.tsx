'use client';

import {
  AlertTriangle,
  Bell,
  Bike,
  ChevronRight,
  Clock3,
  History,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DriverShell, logoutDriver } from '../components';
import { DriverUser, driverApiRequest, mediaUrl } from '../lib/driverApi';

type ProfileOption = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: 'green' | 'blue' | 'orange' | 'violet' | 'red' | 'yellow';
  href?: string;
};

const profileOptions: ProfileOption[] = [
  { title: 'Datos personales', description: 'Información de tu cuenta y contacto', icon: User, tone: 'green', href: '/datos-personales' },
  { title: 'Mi vehículo', description: 'Información de tu vehículo asignado', icon: Bike, tone: 'blue' },
  { title: 'Mi disponibilidad', description: 'Gestiona tu estado operativo', icon: Clock3, tone: 'orange' },
  { title: 'Liquidaciones', description: 'Cobros contra entrega y liquidaciones', icon: Wallet, tone: 'violet' },
  { title: 'Historial de entregas', description: 'Pedidos finalizados y entregas cerradas', icon: History, tone: 'blue', href: '/historial' },
  { title: 'Incidencias reportadas', description: 'Historial de incidencias y reportes', icon: AlertTriangle, tone: 'red' },
  { title: 'Notificaciones', description: 'Preferencias y notificaciones recientes', icon: Bell, tone: 'yellow' },
  { title: 'Seguridad', description: 'Contraseña y seguridad de tu cuenta', icon: ShieldCheck, tone: 'blue', href: '/cambiar-contrasena' },
];

export default function PerfilPage() {
  const [profile, setProfile] = useState<DriverUser | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    driverApiRequest<DriverUser>('/driver/profile')
      .then((result) => {
        if (isMounted) {
          setProfile(result);
          setError('');
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DriverShell title="Perfil" hideHeader>
      <section className="driver-profile-page">
        <header className="driver-profile-header">
          <div>
            <h1>Mi perfil</h1>
            <p>Información y configuración de tu cuenta</p>
          </div>
          <button className="driver-profile-notification" disabled type="button" aria-label="Notificaciones no disponibles">
            <Bell size={28} />
          </button>
        </header>

        {isLoading ? <section className="profile-card profile-loading">Cargando perfil...</section> : null}
        {error ? <div className="form-error">{error}</div> : null}
        {!isLoading && !error && !profile ? <div className="form-error">No hay una sesion valida de motorista. Inicia sesion nuevamente.</div> : null}

        {profile ? (
          <>
            <DriverProfileCard profile={profile} />

            <section className="profile-menu-card">
              {profileOptions.map((option) => <ProfileOptionRow option={option} key={option.title} />)}
            </section>

            <section className="profile-logout-section">
              <button type="button" onClick={() => setConfirmLogout(true)}><LogOut size={25} />Cerrar sesión</button>
              <p>Se cerrará tu sesión en esta aplicación.</p>
            </section>
          </>
        ) : null}
      </section>

      {confirmLogout ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <section className="modal-panel profile-logout-modal">
            <h2 id="logout-title">¿Deseas cerrar sesión?</h2>
            <p>Se cerrará tu sesión en la PWA Motorista.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button className="danger-button" type="button" onClick={logoutDriver}>Cerrar sesión</button>
            </div>
          </section>
        </div>
      ) : null}
    </DriverShell>
  );
}

function DriverProfileCard({ profile }: { profile: DriverUser }) {
  const zoneText = profile.assignedZone
    ? `Zona asignada: ${profile.assignedZone}`
    : profile.assignedStore?.name
      ? `Tienda: ${profile.assignedStore.name}`
      : 'Sin zona asignada';

  return (
    <section className="profile-card driver-profile-card">
      <div className="profile-person">
        <div className="profile-identity">
          <div className="profile-avatar-wrap">
            {mediaUrl(profile.profilePhotoUrl) ? (
              <img alt="Foto de perfil" className="profile-avatar-img" src={mediaUrl(profile.profilePhotoUrl) ?? ''} />
            ) : (
              <span className="profile-avatar">{initials(profile.fullName)}</span>
            )}
            <span className="profile-avatar-edit" aria-hidden="true"><Pencil size={13} /></span>
          </div>
          <div className="profile-identity-text">
            <h2>{profile.fullName}</h2>
            <p>Motorista {profile.code ? `#${profile.code}` : profile.id.slice(0, 8)}</p>
            <span className={`profile-status ${profile.operationalStatus === 'EN_RUTA' ? 'route' : 'available'}`}><i />{operationalLabel(profile.operationalStatus)}</span>
          </div>
        </div>
        <div className="profile-contact-list">
          <p><Phone size={18} />{profile.phone || 'Teléfono no registrado'}</p>
          <p><Mail size={18} />{profile.email ?? 'Correo no registrado'}</p>
          <p><MapPin size={18} />{zoneText}</p>
        </div>
      </div>

      <div className="profile-vehicle">
        <span className="profile-vehicle-icon"><Bike size={26} /></span>
        {profile.vehicle ? (
          <>
            <small>Vehículo</small>
            <strong>{profile.vehicle.type ?? 'Vehículo'}</strong>
            <p>{profile.vehicle.plate ?? 'Placa pendiente'}</p>
            <p>{[profile.vehicle.brand, profile.vehicle.model].filter(Boolean).join(' - ') || 'Marca/modelo pendiente'}</p>
            <span className="profile-vehicle-badge"><i />{profile.vehicle.status ?? 'Sin estado'}</span>
          </>
        ) : (
          <>
            <small>Vehículo</small>
            <strong>Sin vehículo asignado</strong>
            <p>Datos pendientes en el modelo de motorista.</p>
          </>
        )}
      </div>
    </section>
  );
}

function ProfileOptionRow({ option }: { option: ProfileOption }) {
  const Icon = option.icon;
  const content = (
    <>
      <span className={`profile-menu-icon ${option.tone}`}><Icon size={27} /></span>
      <span><strong>{option.title}</strong><small>{option.description}</small></span>
      <ChevronRight size={23} />
    </>
  );
  return option.href ? <a href={option.href}>{content}</a> : <button type="button" disabled>{content}</button>;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';
}

function operationalLabel(value?: string) {
  if (value === 'EN_RUTA') return 'En ruta';
  if (value === 'FUERA_DE_SERVICIO') return 'Fuera de servicio';
  if (value === 'PAUSADO') return 'Pausado';
  return 'Disponible';
}
