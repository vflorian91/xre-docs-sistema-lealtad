'use client';

import { Eye, Pencil, Plus, Power, RefreshCw, RotateCcw, Save, Search, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { ConfirmModal, ConfirmModalState } from '../../components/ConfirmModal';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatDate, formatNumber } from '../../lib/format';

type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  roleAssignments: Array<{ role: { id: string } }>;
};

type RoleForm = {
  name: string;
  description: string;
};

type Mode = 'create' | 'view' | 'edit';

const emptyForm: RoleForm = {
  name: '',
  description: '',
};

export default function CatalogoRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [mode, setMode] = useState<Mode>('create');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmModalState | null>(null);

  useEffect(() => {
    void loadRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const normalizedQuery = normalize(query);

    return roles.filter((role) => {
      const matchesSearch = !normalizedQuery || normalize(`${role.name} ${role.description ?? ''}`).includes(normalizedQuery);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE') === role.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [query, roles, statusFilter]);

  async function loadRoles() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [rolesResult, usersResult] = await Promise.all([
        adminApiRequest<RoleRow[]>('/internal-users/roles?includeInactive=true'),
        adminApiRequest<UserRow[]>('/internal-users'),
      ]);
      setRoles(rolesResult);
      setUsers(usersResult);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los roles.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'view') return;

    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
    };

    try {
      if (mode === 'edit' && selectedRole) {
        await adminApiRequest(`/internal-users/roles/${selectedRole.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setMessage({ type: 'success', text: 'Rol actualizado correctamente.' });
      } else {
        await adminApiRequest('/internal-users/roles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage({ type: 'success', text: 'Rol creado correctamente.' });
      }
      resetForm();
      await loadRoles();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo guardar el rol.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleRole(role: RoleRow) {
    const action = role.isActive ? 'inactivar' : 'reactivar';
    const assignedUsers = usersWithRole(role.id);
    const suffix = assignedUsers > 0 ? ` Este rol esta asignado a ${assignedUsers} usuario(s).` : '';

    setConfirmState({
      title: `¿Deseas ${action} este rol?`,
      description: `Esta accion cambiara el estado del rol.${suffix}`,
      confirmLabel: action === 'inactivar' ? 'Inactivar' : 'Reactivar',
      onConfirm: () => void applyToggleRole(role),
    });
  }

  async function applyToggleRole(role: RoleRow) {
    setConfirmState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/internal-users/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !role.isActive }),
      });
      setMessage({ type: 'success', text: role.isActive ? 'Rol inactivado correctamente.' : 'Rol reactivado correctamente.' });
      await loadRoles();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cambiar el estado del rol.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function usersWithRole(roleId: string) {
    return users.filter((user) => user.roleAssignments.some((assignment) => assignment.role.id === roleId)).length;
  }

  function viewRole(role: RoleRow) {
    setSelectedRole(role);
    setForm({ name: role.name, description: role.description ?? '' });
    setMode('view');
  }

  function editRole(role: RoleRow) {
    setSelectedRole(role);
    setForm({ name: role.name, description: role.description ?? '' });
    setMode('edit');
  }

  function resetForm() {
    setSelectedRole(null);
    setForm(emptyForm);
    setMode('create');
  }

  const readOnly = mode === 'view';
  const formTitle = mode === 'view' ? 'Detalle del rol' : mode === 'edit' ? 'Editar rol' : 'Agregar rol';

  return (
    <AdminRoutedShell title="Catalogos / Roles">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Roles</h2>
          <p>Administra el catalogo que alimenta los campos de rol en usuarios y notificaciones.</p>
        </div>
        <div className="catalog-title-actions">
          <button className="admin-secondary" disabled={isLoading} onClick={() => void loadRoles()} type="button">
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button className="admin-primary" onClick={resetForm} type="button">
            <Plus size={16} />
            Agregar rol
          </button>
        </div>
      </section>

      <section className="catalogs-workspace catalog-single-workspace">
        <article className="customer-table-panel catalogs-table-panel">
          <div className="panel-header customer-table-header">
            <div>
              <h2>Tabla de roles</h2>
              <p className="muted-copy">Los permisos no se administran aqui; se asignan en el perfil de usuario.</p>
            </div>
            <span className="count-pill">{formatNumber(filteredRoles.length)}</span>
          </div>

          <div className="customer-table-toolbar">
            <label className="customer-search">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por rol..." />
              <Search size={17} />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Estado: Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>

          <table className="customer-records-table catalog-items-table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Descripcion</th>
                <th>Usuarios</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr key={role.id}>
                  <td><div className="table-main-cell"><strong>{role.name}</strong><span>{role.isSystem ? 'Rol base' : 'Rol personalizado'}</span></div></td>
                  <td>{role.description || '-'}</td>
                  <td>{formatNumber(usersWithRole(role.id))}</td>
                  <td><span className={role.isActive ? 'badge green' : 'badge red'}>{role.isActive ? 'Activo' : 'Inactivo'}</span></td>
                  <td>{formatDate(role.updatedAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="customer-icon-action" onClick={() => viewRole(role)} type="button" aria-label={`Ver ${role.name}`}>
                        <Eye size={16} />
                      </button>
                      <button className="customer-icon-action" onClick={() => editRole(role)} type="button" aria-label={`Editar ${role.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button className="customer-icon-action" disabled={isSubmitting} onClick={() => void toggleRole(role)} type="button" aria-label={`${role.isActive ? 'Inactivar' : 'Reactivar'} ${role.name}`}>
                        {role.isActive ? <Power size={16} /> : <XCircle size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredRoles.length === 0 ? <tr><td colSpan={6}>No hay roles para mostrar.</td></tr> : null}
              {isLoading ? <tr><td colSpan={6}>Cargando roles...</td></tr> : null}
            </tbody>
          </table>
        </article>

        <aside className="catalog-detail-panel">
          <div className="catalog-detail-header">
            <div>
              <h2>{formTitle}</h2>
              <p>{mode === 'create' ? 'Crea un rol para asignarlo a usuarios.' : selectedRole?.name}</p>
            </div>
          </div>

          <form className="catalog-item-form catalog-edit-form" onSubmit={(event) => void saveRole(event)}>
            <label>
              Rol
              <input disabled={readOnly} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del rol" />
            </label>
            <label>
              Descripcion
              <input disabled={readOnly} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Uso interno del rol" />
            </label>
            {selectedRole ? (
              <div className="catalog-readonly-meta">
                <span>Estado: {selectedRole.isActive ? 'Activo' : 'Inactivo'}</span>
                <span>Usuarios asignados: {formatNumber(usersWithRole(selectedRole.id))}</span>
                <span>Creado: {formatDate(selectedRole.createdAt)}</span>
                <span>Actualizado: {formatDate(selectedRole.updatedAt)}</span>
              </div>
            ) : null}
            <div className="form-actions">
              {mode === 'view' && selectedRole ? (
                <button className="admin-primary" onClick={() => editRole(selectedRole)} type="button">
                  <Pencil size={16} />
                  Editar
                </button>
              ) : (
                <button className="admin-primary" disabled={isSubmitting || readOnly || !form.name.trim()} type="submit">
                  <Save size={16} />
                  {mode === 'edit' ? 'Guardar cambios' : 'Crear rol'}
                </button>
              )}
              <button className="admin-secondary" onClick={resetForm} type="button">
                <RotateCcw size={16} />
                Nuevo
              </button>
            </div>
          </form>
        </aside>
      </section>
      {confirmState ? (
        <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} isSubmitting={isSubmitting} />
      ) : null}
    </AdminRoutedShell>
  );
}

function normalize(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
