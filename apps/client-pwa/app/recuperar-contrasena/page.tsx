'use client';

import { ArrowLeft, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { FormEvent, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type ResetRequestResponse = {
  ok: true;
  message: string;
  resetUrl?: string;
};

export default function ClientPasswordRecoveryPage() {
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
      const result = await apiRequest<ResetRequestResponse>('/auth/customer/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResetUrl(result.resetUrl ?? null);
      setMessage({ type: 'success', text: 'Si el correo existe, se generó un enlace de recuperación.' });
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
      await apiRequest('/auth/customer/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setMessage({ type: 'success', text: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="client-stage">
      <section className="client-screen auth-client-screen modern-auth-screen">
        <header className="modern-auth-header">
          <a className="forgot-link" href="/">
            <ArrowLeft size={16} />
            Volver
          </a>
          <div className="modern-auth-logo">
            <ShieldCheck size={74} />
          </div>
          <h1>{token ? 'Nueva contraseña' : 'Recupera tu cuenta'}</h1>
          <span>{token ? 'Crea una contraseña segura' : 'Solicita un enlace temporal de recuperación'}</span>
        </header>

        <form className="client-login modern-auth-card" onSubmit={token ? confirmReset : requestReset}>
          {message ? <div className={`client-status ${message.type}`}><span>{message.text}</span></div> : null}
          {token ? (
            <>
              <AuthInput label="Nueva contraseña" value={newPassword} onChange={setNewPassword} type="password" icon={<LockKeyhole size={24} />} />
              <AuthInput label="Confirmar contraseña" value={confirmPassword} onChange={setConfirmPassword} type="password" icon={<LockKeyhole size={24} />} />
            </>
          ) : (
            <AuthInput label="Correo electrónico" value={email} onChange={setEmail} type="email" icon={<Mail size={24} />} />
          )}
          {resetUrl ? <a className="forgot-link" href={resetUrl}>Abrir enlace generado</a> : null}
          <button className="client-primary modern-auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
            {token ? 'Actualizar contraseña' : 'Generar enlace'}
          </button>
        </form>
      </section>
    </main>
  );
}

function AuthInput({ icon, label, onChange, type, value }: { icon: ReactNode; label: string; onChange: (value: string) => void; type: 'email' | 'password'; value: string }) {
  return (
    <label className="modern-auth-field">
      <span>{label}</span>
      <div>
        {icon}
        <input minLength={type === 'password' ? 8 : undefined} onChange={(event) => onChange(event.target.value)} required type={type} value={value} />
      </div>
    </label>
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
