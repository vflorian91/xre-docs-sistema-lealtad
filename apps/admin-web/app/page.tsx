'use client';

import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { hasAdminSession, setAdminSession } from './lib/adminApi';
import XdocWordmark from './components/XdocWordmark';

import { fetchAdminResponse, readAdminBody } from './lib/apiTransport';

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
      const response = await fetchAdminResponse('/auth/internal/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const body = await readAdminBody(response);

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
            <XdocWordmark />
          </div>
          <h1>Bienvenido de nuevo</h1>
          <p>Tu tienda, tus clientes y cada nuevo paso, en un solo lugar.</p>
          <div className="xdoc-admin-editorial" aria-hidden="true">
            <img src="/images/editorial/court.webp" alt="" />
            <img src="/images/editorial/runner.png" alt="" />
            <img src="/images/editorial/classic.png" alt="" />
            <img src="/images/editorial/canvas.png" alt="" />
          </div>
          <span className="xdoc-admin-caption">Un clásico en cada paso.</span>
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
            {isSubmitting ? 'Conectando con el servidor…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
