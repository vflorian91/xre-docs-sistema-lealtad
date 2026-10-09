'use client';

import { ArrowLeft, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type ResetRequestResponse = {
  ok: true;
  message: string;
  resetUrl?: string;
};

export default function AdminPasswordRecoveryPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setResetUrl(null);

    try {
      const result = await apiRequest<ResetRequestResponse>('/auth/internal/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email, app: 'admin' }),
      });
      setResetUrl(result.resetUrl ?? null);
      setMessage({ type: 'success', text: 'Si el correo existe, se genero un enlace de recuperacion.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiRequest('/auth/internal/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setMessage({ type: 'success', text: 'Contraseña actualizada. Ya puedes iniciar sesion.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-layout">
        <div className="admin-auth-copy">
          <a className="admin-secondary" href="/">
            <ArrowLeft size={16} />
            Volver
          </a>
          <h1>Recuperar contraseña</h1>
          <p>Genera un enlace temporal para restablecer el acceso de usuario interno.</p>
        </div>

        <form className="admin-login" onSubmit={token ? confirmReset : requestReset}>
          <div className="admin-login-icon" aria-hidden="true">
            <LockKeyhole size={24} />
          </div>
          <div>
            <h1>{token ? 'Nueva contraseña' : 'Solicitar enlace'}</h1>
            <p>{token ? 'Ingresa una contraseña nueva.' : 'Usa el correo de tu cuenta interna.'}</p>
          </div>
          {message ? <div className={`admin-status ${message.type}`}><span>{message.text}</span></div> : null}
          {token ? (
            <>
              <label>
                Nueva contraseña
                <span className="admin-login-field">
                  <LockKeyhole size={17} />
                  <input minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" />
                </span>
              </label>
              <label>
                Confirmar contraseña
                <span className="admin-login-field">
                  <LockKeyhole size={17} />
                  <input minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" />
                </span>
              </label>
            </>
          ) : (
            <label>
              Correo
              <span className="admin-login-field">
                <Mail size={17} />
                <input autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
              </span>
            </label>
          )}
          {resetUrl ? <a className="forgot-link" href={resetUrl}>Abrir enlace generado</a> : null}
          <button className="admin-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
            {token ? 'Actualizar contraseña' : 'Generar enlace'}
          </button>
        </form>
      </section>
    </main>
  );
}

async function apiRequest<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const issueText = body?.issues?.map((issue: { message: string }) => issue.message).join(' ');
    throw new Error(issueText || body?.message || 'No se pudo completar la accion.');
  }

  return body as T;
}

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la accion.';
}
