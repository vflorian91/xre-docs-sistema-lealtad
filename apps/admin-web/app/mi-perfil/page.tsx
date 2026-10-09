'use client';

import { ArrowLeft, Camera, Eye, EyeOff, KeyRound, Lock, Save, ShieldCheck, Store, UserCircle } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import {
  absoluteMediaUrl,
  adminApiRequest,
  getErrorText,
  getStoredAdminUser,
  readFileAsBase64,
  setStoredAdminUser,
  StoredAdminUser,
} from '../lib/adminApi';
import { formatNumber } from '../lib/format';

type InternalUserProfile = StoredAdminUser & {
  storeIds: string[];
  stores?: Array<{ id: string; code: string; name: string }>;
  activeStoreId?: string;
  sessionId: string;
  mustChangePassword: boolean;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function MiPerfilPage() {
  const [profile, setProfile] = useState<InternalUserProfile | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHasMounted(true);
    setProfile(getStoredAdminUser() as InternalUserProfile | null);

    async function loadProfile() {
      try {
        const result = await adminApiRequest<{ user: InternalUserProfile }>('/auth/internal/me');
        setProfile(result.user);
        setStoredAdminUser(result.user);
      } catch (error) {
        setMessage(getErrorText(error, 'No se pudo cargar tu perfil.'));
      }
    }

    void loadProfile();
  }, []);

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    setSuccessMessage(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('El archivo debe ser una imagen valida en formato JPG, JPEG, PNG o WEBP.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage('La imagen no debe superar los 10 MB.');
      event.target.value = '';
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const result = await adminApiRequest<{ user: { profilePhotoUrl?: string | null } }>('/media/internal/profile-photo', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'PROFILE_PHOTO',
          filename: file.name,
          mimeType: file.type,
          dataBase64: await readFileAsBase64(file),
        }),
      });
      const nextProfile = profile ? { ...profile, profilePhotoUrl: result.user.profilePhotoUrl } : profile;

      if (nextProfile) {
        setProfile(nextProfile);
        setStoredAdminUser(nextProfile);
      }

      setSuccessMessage('Foto de perfil actualizada.');
    } catch (error) {
      setMessage(getErrorText(error, 'No se pudo subir la foto.'));
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSuccessMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('La confirmacion no coincide con la nueva contrasena.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await adminApiRequest('/auth/internal/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPasswordForm(emptyPasswordForm);
      setSuccessMessage('Contrasena actualizada correctamente.');
      if (profile) {
        const nextProfile = { ...profile, mustChangePassword: false };
        setProfile(nextProfile);
        setStoredAdminUser(nextProfile);
      }
    } catch (error) {
      setMessage(getErrorText(error, 'No se pudo cambiar la contrasena.'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const primaryRole = profile?.roles?.[0] ?? 'Administrador';
  const assignedStore = profile?.stores?.[0];
  const displayedName = hasMounted ? profile?.fullName ?? 'Administrador' : 'Administrador';
  const displayedEmail = hasMounted ? profile?.email ?? 'correo no disponible' : 'correo no disponible';

  const passwordInputType = (field: keyof PasswordForm) => (visiblePasswords[field] ? 'text' : 'password');
  const togglePasswordVisibility = (field: keyof PasswordForm) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  return (
    <AdminRoutedShell title="Mi perfil">
      {message ? <div className="form-error">{message}</div> : null}
      {successMessage ? <div className="form-success">{successMessage}</div> : null}

      <section className="customer-profile-page-header">
        <a aria-label="Volver al dashboard" className="customer-back-button" href="/dashboard">
          <ArrowLeft size={22} />
        </a>
        <div>
          <h2>Mi perfil</h2>
          <p>Consulta y administra tu cuenta.</p>
        </div>
      </section>

      <section className="user-account-hero">
        <div className="user-profile-photo-block">
          <div className="user-account-avatar">
            {profile?.profilePhotoUrl ? <img alt={profile.fullName} src={absoluteMediaUrl(profile.profilePhotoUrl)} /> : <UserCircle size={88} />}
          </div>
          <button className="admin-secondary" disabled={isUploadingPhoto} onClick={() => fileInputRef.current?.click()} type="button">
            <Camera size={16} />
            {isUploadingPhoto ? 'Subiendo...' : 'Subir foto'}
          </button>
          <input accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void uploadPhoto(event)} ref={fileInputRef} type="file" />
        </div>
        <div className="user-account-identity">
          <h2>{displayedName}</h2>
          <p>{displayedEmail}</p>
          <div className="user-account-badges">
            <span className="badge blue">{primaryRole}</span>
            {profile?.mustChangePassword ? <span className="badge amber">Debe cambiar contrasena</span> : <span className="badge green">Cuenta activa</span>}
          </div>
        </div>

        <div className="user-account-summary">
          <article>
            <span className="customer-metric-icon violet"><Store size={28} /></span>
            <div>
              <p>Tienda asignada</p>
              <strong>{assignedStore?.name ?? 'Sin tienda asignada'}</strong>
              {assignedStore ? <a href={`/catalogos/tiendas/${assignedStore.id}`}>Ver detalles</a> : <small>Sin detalle disponible</small>}
            </div>
          </article>
          <article>
            <span className="customer-metric-icon green"><ShieldCheck size={28} /></span>
            <div>
              <p>Permisos</p>
              <strong>{formatNumber(profile?.permissions?.length ?? 0)}</strong>
              <small>habilitados</small>
            </div>
          </article>
          <article>
            <span className="customer-metric-icon blue"><ShieldCheck size={28} /></span>
            <div>
              <p>Rol</p>
              <strong>{primaryRole}</strong>
              <small>Rol principal</small>
            </div>
          </article>
        </div>
      </section>

      <section className="user-security-card">
        <div className="user-security-heading">
          <span><KeyRound size={28} /></span>
          <div>
            <h2>Cambiar contrasena</h2>
            <p>Actualiza tu acceso con una contrasena segura.</p>
          </div>
        </div>

        <div className="user-security-content">
          <form className="user-password-form" onSubmit={(event) => void changePassword(event)}>
            <label>
              Contrasena actual
              <span className="user-password-input">
                <input
                  autoComplete="current-password"
                  minLength={8}
                  onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                  placeholder="Ingresa tu contrasena actual"
                  required
                  type={passwordInputType('currentPassword')}
                  value={passwordForm.currentPassword}
                />
                <button aria-label="Mostrar contrasena actual" onClick={() => togglePasswordVisibility('currentPassword')} type="button">
                  {visiblePasswords.currentPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            <label>
              Nueva contrasena
              <span className="user-password-input">
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                  placeholder="Ingresa tu nueva contrasena"
                  required
                  type={passwordInputType('newPassword')}
                  value={passwordForm.newPassword}
                />
                <button aria-label="Mostrar nueva contrasena" onClick={() => togglePasswordVisibility('newPassword')} type="button">
                  {visiblePasswords.newPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            <label>
              Confirmar nueva contrasena
              <span className="user-password-input">
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                  placeholder="Confirma tu nueva contrasena"
                  required
                  type={passwordInputType('confirmPassword')}
                  value={passwordForm.confirmPassword}
                />
                <button aria-label="Mostrar confirmacion de contrasena" onClick={() => togglePasswordVisibility('confirmPassword')} type="button">
                  {visiblePasswords.confirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            <button className="admin-primary" disabled={isChangingPassword} type="submit">
              {isChangingPassword ? <Lock size={18} /> : <Save size={18} />}
              {isChangingPassword ? 'Guardando...' : 'Guardar nueva contrasena'}
            </button>
          </form>

          <aside className="user-password-recommendation">
            <span><ShieldCheck size={32} /></span>
            <h3>Recomendacion</h3>
            <p>Usa al menos 8 caracteres con mayusculas, minusculas, numeros y simbolos.</p>
          </aside>
        </div>
      </section>

      <p className="user-security-note">
        <ShieldCheck size={16} />
        Manten tu informacion segura y tu contrasena actualizada.
      </p>
    </AdminRoutedShell>
  );
}
