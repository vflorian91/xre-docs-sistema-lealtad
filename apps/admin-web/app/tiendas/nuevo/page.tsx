'use client';

import { ArrowLeft, Building2, MapPin, Save, Store } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';

type StoreLocationType = 'CAPITAL' | 'DEPARTMENT';

type CatalogItem = { id: string; code: string; name: string; isActive?: boolean; parentItemId?: string | null };
type CatalogData = { code: string; items: CatalogItem[] };

type StoreForm = {
  name: string;
  address: string;
  locationType: StoreLocationType;
  countryId: string;
  departmentId: string;
  municipalityId: string;
  brandId: string;
};

const emptyForm: StoreForm = {
  name: '',
  address: '',
  locationType: 'CAPITAL',
  countryId: '',
  departmentId: '',
  municipalityId: '',
  brandId: '',
};

type NuevaTiendaPageProps = {
  basePath?: string;
};

export default function NuevaTiendaPage({ basePath = '/catalogos/tiendas' }: NuevaTiendaPageProps) {
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [countries, setCountries] = useState<CatalogItem[]>([]);
  const [departments, setDepartments] = useState<CatalogItem[]>([]);
  const [municipalities, setMunicipalities] = useState<CatalogItem[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);

  const filteredDepts = useMemo(
    () => form.countryId ? departments.filter((item) => item.parentItemId === form.countryId) : [],
    [departments, form.countryId],
  );
  const filteredMunis = useMemo(
    () => form.departmentId ? municipalities.filter((item) => item.parentItemId === form.departmentId) : [],
    [departments, form.departmentId, municipalities],
  );

  useEffect(() => {
    void loadGeoCatalogs();
  }, []);

  async function loadGeoCatalogs() {
    try {
      const [paisData, deptData, munData, brandsData] = await Promise.all([
        adminApiRequest<CatalogData>('/catalogs/PAIS'),
        adminApiRequest<CatalogData>('/catalogs/DEPARTAMENTO'),
        adminApiRequest<CatalogData>('/catalogs/MUNICIPIO'),
        adminApiRequest<CatalogData>('/catalogs/BRANDS'),
      ]);
      setCountries(activeItems(paisData.items));
      setDepartments(activeItems(deptData.items));
      setMunicipalities(activeItems(munData.items));
      setBrands(activeItems(brandsData.items));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los catalogos geograficos.') });
    }
  }

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      setMessage({ type: 'error', text: 'Completa los campos obligatorios de tienda y ubicacion.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest('/stores', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          locationType: form.locationType,
          countryId: form.countryId,
          departmentId: form.departmentId,
          municipalityId: form.municipalityId,
          brandId: form.brandId || undefined,
          status: 'ACTIVE',
        }),
      });

      window.location.href = basePath;
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear la tienda. Verifica la informacion e intenta nuevamente.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSave = Boolean(form.name.trim() && form.address.trim() && form.locationType && form.countryId && form.departmentId && form.municipalityId);
  const geoLabel = [
    countries.find((item) => item.id === form.countryId)?.name,
    departments.find((item) => item.id === form.departmentId)?.name,
    municipalities.find((item) => item.id === form.municipalityId)?.name,
  ].filter(Boolean).join(' > ') || 'Sin especificar';

  return (
    <AdminRoutedShell title="Crear tienda">
      <form className="customer-edit-page" onSubmit={createStore}>
        <div className="customer-edit-header">
          <a aria-label="Volver a tiendas" className="customer-back-button" href={basePath}>
            <ArrowLeft size={20} />
          </a>
          <div>
            <h2>Crear tienda</h2>
            <p>Registra una nueva sucursal para operar clientes, compras y usuarios.</p>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <section className="panel customer-edit-hero">
          <div className="customer-edit-photo-block">
            <div className="customer-avatar-large"><Store size={64} /></div>
          </div>
          <div className="customer-edit-summary">
            <h3>Nueva tienda</h3>
            <p>Codigo de tienda</p>
            <strong className="customer-code-inline">Se generara automaticamente</strong>
            <div className="customer-edit-summary-grid">
              <div className="customer-edit-summary-item"><span>Estado inicial</span><strong>Activa</strong></div>
              <div className="customer-edit-summary-item"><span>Ubicación</span><strong>{geoLabel}</strong></div>
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="panel customer-edit-card wide">
            <h3><Building2 size={18} /> Informacion de la tienda</h3>
            <div className="customer-edit-fields address">
              <label className="span-2">
                Nombre de tienda <b>*</b>
                <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre de la tienda" />
              </label>
              <CatalogSearchField label="Marca" value={form.brandId} options={brands} onChange={(value) => setForm({ ...form, brandId: value })} />
              <label className="span-2">
                Nombre Centro Comercial <b>*</b>
                <input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Centro comercial, nivel, zona o referencia" />
              </label>
            </div>
          </article>

          <article className="panel customer-edit-card wide">
            <h3><MapPin size={18} /> Segmentacion geografica</h3>
            <div className="customer-edit-fields two">
              <CatalogSearchField label="Pais" required value={form.countryId} options={countries} onChange={(value) => setForm({ ...form, countryId: value, departmentId: '', municipalityId: '' })} />
              <CatalogSearchField label="Departamento" required value={form.departmentId} options={filteredDepts} disabled={!form.countryId} onChange={(value) => setForm({ ...form, departmentId: value, municipalityId: '' })} />
              <CatalogSearchField label="Municipio" required value={form.municipalityId} options={filteredMunis} disabled={!form.departmentId} onChange={(value) => setForm({ ...form, municipalityId: value })} />
            </div>
          </article>
        </section>

        <div className="customer-edit-bottom-actions">
          <a className="admin-secondary" href={basePath}>Cancelar</a>
          <button className="admin-primary" disabled={isSubmitting || !canSave} type="submit">
            <Save size={16} />
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </AdminRoutedShell>
  );
}

