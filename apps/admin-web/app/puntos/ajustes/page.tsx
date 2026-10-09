'use client';

import { ArrowLeft, Save, Search, User, WalletCards } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';

type CustomerRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  availablePoints?: number;
};

type AdjustmentForm = {
  customerId: string;
  points: string;
  description: string;
};

export default function AjustePuntosPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<AdjustmentForm>({ customerId: '', points: '', description: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<CustomerRow[]>('/customers');
      setCustomers(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los clientes.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function createAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest('/points/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId,
          points: Number(form.points),
          description: form.description,
        }),
      });
      setForm({ customerId: '', points: '', description: '' });
      setMessage({ type: 'success', text: 'Ajuste de puntos registrado correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo registrar el ajuste.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.trim().toLowerCase();
    return !search
      || customer.fullName.toLowerCase().includes(search)
      || customer.code.toLowerCase().includes(search)
      || customer.phone.toLowerCase().includes(search);
  });

  const selectedCustomer = customers.find((customer) => customer.id === form.customerId);

  return (
    <AdminRoutedShell title="Puntos">
      <form className="customer-edit-page" onSubmit={createAdjustment}>
        <section className="customer-edit-header">
          <div>
            <a aria-label="Volver a puntos" className="customer-back-button" href="/puntos">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Ajustar puntos</h2>
              <p>Acredita o debita puntos manualmente a un cliente.</p>
            </div>
          </div>
          <div className="customer-edit-actions">
            <a className="admin-secondary" href="/puntos">Cancelar</a>
            <button className="admin-primary" disabled={isSubmitting || !form.customerId || !form.points || !form.description} type="submit">
              <Save size={16} />
              Guardar ajuste
            </button>
          </div>
        </section>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <section className="customer-edit-hero">
          <div className="customer-edit-photo-block">
            <div className="customer-avatar-large"><WalletCards size={64} /></div>
          </div>
          <div className="customer-edit-summary">
            <h3>{selectedCustomer?.fullName || 'Selecciona un cliente'}</h3>
            <p>{selectedCustomer ? `${selectedCustomer.code} · ${selectedCustomer.phone}` : 'Busca por nombre, codigo o telefono.'}</p>
            <div className="customer-edit-summary-grid">
              <div className="customer-edit-summary-item">
                <span>Saldo actual</span>
                <strong>{selectedCustomer?.availablePoints ?? 0} puntos</strong>
              </div>
              <div className="customer-edit-summary-item">
                <span>Ajuste</span>
                <strong>{form.points || 0} puntos</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="customer-edit-card">
            <h3><User size={18} /> Cliente</h3>
            <div className="customer-edit-fields">
              <label>
                Buscar cliente
                <div className="customer-edit-input-icon">
                  <Search size={16} />
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nombre, codigo o telefono" />
                </div>
              </label>
              <label>
                Cliente <b>*</b>
                <select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
                  <option value="">{isLoading ? 'Cargando clientes...' : 'Seleccionar cliente'}</option>
                  {filteredCustomers.map((customer) => (
                    <option value={customer.id} key={customer.id}>{customer.fullName} · {customer.code}</option>
                  ))}
                </select>
              </label>
            </div>
          </article>

          <article className="customer-edit-card">
            <h3><WalletCards size={18} /> Ajuste</h3>
            <div className="customer-edit-fields two">
              <label>
                Puntos <b>*</b>
                <input inputMode="numeric" value={form.points} onChange={(event) => setForm({ ...form, points: event.target.value.replace(/[^\d-]/g, '') })} placeholder="Ej. 100 o -50" />
              </label>
              <label>
                Descripcion <b>*</b>
                <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Motivo del ajuste" />
              </label>
            </div>
          </article>
        </section>
      </form>
    </AdminRoutedShell>
  );
}
