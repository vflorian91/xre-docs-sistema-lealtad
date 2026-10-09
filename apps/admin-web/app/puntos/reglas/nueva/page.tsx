'use client';

import { ArrowLeft, Calendar, Save, Settings, WalletCards } from 'lucide-react';
import { FormEvent, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';

const emptyRuleForm = {
  name: 'Regla Q1 = 1 punto',
  amountPerPoint: '1',
  pointValueAmount: '0.01',
  minimumAmount: '0',
  maxPointsPerPurchase: '1000',
  pointsExpirationDays: '',
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: '',
  activateNow: true,
};

export default function NuevaReglaPuntosPage() {
  const [form, setForm] = useState(emptyRuleForm);
  const [createdRuleId, setCreatedRuleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function createPointRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setCreatedRuleId(null);
    setMessage(null);

    try {
      const rule = await adminApiRequest<{ id: string }>('/points/rules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          amountPerPoint: Number(form.amountPerPoint),
          pointValueAmount: Number(form.pointValueAmount),
          minimumAmount: Number(form.minimumAmount),
          maxPointsPerPurchase: Number(form.maxPointsPerPurchase),
          pointsExpirationDays: form.pointsExpirationDays ? Number(form.pointsExpirationDays) : null,
          roundingMode: 'FLOOR',
          startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
          activateNow: form.activateNow,
        }),
      });
      setCreatedRuleId(rule.id);
      setForm(emptyRuleForm);
      setMessage({ type: 'success', text: form.activateNow ? 'Regla de puntos creada y activada.' : 'Regla de puntos creada correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear la regla.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Puntos">
      <form className="customer-edit-page" onSubmit={createPointRule}>
        <section className="customer-edit-header">
          <div>
            <a aria-label="Volver a puntos" className="customer-back-button" href="/puntos">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Crear regla de puntos</h2>
              <p>Define como se calculan los puntos por compras registradas.</p>
            </div>
          </div>
          <div className="customer-edit-actions">
            <a className="admin-secondary" href="/puntos">Cancelar</a>
            <button className="admin-primary" disabled={isSubmitting || !form.name || !form.amountPerPoint} type="submit">
              <Save size={16} />
              Crear regla
            </button>
          </div>
        </section>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {createdRuleId ? <div className="form-success"><a href={`/puntos/reglas/${createdRuleId}`}>Ver regla creada</a></div> : null}

        <section className="customer-edit-hero">
          <div className="customer-edit-photo-block">
            <div className="customer-avatar-large"><WalletCards size={64} /></div>
          </div>
          <div className="customer-edit-summary">
            <h3>{form.name || 'Nueva regla'}</h3>
            <p>Q{form.amountPerPoint || 0} por punto desde Q{form.minimumAmount || 0}.</p>
            <div className="customer-edit-summary-grid">
              <div className="customer-edit-summary-item">
                <span>Activacion</span>
                <strong className={form.activateNow ? 'summary-green' : ''}>{form.activateNow ? 'Inmediata' : 'Manual'}</strong>
              </div>
              <div className="customer-edit-summary-item">
                <span>Redondeo</span>
                <strong>FLOOR</strong>
              </div>
              <div className="customer-edit-summary-item">
                <span>Maximo</span>
                <strong>{form.maxPointsPerPurchase || 'Sin limite'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="customer-edit-card">
            <h3><Settings size={18} /> Parametros</h3>
            <div className="customer-edit-fields two">
              <label>
                Nombre <b>*</b>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                Quetzales por punto <b>*</b>
                <input inputMode="decimal" value={form.amountPerPoint} onChange={(event) => setForm({ ...form, amountPerPoint: event.target.value })} />
              </label>
              <label>
                Monto minimo
                <input inputMode="decimal" value={form.minimumAmount} onChange={(event) => setForm({ ...form, minimumAmount: event.target.value })} />
              </label>
              <label>
                Valor de punto en Q
                <input inputMode="decimal" value={form.pointValueAmount} onChange={(event) => setForm({ ...form, pointValueAmount: event.target.value })} />
              </label>
              <label>
                Maximo por compra
                <input inputMode="numeric" value={form.maxPointsPerPurchase} onChange={(event) => setForm({ ...form, maxPointsPerPurchase: event.target.value.replace(/\D/g, '') })} placeholder="Sin limite" />
              </label>
              <label>
                Vencimiento en dias
                <input inputMode="numeric" value={form.pointsExpirationDays} onChange={(event) => setForm({ ...form, pointsExpirationDays: event.target.value.replace(/\D/g, '') })} placeholder="Sin vencimiento" />
              </label>
            </div>
          </article>

          <article className="customer-edit-card">
            <h3><Calendar size={18} /> Vigencia</h3>
            <div className="customer-edit-fields two">
              <label>
                Inicio
                <input type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
              </label>
              <label>
                Fin
                <input type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
              </label>
              <label>
                Activar ahora
                <select value={form.activateNow ? 'YES' : 'NO'} onChange={(event) => setForm({ ...form, activateNow: event.target.value === 'YES' })}>
                  <option value="YES">Si, activar al crear</option>
                  <option value="NO">No, dejar inactiva</option>
                </select>
              </label>
            </div>
          </article>
        </section>
      </form>
    </AdminRoutedShell>
  );
}
