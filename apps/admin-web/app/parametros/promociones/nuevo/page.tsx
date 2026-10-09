'use client';

import { ArrowLeft, FilePlus2, MapPin, Megaphone, Store } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';

type CatalogItem = { id: string; name: string; isActive: boolean; parentItemId?: string | null };
type CatalogRow = { code: string; items: CatalogItem[] };
type StoreOption = { id: string; code: string; name: string; status: string };
type StoresResponse = { data: StoreOption[] };
type LoyaltyLevelTier = { id: string; code: string; name: string; isActive: boolean; sortOrder: number };


const emptyForm = {
  name: '',
  type: 'DOUBLE_POINTS',
  multiplier: '2',
  bonusPoints: '',
  minimumAmount: '',
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: '',
  targetLevels: [] as string[],
  storeId: '',
  brandItemId: '',
  shoeTypeId: '',
  departmentId: '',
  municipalityId: '',
};

export default function NuevaPromocionPage() {
  const [form, setForm] = useState(emptyForm);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [shoeTypes, setShoeTypes] = useState<CatalogItem[]>([]);
  const [departments, setDepartments] = useState<CatalogItem[]>([]);
  const [municipalities, setMunicipalities] = useState<CatalogItem[]>([]);
  const [levelTiers, setLevelTiers] = useState<LoyaltyLevelTier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [shoeTypesData, storesResult, brandsResult, deptData, munData, levelsResult] = await Promise.all([
        adminApiRequest<CatalogRow>('/catalogs/SHOE_TYPES'),
        adminApiRequest<StoresResponse>('/stores?limit=500&status=ACTIVE&sortBy=name&sortDirection=asc'),
        adminApiRequest<CatalogRow>('/catalogs/BRANDS'),
        adminApiRequest<CatalogRow>('/catalogs/DEPARTAMENTO'),
        adminApiRequest<CatalogRow>('/catalogs/MUNICIPIO'),
        adminApiRequest<LoyaltyLevelTier[]>('/loyalty-levels'),
      ]);
      setShoeTypes(shoeTypesData.items.filter((item) => item.isActive) ?? []);
      setStores(storesResult.data.filter((store) => store.status === 'ACTIVE'));
      setBrands(brandsResult.items.filter((brand) => brand.isActive));
      setDepartments(deptData.items.filter((i) => i.isActive !== false));
      setMunicipalities(munData.items.filter((i) => i.isActive !== false));
      setLevelTiers([...levelsResult].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar catalogos y tiendas.') });
    }
  }

  async function createPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest('/points/promotions', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          multiplier: form.type === 'FIXED_BONUS' ? null : Number(form.multiplier),
          bonusPoints: form.bonusPoints ? Number(form.bonusPoints) : null,
          minimumAmount: form.minimumAmount ? Number(form.minimumAmount) : null,
          startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
          endsAt: new Date(`${form.endsAt}T23:59:59`).toISOString(),
          targetLevels: form.targetLevels,
          storeId: form.storeId || null,
          brandItemId: form.brandItemId || null,
          shoeTypeId: form.shoeTypeId || null,
          departmentId: form.departmentId || null,
          municipalityId: form.municipalityId || null,
        }),
      });

      window.location.href = '/parametros/promociones';
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear la promocion.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const needsMultiplier = form.type !== 'FIXED_BONUS';

  const filteredMunis = form.departmentId
    ? municipalities.filter((m) => m.parentItemId === form.departmentId)
    : municipalities;

  return (
    <AdminRoutedShell title="Parametros / Promociones">
      <form className="customer-edit-page" onSubmit={createPromotion}>
        <div className="customer-edit-header">
          <a aria-label="Regresar a promociones" className="customer-back-button" href="/parametros/promociones"><ArrowLeft size={20} /></a>
          <div>
            <h2>Nueva promocion</h2>
            <p>Crea una campaña temporal que modifica la acumulacion base de puntos.</p>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <section className="panel customer-edit-hero">
          <div className="customer-edit-photo-block">
            <div className="customer-avatar-large"><Megaphone size={64} /></div>
          </div>
          <div className="customer-edit-summary">
            <h3>{form.name || 'Nueva promocion'}</h3>
            <p>Vigencia definida obligatoria</p>
            <strong className="customer-code-inline">{form.startsAt} - {form.endsAt || 'pendiente'}</strong>
            <div className="customer-edit-summary-grid">
              <div className="customer-edit-summary-item"><span>Beneficio</span><strong>{needsMultiplier ? `${form.multiplier || 1}x` : `+${form.bonusPoints || 0} puntos`}</strong></div>
              <div className="customer-edit-summary-item"><span>Publico</span><strong>{form.targetLevels.length ? form.targetLevels.join(', ') : 'Todos'}</strong></div>
              <div className="customer-edit-summary-item"><span>Tienda</span><strong>{stores.find((store) => store.id === form.storeId)?.name ?? 'Todas'}</strong></div>
              <div className="customer-edit-summary-item"><span>Zona</span><strong>{municipalities.find((m) => m.id === form.municipalityId)?.name ?? departments.find((d) => d.id === form.departmentId)?.name ?? 'Nacional'}</strong></div>
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="panel customer-edit-card">
            <h3><Megaphone size={18} /> Promocion</h3>
            <div className="customer-edit-fields two">
              <label>
                Nombre <b>*</b>
                <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                Tipo <b>*</b>
                <select required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, multiplier: event.target.value === 'TRIPLE_POINTS' ? '3' : event.target.value === 'DOUBLE_POINTS' ? '2' : form.multiplier })}>
                  <option value="DOUBLE_POINTS">Puntos dobles</option>
                  <option value="TRIPLE_POINTS">Puntos triples</option>
                  <option value="CUSTOM_MULTIPLIER">Multiplicador personalizado</option>
                  <option value="FIXED_BONUS">Puntos adicionales fijos</option>
                  <option value="SPECIAL_AMOUNT">Regla especial por monto</option>
                  <option value="SHOE_TYPE_RULE">Regla especial por tipo de calzado</option>
                </select>
              </label>
              {needsMultiplier ? (
                <label>
                  Multiplicador <b>*</b>
                  <input inputMode="decimal" min="0.01" required step="0.01" type="number" value={form.multiplier} onChange={(event) => setForm({ ...form, multiplier: event.target.value })} />
                </label>
              ) : (
                <label>
                  Puntos adicionales <b>*</b>
                  <input inputMode="numeric" min="1" required type="number" value={form.bonusPoints} onChange={(event) => setForm({ ...form, bonusPoints: event.target.value.replace(/\D/g, '') })} />
                </label>
              )}
              <label>
                Compra minima de promocion
                <input inputMode="decimal" min="0" step="0.01" type="number" value={form.minimumAmount} onChange={(event) => setForm({ ...form, minimumAmount: event.target.value })} />
              </label>
              <label>
                Fecha de inicio <b>*</b>
                <input required type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
              </label>
              <label>
                Fecha de finalizacion <b>*</b>
                <input required type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
              </label>
            </div>
          </article>

          <article className="panel customer-edit-card">
            <h3><Store size={18} /> Segmentacion</h3>
            <div className="customer-edit-fields two">
              <div className="customer-checkbox-group">
                <span>Publico objetivo (vacio = todos los niveles)</span>
                <div className="customer-checkbox-options">
                  {levelTiers.map((tier) => (
                    <label className="catalog-checkbox" key={tier.id}>
                      <input
                        checked={form.targetLevels.includes(tier.name)}
                        onChange={(event) => setForm({
                          ...form,
                          targetLevels: event.target.checked
                            ? [...form.targetLevels, tier.name]
                            : form.targetLevels.filter((name) => name !== tier.name),
                        })}
                        type="checkbox"
                      />
                      {tier.name}
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Tienda
                <select value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })}>
                  <option value="">Todas las tiendas</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>
              <label>
                Marca
                <select value={form.brandItemId} onChange={(event) => setForm({ ...form, brandItemId: event.target.value })}>
                  <option value="">Todas las marcas</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
              </label>
              <label>
                Tipo de calzado
                <select value={form.shoeTypeId} onChange={(event) => setForm({ ...form, shoeTypeId: event.target.value })}>
                  <option value="">Todos</option>
                  {shoeTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
          </article>

          <article className="panel customer-edit-card">
            <h3><MapPin size={18} /> Zona geografica</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Opcional. Limita la promocion a clientes registrados en una zona especifica.
            </p>
            <div className="customer-edit-fields two">
              <label>
                Departamento
                <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value, municipalityId: '' })}>
                  <option value="">Todos los departamentos</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>
                Municipio
                <select value={form.municipalityId} onChange={(event) => setForm({ ...form, municipalityId: event.target.value })} disabled={!form.departmentId && filteredMunis.length === 0}>
                  <option value="">Todos los municipios</option>
                  {filteredMunis.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            </div>
          </article>
        </section>

        <div className="customer-edit-bottom-actions">
          <a className="admin-secondary" href="/parametros/promociones">Cancelar</a>
          <button className="admin-primary" disabled={isSubmitting} type="submit">
            <FilePlus2 size={16} />
            {isSubmitting ? 'Creando...' : 'Crear promocion'}
          </button>
        </div>
      </form>
    </AdminRoutedShell>
  );
}
