'use client';

import { Eye, Pencil, Search, UserCircle } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { hasPermission } from '../../lib/permissions';

type DriverRow = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  code?: string | null;
  type: string;
  isActive: boolean;
  accessStatus?: string;
  assignedOrdersCount: number;
};

type Filters = { search: string; phone: string; status: '' | 'true' | 'false' };

const initialFilters: Filters = { search: '', phone: '', status: '' };

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.phone.trim()) params.set('phone', filters.phone.trim());
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

export default function MensajerosPage() {
  const permissions = getStoredAdminUser()?.permissions;
  const canCreate = hasPermission(permissions, 'store_drivers.create');
  const canEdit = hasPermission(permissions, 'store_drivers.edit');
  const canStatus = hasPermission(permissions, 'store_drivers.status');
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadDrivers(appliedFilters);
  }, [appliedFilters]);

  async function loadDrivers(nextFilters: Filters) {
    setIsLoading(true);
    setMessage(null);
    try {
      const query = buildQuery(nextFilters);
      const result = await adminApiRequest<DriverRow[]>(`/admin/store/drivers${query ? `?${query}` : ''}`);
      setDrivers(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los mensajeros.') });
    } finally {
      setIsLoading(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  async function toggleStatus(driver: DriverRow) {
    try {
      await adminApiRequest(`/admin/store/drivers/${driver.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !driver.isActive }),
      });
      await loadDrivers(appliedFilters);
      setMessage({ type: 'success', text: driver.isActive ? 'Mensajero inactivado.' : 'Mensajero activado.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cambiar el estado del mensajero.') });
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><UserCircle size={24} /> Mensajeros</h2></div>
          {canCreate ? <a className="admin-primary customer-action-button" href="/tienda-online/mensajeros/nuevo">Nuevo mensajero</a> : null}
        </div>

        <form className="customer-table-toolbar" onSubmit={submitFilters}>
          <label className="customer-filter-field"><span>Nombre o codigo</span><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar mensajero" /></label>
          <label className="customer-filter-field"><span>Telefono</span><input value={filters.phone} onChange={(event) => setFilters({ ...filters, phone: event.target.value.replace(/\D/g, '').slice(0, 8) })} placeholder="8 digitos" /></label>
          <label className="customer-filter-field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters['status'] })}>
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </label>
          <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit"><Search size={16} /> Buscar</button>
        </form>

        <table className="customer-records-table">
          <thead>
            <tr>
              <th>Mensajero</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Codigo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acceso PWA</th>
              <th>Asignaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td><span className="table-main-text">{driver.fullName}</span></td>
                <td>{driver.phone}</td>
                <td>{driver.email ?? '-'}</td>
                <td>{driver.code ?? '-'}</td>
                <td>{driver.type}</td>
                <td><span className={driver.isActive ? 'badge green' : 'badge red'}>{driver.isActive ? 'Activo' : 'Inactivo'}</span></td>
                <td><span className={driver.accessStatus === 'ACTIVO' ? 'badge green' : driver.accessStatus === 'BLOQUEADO' || driver.accessStatus === 'INACTIVO' ? 'badge red' : 'badge amber'}>{driver.accessStatus?.replaceAll('_', ' ') ?? 'Pendiente'}</span></td>
                <td>{driver.assignedOrdersCount}</td>
                <td>
                  <div className="customer-actions">
                    <a aria-label={`Ver mensajero ${driver.fullName}`} className="customer-icon-action" href={`/tienda-online/mensajeros/${driver.id}`}><Eye size={16} /></a>
                    {canEdit ? <a aria-label={`Editar mensajero ${driver.fullName}`} className="customer-icon-action" href={`/tienda-online/mensajeros/${driver.id}/editar`}><Pencil size={16} /></a> : null}
                    {canStatus ? <button className="customer-action-link" onClick={() => void toggleStatus(driver)} type="button">{driver.isActive ? 'Inactivar' : 'Activar'}</button> : null}
                  </div>
                </td>
              </tr>
            ))}
            {isLoading ? <tr><td colSpan={9}>Cargando mensajeros...</td></tr> : null}
            {!isLoading && drivers.length === 0 ? <tr><td colSpan={9}>No hay mensajeros con esos filtros.</td></tr> : null}
          </tbody>
        </table>
      </article>
    </AdminRoutedShell>
  );
}
