'use client';

import { ArrowLeft, Copy, LockKeyhole, MapPin, Phone, Save, Star, User } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';
import { formatNumber } from '../../../lib/format';

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

type CustomerProfile = {
  customer: {
    id: string;
    code: string;
    fullName: string;
    taxId?: string | null;
    phone: string;
    email?: string | null;
    mustChangePassword?: boolean;
    address?: string | null;
    zone?: string | null;
    city?: string | null;
    department?: string | null;
    country?: string | null;
    brand?: string | null;
    brandItemId?: string | null;
    reference?: string | null;
    availablePoints?: number;
    loyaltyLevel?: string | null;
    status: string;
  };
};

type EditForm = {
  firstName: string;
  lastName: string;
  taxId: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  city: string;
  department: string;
  country: string;
  brand: string;
  reference: string;
  status: string;
};

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCustomer() {
      setIsLoading(true);
      setMessage(null);

      try {
        const [loadedProfile, brandsResult, countriesResult, departmentsResult, citiesResult] = await Promise.all([
          adminApiRequest<CustomerProfile>(`/customers/${customerId}/profile`),
          adminApiRequest<CatalogRow>('/catalogs/BRANDS?includeInactive=true'),
          adminApiRequest<CatalogRow>('/catalogs/PAIS?includeInactive=true'),
          adminApiRequest<CatalogRow>('/catalogs/DEPARTAMENTO?includeInactive=true'),
          adminApiRequest<CatalogRow>('/catalogs/MUNICIPIO?includeInactive=true'),
        ]);

        if (isMounted) {
          setProfile(loadedProfile);
          setCatalogs([brandsResult, countriesResult, departmentsResult, citiesResult]);
          const guatemala = countriesResult.items.find((item) => normalizeSearch(item.name) === 'guatemala' || item.code.toUpperCase() === 'GT');
          setForm({
            ...formFromCustomer(loadedProfile.customer),
            country: guatemala?.id ?? 'Guatemala',
            brand: optionIdFor(brandsResult.items, loadedProfile.customer.brandItemId ?? loadedProfile.customer.brand ?? ''),
          });
        }
      } catch (error) {
        if (isMounted) {
          setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el cliente.') });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (customerId) {
      void loadCustomer();
    }

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  const brands = useMemo(() => catalogItems(catalogs, 'BRANDS'), [catalogs]);
  const countries = useMemo(() => catalogItems(catalogs, 'PAIS'), [catalogs]);
  const selectedCountryId = useMemo(() => optionIdFor(countries, form.country), [countries, form.country]);
  const departments = useMemo(() => selectedCountryId ? catalogItems(catalogs, 'DEPARTAMENTO').filter((item) => item.parentItemId === selectedCountryId || item.id === form.department || item.name === form.department) : [], [catalogs, form.department, selectedCountryId]);
  const selectedDepartmentId = useMemo(() => optionIdFor(departments, form.department), [departments, form.department]);
  const cities = useMemo(() => selectedDepartmentId ? catalogItems(catalogs, 'MUNICIPIO').filter((item) => item.parentItemId === selectedDepartmentId || item.id === form.city || item.name === form.city) : [], [catalogs, form.city, selectedDepartmentId]);
  async function updateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone,
          taxId: form.taxId,
          email: form.email || null,
          address: form.address,
          zone: null,
          city: optionOrRaw(cities, form.city),
          department: optionOrRaw(departments, form.department),
          country: optionOrRaw(countries, form.country),
          brand: optionOrRaw(brands, form.brand),
          brandItemId: form.brand || null,
          reference: form.reference || null,
          ...(form.password ? { password: form.password, mustChangePassword: true } : {}),
          status: form.status,
        }),
      });

      window.location.href = '/clientes';
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo guardar el cliente.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyCustomerCode(code: string) {
    await window.navigator.clipboard.writeText(code);
    setMessage({ type: 'success', text: 'Código de cliente copiado al portapapeles.' });
  }

  const customer = profile?.customer;

  return (
    <AdminRoutedShell title="Editar cliente">
      <form className="customer-edit-page" onSubmit={updateCustomer}>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="panel customer-profile-state">Cargando cliente...</div> : null}

        {customer ? (
          <>
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
                <h3>{customer.fullName}</h3>
                <div className="customer-edit-code-row">
                  <span>Código de cliente</span>
                  <strong className="customer-code-inline">
                    {customer.code}
                    <button aria-label="Copiar código de cliente" onClick={() => void copyCustomerCode(customer.code)} type="button"><Copy size={15} /></button>
                  </strong>
                </div>
                <div className="customer-edit-summary-grid customer-edit-summary-grid-compact">
                  <label className="customer-edit-summary-item customer-edit-status-toggle">
                    <input checked={form.status === 'INACTIVE'} onChange={(event) => setForm({ ...form, status: event.target.checked ? 'INACTIVE' : 'ACTIVE' })} type="checkbox" />
                    <strong>Inactivo</strong>
                  </label>
                  <SummaryItem label="Nivel" value={customer.loyaltyLevel ?? 'Básico'} icon={<Star size={16} />} />
                  <SummaryItem label="Puntos actuales" value={`${formatNumber(customer.availablePoints ?? 0)} puntos`} />
                  <SummaryItem label="Contraseña" value={customer.mustChangePassword ? 'Cambio pendiente' : 'Actualizada'} icon={<LockKeyhole size={16} />} />
                </div>
              </div>
            </section>

            <section className="customer-edit-sections">
              <article className="panel customer-edit-card">
                <h3><User size={18} /> Información personal</h3>
                <div className="customer-edit-fields two">
                  <EditField label="Nombres" required enforceRequired value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
                  <EditField label="Apellidos" required enforceRequired value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
                  <EditField label="NIT" required enforceRequired value={form.taxId} onChange={(value) => setForm({ ...form, taxId: value.toUpperCase().replace(/[^0-9A-Z-]/g, '') })} />
                  <CatalogSearchField label="Marca" value={form.brand} options={brands} onChange={(value) => setForm({ ...form, brand: value })} />
                  <EditField label="Nueva contraseña temporal" minLength={8} placeholder="Contraseña" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
                </div>
              </article>

              <article className="panel customer-edit-card">
                <h3><Phone size={18} /> Información de contacto</h3>
                <div className="customer-edit-fields two">
                  <EditField label="Teléfono" required enforceRequired value={form.phone} onChange={(value) => setForm({ ...form, phone: value.replace(/[^\d+ ]/g, '') })} />
                  <EditField label="Correo electrónico" required enforceRequired type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                </div>
              </article>

              <article className="panel customer-edit-card wide">
                <h3><MapPin size={18} /> Dirección</h3>
                <div className="customer-edit-fields address">
                  <EditField label="Dirección" required enforceRequired value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
                  <CatalogSearchField label="Departamento" required value={form.department} options={departments} disabled={!selectedCountryId} onChange={(value) => setForm({ ...form, department: value, city: '' })} />
                  <CatalogSearchField label="Municipio" required value={form.city} options={cities} disabled={!selectedDepartmentId} onChange={(value) => setForm({ ...form, city: value })} />
                  <EditField label="Referencia" className="span-2" value={form.reference} onChange={(value) => setForm({ ...form, reference: value })} />
                </div>
              </article>
            </section>
          </>
        ) : null}

        <div className="customer-edit-bottom-actions">
          <a className="admin-secondary" href="/clientes">Cancelar</a>
          <button className="admin-primary" disabled={isSubmitting || isLoading} type="submit">
            <Save size={16} />
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
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

function optionOrRaw(options: CatalogItem[], value: string) {
  return options.find((option) => option.id === value)?.name ?? (value || null);
}

function optionIdFor(options: CatalogItem[], value: string) {
  return options.find((option) => option.id === value || option.name === value || option.code === value)?.id ?? '';
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

function formFromCustomer(customer: CustomerProfile['customer']): EditForm {
  const parts = customer.fullName.trim().split(/\s+/);
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : customer.fullName;
  const lastName = parts.length > 1 ? parts.at(-1) ?? '' : '';

  return {
    ...emptyForm,
    firstName,
    lastName,
    taxId: customer.taxId ?? '',
    phone: customer.phone,
    email: customer.email ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    department: customer.department ?? '',
    country: customer.country ?? '',
    brand: customer.brand ?? '',
    reference: customer.reference ?? '',
    status: customer.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

const emptyForm: EditForm = {
  firstName: '',
  lastName: '',
  taxId: '',
  phone: '',
  email: '',
  password: '',
  address: '',
  city: '',
  department: '',
  country: '',
  brand: '',
  reference: '',
  status: 'ACTIVE',
};
