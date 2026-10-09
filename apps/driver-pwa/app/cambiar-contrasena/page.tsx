'use client';

import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { DriverUser, driverApiRequest, setDriverSession } from '../lib/driverApi';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await driverApiRequest<{ driver: DriverUser }>('/driver/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      setDriverSession(result);
      window.location.href = '/inicio';
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Cambiar contraseña</h1>
        <p>Define tu contraseña para continuar a Mis entregas.</p>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        <form className="auth-form" onSubmit={submit}>
          <label className="field">Contraseña nueva<input minLength={8} required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label className="field">Confirmar contraseña<input minLength={8} required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button className="primary-button" disabled={submitting || newPassword.length < 8 || newPassword !== confirmPassword} type="submit"><Save size={18} />Guardar</button>
        </form>
      </section>
    </main>
  );
}
