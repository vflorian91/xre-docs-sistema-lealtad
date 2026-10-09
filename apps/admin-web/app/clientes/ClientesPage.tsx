'use client';

import { Eye, Pencil, Search, UserCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, clearAdminSession, getErrorText, getStoredAdminUser, StoredAdminUser } from '../lib/adminApi';
import { formatNumber } from '../lib/format';

type StoreOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type CustomerRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  taxId?: string | null;
  email?: string | null;
  status: string;
  loyaltyLevel?: string;
  purchasesCount?: number;
  registrationSource: string;
  registrationStore?: StoreOption | null;
};

type CustomersResponse = {
  data: CustomerRow[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CustomerFilters = {
  code: string;
  name: string;
  taxId: string;
  email: string;
  status: string;
  level: string;
};

const pageSize = 10;
const emptyFilters: CustomerFilters = { code: '', name: '', taxId: '', email: '', status: '', level: '' };

export default function ClientesPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [meta, setMeta] = useState<CustomersResponse['meta']>({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);

  const queryString = useMemo(() => {
    const query = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize),
    });

    if (appliedFilters.code.trim()) query.set('code', appliedFilters.code.trim());
    if (appliedFilters.name.trim()) query.set('name', appliedFilters.name.trim());
    if (appliedFilters.taxId.trim()) query.set('taxId', appliedFilters.taxId.trim());
    if (appliedFilters.email.trim()) query.set('email', appliedFilters.email.trim());
    if (appliedFilters.status) query.set('status', appliedFilters.status);
    if (appliedFilters.level) query.set('level', appliedFilters.level);

    return query.toString();
  }, [appliedFilters, currentPage]);

  useEffect(() => {
    setUser(getStoredAdminUser());
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [queryString]);

  async function loadCustomers() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<CustomersResponse>(`/customers?${queryString}`);
      setCustomers(result.data);
      setMeta(result.meta);
    } catch (error) {
      const text = getErrorText(error, 'No fue posible cargar los clientes. Intente nuevamente.');
      setMessage({ type: 'error', text });
      if (/sesion|token|unauthorized|expirada/i.test(text)) {
        clearAdminSession();
      }
    } finally {
      setIsLoading(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  }

  const canCreateCustomer = Boolean(user?.permissions.includes('customers.create'));
  const canViewAllCustomers = Boolean(user?.permissions.includes('customers.view_all') || user?.permissions.includes('customers.manage'));
  const canViewCustomerProfile = Boolean(user?.permissions.includes('customers.view_profile') || user?.permissions.includes('customers.manage'));
  const canEditCustomer = Boolean(user?.permissions.includes('customers.edit') || user?.permissions.includes('customers.manage'));

  return (
    <AdminRoutedShell title="Clientes">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><UserCheck size={24} /> Tabla de clientes</h2></div>
          {canCreateCustomer ? <a className="admin-primary customer-action-button" href="/clientes/nuevo">Nuevo cliente</a> : null}
        </div>

        <form className="customer-table-toolbar customer-filter-form" onSubmit={submitFilters}>
          <label className="customer-filter-field">
            <span>Código de cliente</span>
            <input value={filters.code} onChange={(event) => setFilters({ ...filters, code: event.target.value })} placeholder="Ej. CLI-001" />
          </label>
          <label className="customer-filter-field">
            <span>Nombre del cliente</span>
            <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} placeholder="Nombre" />
          </label>
          <label className="customer-filter-field">
            <span>NIT del cliente</span>
            <input value={filters.taxId} onChange={(event) => setFilters({ ...filters, taxId: event.target.value })} placeholder="NIT" />
          </label>
          <label className="customer-filter-field">
            <span>Correo</span>
            <input type="email" value={filters.email} onChange={(event) => setFilters({ ...filters, email: event.target.value })} placeholder="correo@ejemplo.com" />
          </label>
          <label className="customer-filter-field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos</option>
              <option value="ACTIVE">Activo</option>
              {canViewAllCustomers ? <option value="INACTIVE">Inactivo</option> : null}
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Nivel</span>
            <select value={filters.level} onChange={(event) => setFilters({ ...filters, level: event.target.value })}>
              <option value="">Todos</option>
              <option value="Básico">Básico</option>
              <option value="Bronce">Bronce</option>
              <option value="Plata">Plata</option>
              <option value="Oro">Oro</option>
            </select>
          </label>
          <button className="admin-primary customer-filter-submit customer-action-button" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        <table className="customer-records-table">
          <thead>
            <tr>
              <th>Código del cliente</th>
              <th>Nombre del cliente</th>
              <th>NIT</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Nivel</th>
              <th>Origen</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td><span className="store-code-pill">{customer.code}</span></td>
                <td><span className="table-main-text">{customer.fullName}</span></td>
                <td>{customer.taxId ?? '-'}</td>
                <td>{customer.phone}</td>
                <td>{customer.email ?? '-'}</td>
                <td><span className={customer.status === 'ACTIVE' ? 'badge green' : 'badge red'}>{statusLabel(customer.status)}</span></td>
                <td>{customer.loyaltyLevel ?? 'Básico'}</td>
                <td>{originLabel(customer)}</td>
                <td>
                  <div className="customer-actions">
                    {canViewCustomerProfile ? <a aria-label={`Ver ${customer.fullName}`} className="customer-icon-action" href={`/clientes/${customer.id}`}><Eye size={16} /></a> : null}
                    {canEditCustomer ? <a aria-label={`Editar ${customer.fullName}`} className="customer-icon-action" href={`/clientes/${customer.id}/editar`}><Pencil size={16} /></a> : null}
                    {!canViewCustomerProfile && !canEditCustomer ? <span className="table-subtitle">Solo registro</span> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && customers.length === 0 ? <tr><td colSpan={9}>Sin clientes para mostrar con los filtros seleccionados.</td></tr> : null}
            {isLoading ? <tr><td colSpan={9}>Cargando clientes...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} clientes</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">‹</button>
            {pageWindow(meta.page, meta.totalPages).map((page) => (
              <button className={page === meta.page ? 'active' : ''} key={page} onClick={() => setCurrentPage(page)} type="button">{page}</button>
            ))}
            <button disabled={meta.page === meta.totalPages} onClick={() => setCurrentPage((page) => Math.min(meta.totalPages, page + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function originLabel(customer: CustomerRow) {
  if (customer.registrationStore?.name) return customer.registrationStore.name;
  if (customer.registrationSource === 'STORE') return 'PWA Tienda';
  if (customer.registrationSource === 'CLIENT_PWA') return 'PWA Cliente';
  if (customer.registrationSource === 'ADMIN') return 'Administración';
  if (customer.registrationSource === 'SOCIAL_MEDIA') return 'Redes sociales';

  return customer.registrationSource;
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Activo';
  if (status === 'INACTIVE') return 'Inactivo';
  return status;
}
