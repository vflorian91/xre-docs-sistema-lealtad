'use client';

import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { DriverUser, driverApiRequest, setDriverSession } from '../lib/driverApi';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Ingresa tu correo electronico.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Ingresa un correo electronico valido.');
      return;
    }
    if (!password) {
      setError('Ingresa tu contrasena.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await driverApiRequest<{ driver: DriverUser }>('/driver/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password, rememberMe }),
      });
      setDriverSession(result, rememberMe);
      window.location.href = result.driver.mustChangePassword ? '/cambiar-contrasena' : '/inicio';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="driver-login-page">
      <section className="driver-login-card" aria-labelledby="driver-login-title">
        <h1 id="driver-login-title">Acceso de motorista</h1>
        <p>Ingresa con tu correo y contraseña para ver tus rutas, pedidos asignados y estado de entregas.</p>
        {error ? <div className="form-error driver-login-error">{error}</div> : null}
        <form className="driver-login-form" onSubmit={submit} noValidate>
          <label className="driver-login-field">
            <span>Correo electrónico</span>
            <span className="driver-login-input">
              <Mail size={24} aria-hidden="true" />
              <input
                autoComplete="email"
                inputMode="email"
                placeholder="correo@empresa.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="driver-login-field">
            <span>Contraseña</span>
            <span className="driver-login-input">
              <LockKeyhole size={24} aria-hidden="true" />
              <input
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="driver-password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={25} aria-hidden="true" /> : <Eye size={25} aria-hidden="true" />}
              </button>
            </span>
          </label>
          <label className="driver-remember-row">
            <input checked={rememberMe} type="checkbox" onChange={(event) => setRememberMe(event.target.checked)} />
            <span>Mantener sesión iniciada</span>
          </label>
          <button className="driver-login-submit" disabled={submitting} type="submit">
            <LogIn size={27} aria-hidden="true" />
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
