'use client';

import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { hasAdminSession, setAdminSession } from './lib/adminApi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type InternalUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (hasAdminSession()) {
      router.replace('/dashboard');
      return;
    }

    setIsCheckingSession(false);
  }, [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch(`${API_BASE}/auth/internal/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;

      if (!response.ok) {
        const issueText = body?.issues?.map((issue: { message: string }) => issue.message).join(' ');
        throw new Error(issueText || body?.message || 'No se pudo iniciar sesion.');
      }

      const result = body as { user: InternalUser };
      setAdminSession(result);
      router.replace('/dashboard');
    } catch (error) {
      const errorText = error instanceof TypeError
        ? 'No se pudo conectar con el servidor. Verifica que la API este encendida.'
        : error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
      setMessage({ type: 'error', text: errorText === 'Credenciales invalidas.' ? 'Credenciales inválidas.' : errorText });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="admin-auth-shell">
        <section className="admin-login loading-card">
          <Loader2 className="spin" size={34} />
          <strong>Cargando administrador</strong>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-layout">
        <div className="admin-auth-copy">
          <div className="brand login-brand">
            <div className="brand-mark logo-mark">
              <img src="/images/brand/loyalty-logo.png" alt="Sistema de Lealtad" />
            </div>
            <strong>Sistema de <span>Lealtad</span></strong>
          </div>
          <h1>Bienvenido de nuevo</h1>
          <p>Accede al panel administrativo y gestiona tu programa de lealtad.</p>
        </div>

        <form className="admin-login" onSubmit={login}>
          <div className="admin-login-icon" aria-hidden="true">
            <LockKeyhole size={24} />
          </div>
          <div>
            <h1>Web Administrador</h1>
            <p>Ingresa con un usuario interno autorizado.</p>
          </div>
          {message ? (
            <div className={`admin-status ${message.type}`}>
              <span>{message.text}</span>
            </div>
          ) : null}
          <label>
            Correo
            <span className="admin-login-field">
              <Mail size={17} />
              <input autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </span>
          </label>
          <label>
            Contraseña
            <span className="admin-login-field">
              <LockKeyhole size={17} />
              <input autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </span>
          </label>
          <a className="forgot-link" href="/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
          <button className="admin-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
