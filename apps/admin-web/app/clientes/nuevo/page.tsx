'use client';

import { ArrowLeft, MapPin, Phone, Save, Star, User } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  parentItemId?: string | null;
};

type CatalogRow = {
  code: string;
  items: CatalogItem[];
};

type CreateForm = {
  firstName: string;
  lastName: string;
  Nit: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  city: string;
  department: string;
  country: string;
  brand: string;
  reference: string;
};

export default function NewCustomerPage() {
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setUser(getStoredAdminUser());
    void loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [brandsResult, countriesResult, departmentsResult, citiesResult] = await Promise.all([
        adminApiRequest<CatalogRow>('/catalogs/BRANDS'),
        adminApiRequest<CatalogRow>('/catalogs/PAIS'),
        adminApiRequest<CatalogRow>('/catalogs/DEPARTAMENTO'),
        adminApiRequest<CatalogRow>('/catalogs/MUNICIPIO'),
      ]);
      setCatalogs([brandsResult, countriesResult, departmentsResult, citiesResult]);
      const guatemala = countriesResult.items.find((item) => normalizeSearch(item.name) === 'guatemala' || item.code.toUpperCase() === 'GT');
      setForm((current) => ({ ...current, country: guatemala?.id ?? '' }));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los catálogos.') });
    }
  }

  const brands = useMemo(() => catalogItems(catalogs, 'BRANDS'), [catalogs]);
  const countries = useMemo(() => catalogItems(catalogs, 'PAIS'), [catalogs]);
  const departments = useMemo(() => form.country ? catalogItems(catalogs, 'DEPARTAMENTO').filter((item) => item.parentItemId === form.country) : [], [catalogs, form.country]);
  const cities = useMemo(() => form.department ? catalogItems(catalogs, 'MUNICIPIO').filter((item) => item.parentItemId === form.department) : [], [catalogs, form.department]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitCustomer(form, canManageCustomers)) {
      setMessage({ type: 'error', text: 'Completa los campos obligatorios antes de crear el cliente.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const canManageCustomers = Boolean(user?.permissions.includes('customers.view_all') || user?.permissions.includes('customers.manage'));
      const endpoint = canManageCustomers ? '/customers' : '/customers/quick';
      await adminApiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone,
          taxId: form.Nit,
          email: form.email || undefined,
          ...(canManageCustomers ? { password: form.password } : {}),
          address: form.address,
          city: labelFor(cities, form.city),
          department: labelFor(departments, form.department),
          country: labelFor(countries, form.country),
          brand: labelFor(brands, form.brand),
          brandItemId: form.brand || undefined,
          reference: form.reference || undefined,
        }),
      });

      window.location.href = '/clientes';
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear el cliente.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canManageCustomers = Boolean(user?.permissions.includes('customers.view_all') || user?.permissions.includes('customers.manage'));
  const canSubmit = canSubmitCustomer(form, canManageCustomers);

  return (
    <AdminRoutedShell title="Crear cliente">
      <form className="customer-edit-page" onSubmit={createCustomer}>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <section className="panel customer-edit-hero customer-edit-hero-compact">
          <div className="customer-edit-photo-block customer-photo-navigation">
            <a aria-label="Regresar a clientes" className="customer-back-button" href="/clientes">
              <ArrowLeft size={18} />
            </a>
            <div className="customer-avatar-large">
              <User size={38} />
            </div>
          </div>

          <div className="customer-edit-summary">
            <h3>Nuevo cliente</h3>
            <div className="customer-edit-summary-grid customer-edit-summary-grid-compact">
              <SummaryItem label="Nivel inicial" value="Básico" icon={<Star size={16} />} />
              <SummaryItem label="Puntos actuales" value="0 puntos" />
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="panel customer-edit-card">
            <h3><User size={18} /> Información personal</h3>
            <div className="customer-edit-fields two">
              <EditField label="Nombres" required enforceRequired placeholder="Ej. María Fernanda" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
              <EditField label="Apellidos" required enforceRequired placeholder="Ej. López" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
              <EditField label="NIT" required enforceRequired placeholder="Ej. 1234567-8" value={form.Nit} onChange={(value) => setForm({ ...form, Nit: normalizeTaxId(value) })} />
              <CatalogSearchField label="Marca" value={form.brand} options={brands} onChange={(value) => setForm({ ...form, brand: value })} />
              {canManageCustomers ? <EditField label="Contraseña temporal" required enforceRequired minLength={8} type="password" placeholder="Contraseña" value={form.password} onChange={(value) => setForm({ ...form, password: value })} /> : null}
            </div>
          </article>

          <article className="panel customer-edit-card">
            <h3><Phone size={18} /> Información de contacto</h3>
            <div className="customer-edit-fields two">
              <EditField label="Teléfono" required enforceRequired placeholder="Ej. +502 5556 4321" value={form.phone} onChange={(value) => setForm({ ...form, phone: value.replace(/[^\d+ ]/g, '') })} />
              <EditField label="Correo electrónico" required enforceRequired type="email" placeholder="Ej. maria.lopez@email.com" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            </div>
          </article>

          <article className="panel customer-edit-card wide">
            <h3><MapPin size={18} /> Dirección</h3>
            <div className="customer-edit-fields address">
              <EditField label="Dirección" required enforceRequired placeholder="Ej. 12 Avenida 345, Zona 10" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
              <CatalogSearchField label="Departamento" required value={form.department} options={departments} disabled={!form.country} onChange={(value) => setForm({ ...form, department: value, city: '' })} />
              <CatalogSearchField label="Municipio" required value={form.city} options={cities} disabled={!form.department} onChange={(value) => setForm({ ...form, city: value })} />
              <EditField label="Referencia" className="span-2" placeholder="Ej. Edificio Torre Pradera, Apartamento 502" value={form.reference} onChange={(value) => setForm({ ...form, reference: value })} />
            </div>
          </article>
        </section>

        <div className="customer-edit-bottom-actions">
          <a className="admin-secondary" href="/clientes">Cancelar</a>
          <button className="admin-primary" disabled={isSubmitting || !canSubmit} type="submit">
            <Save size={16} />
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </AdminRoutedShell>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="customer-edit-summary-item">
      <span>{label}</span>
      <strong>
        {icon}
        {value}
      </strong>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  enforceRequired = false,
  className,
  placeholder,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  enforceRequired?: boolean;
  className?: string;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label className={className}>
      {label} {required ? <b>*</b> : null}
      <input minLength={minLength} placeholder={placeholder} required={enforceRequired} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
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
  const selectedOption = options.find((option) => option.id === value || option.code === value || option.name === value);
  const filteredOptions = useMemo(() => filterCatalogOptions(options, query), [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.name ?? '');
    }
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
            <div className="catalog-autocomplete-empty">Sin resultados</div>
          )}
        </div>
      ) : null}
    </label>
  );
}

function catalogItems(catalogs: CatalogRow[], code: string) {
  return catalogs.find((catalog) => catalog.code === code)?.items.filter((item) => item.isActive) ?? [];
}

function labelFor(options: CatalogItem[], id: string) {
  return options.find((option) => option.id === id)?.name ?? '';
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

function normalizeTaxId(value: string) {
  return value.toUpperCase().replace(/[^0-9A-Z-]/g, '');
}

function canSubmitCustomer(form: CreateForm, canManageCustomers: boolean) {
  return Boolean(
    form.firstName.trim()
    && form.lastName.trim()
    && form.Nit.trim().length >= 2
    && form.phone.replace(/\D/g, '').length >= 8
    && form.email.trim()
    && form.address.trim()
    && form.country
    && form.department
    && form.city
    && (!canManageCustomers || form.password.length >= 8),
  );
}

const emptyForm: CreateForm = {
  firstName: '',
  lastName: '',
  Nit: '',
  phone: '',
  email: '',
  password: '',
  address: '',
  city: '',
  department: '',
  country: '',
  brand: '',
  reference: '',
};
