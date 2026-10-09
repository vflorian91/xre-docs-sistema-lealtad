'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Mail, Phone, ShoppingBag, UserRound } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type RegistrationOptions = {
  brands: Array<{ id: string; code: string; name: string }>;
  stores: Array<{ id: string; code: string; name: string; address?: string | null; brandId?: string | null }>;
};

export default function RegistroClientePage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    taxId: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    brandItemId: '',
    registrationStoreId: '',
  });
  const [options, setOptions] = useState<RegistrationOptions>({ brands: [], stores: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/auth/customer/registration-options`)
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar marcas y tiendas.');
        return response.json() as Promise<RegistrationOptions>;
      })
      .then(setOptions)
      .catch((error) => setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudieron cargar las opciones.' }));
  }, []);

  const availableStores = useMemo(() => options.stores.filter((store) => (
    !form.brandItemId || !store.brandId || store.brandId === form.brandItemId
  )), [options.stores, form.brandItemId]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    const cleanedPhone = cleanPhone(form.phone);

    if (cleanedPhone.length !== 8) {
      setMessage({ type: 'error', text: 'El teléfono debe tener exactamente 8 dígitos.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/auth/customer/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          taxId: form.taxId,
          phone: cleanedPhone,
          email: form.email,
          password: form.password,
          brandItemId: form.brandItemId || undefined,
          registrationStoreId: form.registrationStoreId || undefined,
        }),
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;

      if (!response.ok) {
        const issueText = body?.issues?.map((issue: { message: string }) => issue.message).join(' ');
        throw new Error(issueText || body?.message || 'No se pudo completar el registro.');
      }

      window.localStorage.removeItem('clientSummary');
      setMessage({ type: 'success', text: 'Cuenta creada correctamente.' });
      window.location.href = '/perfil';
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo completar el registro.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="client-stage">
      <section className="client-screen auth-client-screen modern-auth-screen">
        <header className="modern-auth-header">
          <img alt="Sistema de Lealtad" src="/icons/icon-512.png" />
          <strong>Sistema de Lealtad</strong>
          <p>Tus compras, tus beneficios</p>
          <h1>Crear cuenta</h1>
          <span>Regístrate con tus datos básicos. El NIT es obligatorio.</span>
        </header>

        <form className="client-login modern-auth-card" onSubmit={register}>
          {message ? <RegisterMessage message={message} /> : null}
          <label className="modern-auth-field">
            <span>Nombre</span>
            <div>
              <UserRound size={24} />
              <input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Tu nombre" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Apellido</span>
            <div>
              <UserRound size={24} />
              <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Tu apellido" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>NIT</span>
            <div>
              <UserRound size={24} />
              <input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} placeholder="NIT" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Teléfono</span>
            <div>
              <Phone size={24} />
              <input inputMode="numeric" maxLength={8} value={form.phone} onChange={(event) => setForm({ ...form, phone: cleanPhone(event.target.value).slice(-8) })} placeholder="55554444" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Correo electrónico</span>
            <div>
              <Mail size={24} />
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="correo@ejemplo.com" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Contraseña</span>
            <div>
              <LockKeyhole size={24} />
              <input minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Mínimo 8 caracteres" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Confirmar contraseña</span>
            <div>
              <LockKeyhole size={24} />
              <input minLength={8} type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Repite tu contraseña" required />
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Marca</span>
            <div>
              <ShoppingBag size={24} />
              <select value={form.brandItemId} onChange={(event) => setForm({ ...form, brandItemId: event.target.value, registrationStoreId: '' })}>
                <option value="">Selecciona una marca</option>
                {options.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </div>
          </label>
          <label className="modern-auth-field">
            <span>Tienda</span>
            <div>
              <ShoppingBag size={24} />
              <select value={form.registrationStoreId} onChange={(event) => setForm({ ...form, registrationStoreId: event.target.value })}>
                <option value="">Selecciona una tienda</option>
                {availableStores.map((store) => <option key={store.id} value={store.id}>{store.name}{store.address ? ` · ${store.address}` : ''}</option>)}
              </select>
            </div>
          </label>
          <button className="client-primary modern-auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
            Crear cuenta
          </button>
          <div className="register-row">
            <span>¿Ya tienes cuenta?</span>
            <a href="/">Inicia sesión</a>
          </div>
        </form>
      </section>
    </main>
  );
}

function cleanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('502') && digits.length > 8 ? digits.slice(3) : digits;
}

function RegisterMessage({ message }: { message: { type: 'success' | 'error'; text: string } }) {
  const Icon = message.type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`client-status ${message.type}`}>
      <Icon size={18} />
      <span>{message.text}</span>
    </div>
  );
}
