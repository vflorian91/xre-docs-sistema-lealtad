'use client';

import { ArrowLeft, Camera, Mail, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DriverShell } from '../components';
import { DriverUser, driverApiRequest, mediaUrl, uploadDriverPhoto } from '../lib/driverApi';

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';
}

function operationalLabel(value?: string) {
  if (value === 'EN_RUTA') return 'En ruta';
  if (value === 'FUERA_DE_SERVICIO') return 'Fuera de servicio';
  if (value === 'PAUSADO') return 'Pausado';
  return 'Disponible';
}

function typeLabel(value?: string | null) {
  if (value === 'INTERNO') return 'Motorista interno';
  if (value === 'EXTERNO') return 'Motorista externo';
  return value ?? 'No registrado';
}

export default function DatosPersonalesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<DriverUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    driverApiRequest<DriverUser>('/driver/profile')
      .then((result) => { if (mounted) setProfile(result); })
      .catch((err) => { if (mounted) setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo cargar el perfil.' }); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'La imagen debe ser JPG, PNG o WEBP.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no debe superar 5 MB.' });
      return;
    }
    setSelectedFile(file);
  }

  async function handleSave() {
    if (saving) return;
    // Si no eligió una foto nueva, solo regresa al perfil.
    if (!selectedFile) {
      router.push('/perfil');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await uploadDriverPhoto(selectedFile);
      router.push('/perfil');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo subir la fotografía.' });
      setSaving(false);
    }
  }

  const currentPhoto = previewUrl ?? mediaUrl(profile?.profilePhotoUrl);

  return (
    <DriverShell title="Datos personales" hideHeader>
      <section className="dp-page">
        <header className="dp-header">
          <button aria-label="Volver" className="dp-back" onClick={() => router.push('/perfil')} type="button"><ArrowLeft size={20} /></button>
          <h1>Datos personales</h1>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <section className="profile-card dp-loading">Cargando...</section> : null}

        {profile ? (
          <>
            <section className="profile-card dp-photo-card">
              <div className="dp-avatar-wrap">
                {currentPhoto ? <img alt="Foto de perfil" className="dp-avatar-img" src={currentPhoto} /> : <span className="dp-avatar">{initials(profile.fullName)}</span>}
                <button className="dp-avatar-edit" onClick={() => fileInputRef.current?.click()} type="button" aria-label="Cambiar fotografía"><Camera size={16} /></button>
              </div>
              <button className="dp-change-photo" onClick={() => fileInputRef.current?.click()} type="button">
                {selectedFile ? 'Cambiar selección' : 'Subir / actualizar fotografía'}
              </button>
              {selectedFile ? <small className="dp-hint">Foto lista para guardar: {selectedFile.name}</small> : <small className="dp-hint">JPG, PNG o WEBP, máx. 5 MB.</small>}
              <input accept="image/jpeg,image/png,image/webp" hidden onChange={pickFile} ref={fileInputRef} type="file" />
            </section>

            <p className="dp-section-note">Tus datos personales son de solo lectura. Si necesitas corregir algún dato, contacta al administrador.</p>

            <section className="profile-card dp-fields">
              <DpField icon={<User size={18} />} label="Nombre completo" value={profile.fullName} />
              <DpField icon={<ShieldCheck size={18} />} label="Código de motorista" value={profile.code ? `#${profile.code}` : profile.id.slice(0, 8)} />
              <DpField icon={<Phone size={18} />} label="Teléfono" value={profile.phone || 'No registrado'} />
              <DpField icon={<Mail size={18} />} label="Correo" value={profile.email || 'No registrado'} />
              <DpField icon={<User size={18} />} label="Tipo de motorista" value={typeLabel(profile.type)} />
              <DpField icon={<MapPin size={18} />} label="Zona asignada" value={profile.assignedZone ?? profile.assignedStore?.name ?? 'Sin zona asignada'} />
              <DpField icon={<ShieldCheck size={18} />} label="Estado operativo" value={operationalLabel(profile.operationalStatus)} last />
            </section>

            <button className="dp-save" disabled={saving} onClick={handleSave} type="button">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        ) : null}
      </section>
    </DriverShell>
  );
}

function DpField({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`dp-field${last ? ' last' : ''}`}>
      <span className="dp-field-icon">{icon}</span>
      <span className="dp-field-text">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