function CatalogSearchField({
  label,
  value,
  options,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: CatalogItem[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);
  const filteredOptions = useMemo(() => filterCatalogOptions(options, query), [options, query]);

  useEffect(() => {
    if (!isOpen) setQuery(selectedOption?.name ?? '');
  }, [isOpen, selectedOption?.name]);

  function commitExactMatch(nextQuery: string) {
    const exact = options.find((option) => normalizeSearch(option.name) === normalizeSearch(nextQuery) || normalizeSearch(option.code) === normalizeSearch(nextQuery));
    onChange(exact?.id ?? '');
    setQuery(exact?.name ?? '');
    setIsOpen(false);
  }

  return (
    <label className="catalog-search-field">
      {label} {required ? <b>*</b> : null}
      <input
        autoComplete="off"
        disabled={disabled}
        placeholder={disabled ? 'Selecciona el campo anterior' : 'Escribe para buscar'}
        required={required}
        value={query}
        onBlur={() => window.setTimeout(() => commitExactMatch(query), 120)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          if (!nextQuery.trim()) onChange('');
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
      />
      {isOpen && !disabled ? (
        <div className="catalog-autocomplete-list">
          {filteredOptions.length ? filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.id);
                setQuery(option.name);
                setIsOpen(false);
              }}
            >
              <strong>{option.name}</strong>
              <span>{option.code}</span>
            </button>
          )) : (
            <div className="catalog-autocomplete-empty">No hay registros disponibles</div>
          )}
        </div>
      ) : null}
    </label>
  );
}

function activeItems(items: CatalogItem[]) {
  return items.filter((item) => item.isActive !== false);
}

function filterCatalogOptions(options: CatalogItem[], query: string) {
  const normalizedQuery = normalizeSearch(query);
  const matches = normalizedQuery
    ? options.filter((option) => normalizeSearch(`${option.name} ${option.code}`).includes(normalizedQuery))
    : options;

  return matches
    .sort((left, right) => {
      const leftName = normalizeSearch(left.name);
      const rightName = normalizeSearch(right.name);
      const leftExact = leftName === normalizedQuery ? 0 : leftName.startsWith(normalizedQuery) ? 1 : 2;
      const rightExact = rightName === normalizedQuery ? 0 : rightName.startsWith(normalizedQuery) ? 1 : 2;
      return leftExact - rightExact || left.name.localeCompare(right.name, 'es');
    })
    .slice(0, 25);
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function locationLabel(value: StoreLocationType) {
  return value === 'CAPITAL' ? 'Capital' : 'Departamento';
}
