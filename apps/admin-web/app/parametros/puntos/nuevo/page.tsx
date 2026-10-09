'use client';

import { ArrowLeft, FilePlus2, Settings, WalletCards } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';
import { formatMoney } from '../../../lib/format';

type BrandOption = { id: string; code: string; name: string; isActive: boolean };

const emptyForm = {
  name: 'Regla base de puntos',
  amountPerPoint: '10',
  pointValueAmount: '0.10',
  minimumAmount: '0',
  maxPointsPerPurchase: '',
  pointsExpirationDays: '',
  startsAt: '',
  brandItemId: '',
};

function getLocalDateInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NuevaReglaPuntosPage() {
  const [form, setForm] = useState(() => ({ ...emptyForm, startsAt: getLocalDateInput() }));
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApiRequest<{ items: BrandOption[] }>('/catalogs/BRANDS')
      .then((catalog) => setBrands(catalog.items.filter((brand) => brand.isActive)))
      .catch(() => {});
  }, []);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest('/points/rules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          amountPerPoint: Number(form.amountPerPoint),
          pointValueAmount: Number(form.pointValueAmount),
          minimumAmount: Number(form.minimumAmount),
          maxPointsPerPurchase: form.maxPointsPerPurchase ? Number(form.maxPointsPerPurchase) : null,
          pointsExpirationDays: form.pointsExpirationDays ? Number(form.pointsExpirationDays) : null,
          roundingMode: 'FLOOR',
          startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : undefined,
          activateNow: true,
          brandItemId: form.brandItemId,
        }),
      });

      window.location.href = '/parametros/puntos';
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear la regla de puntos.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = Boolean(
    form.name.trim()
    && Number(form.amountPerPoint) > 0
    && Number(form.pointValueAmount) > 0
    && form.minimumAmount !== ''
    && Number(form.minimumAmount) >= 0
    && form.startsAt
    && form.brandItemId,
  );

  return (
    <AdminRoutedShell title="Parametros / Puntos">
      <form className="customer-edit-page" onSubmit={createRule}>
        <div className="customer-edit-header">
          <a aria-label="Regresar a puntos" className="customer-back-button" href="/parametros/puntos">
            <ArrowLeft size={20} />
          </a>
          <div>
            <h2>Nueva logica de puntos</h2>
            <p>Al guardar, esta regla queda activa y finaliza la regla activa anterior.</p>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <section className="panel customer-edit-hero">
          <div className="customer-edit-photo-block">
            <div className="customer-avatar-large"><WalletCards size={64} /></div>
          </div>
          <div className="customer-edit-summary">
            <h3>{form.name || 'Nueva regla'}</h3>
            <p>Q gastados por punto</p>
            <strong className="customer-code-inline">Q{formatMoney(form.amountPerPoint || 0)} = 1 punto</strong>
            <div className="customer-edit-summary-grid">
              <div className="customer-edit-summary-item"><span>Valor punto</span><strong>Q{formatPointValue(form.pointValueAmount || 0)}</strong></div>
              <div className="customer-edit-summary-item"><span>Compra minima</span><strong>Q{formatMoney(form.minimumAmount || 0)}</strong></div>
              <div className="customer-edit-summary-item"><span>Vencimiento</span><strong>{form.pointsExpirationDays ? `${form.pointsExpirationDays} dias` : 'Sin vencimiento'}</strong></div>
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="panel customer-edit-card wide">
            <h3><Settings size={18} /> Parametros de acumulacion</h3>
            <div className="customer-edit-fields two">
              <label>
                Nombre <b>*</b>
                <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                Cantidad de Q gastados por punto <b>*</b>
                <input inputMode="decimal" min="0.01" required step="0.01" type="number" value={form.amountPerPoint} onChange={(event) => setForm({ ...form, amountPerPoint: event.target.value })} />
              </label>
              <label>
                Valor de cada punto en Q <b>*</b>
                <input inputMode="decimal" min="0.00001" required step="0.00001" type="number" value={form.pointValueAmount} onChange={(event) => setForm({ ...form, pointValueAmount: event.target.value })} />
              </label>
              <label>
                Compra minima para acumular <b>*</b>
                <input inputMode="decimal" min="0" required step="0.01" type="number" value={form.minimumAmount} onChange={(event) => setForm({ ...form, minimumAmount: event.target.value })} />
              </label>
              <label>
                Maximo de puntos por compra
                <input inputMode="numeric" min="1" placeholder="Sin limite" type="number" value={form.maxPointsPerPurchase} onChange={(event) => setForm({ ...form, maxPointsPerPurchase: event.target.value.replace(/\D/g, '') })} />
              </label>
              <label>
                Vencimiento de puntos en dias
                <input inputMode="numeric" placeholder="Sin vencimiento" value={form.pointsExpirationDays} onChange={(event) => setForm({ ...form, pointsExpirationDays: event.target.value.replace(/\D/g, '') })} />
              </label>
              <label>
                Fecha de inicio <b>*</b>
                <input required type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
              </label>
              <label>
                Marca <b>*</b>
                <select required value={form.brandItemId} onChange={(event) => setForm({ ...form, brandItemId: event.target.value })}>
                  <option value="">Selecciona una marca</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
              </label>
            </div>
          </article>
        </section>

        <div className="customer-edit-bottom-actions">
          <a className="admin-secondary" href="/parametros/puntos">Cancelar</a>
          <button className="admin-primary" disabled={isSubmitting || !canSubmit} type="submit">
            <FilePlus2 size={16} />
            {isSubmitting ? 'Creando...' : 'Crear regla'}
          </button>
        </div>
      </form>
    </AdminRoutedShell>
  );
}

function formatPointValue(value: string | number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(Number(value));
}
