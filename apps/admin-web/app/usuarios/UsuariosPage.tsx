'use client';

import { Download, Eye, Pencil, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, clearAdminSession, getErrorText, getStoredAdminUser, StoredAdminUser } from '../lib/adminApi';
import { exportRowsToXlsx } from '../lib/exportExcel';
import { formatNumber } from '../lib/format';

type StoreRow = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
};

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  mustChangePassword: boolean;
  createdAt?: string;
  roleAssignments: Array<{ role: RoleRow }>;
  storeAssignments: Array<{ store: StoreRow }>;
};

function statusClass(status: AdminUserRow['status']) {
  if (status === 'ACTIVE') return 'badge green';
  if (status === 'BLOCKED') return 'badge amber';
  return 'badge red';
}

function statusLabel(status: AdminUserRow['status']) {
  if (status === 'ACTIVE') return 'Activo';
  if (status === 'BLOCKED') return 'Bloqueado';
  return 'Inactivo';
}

const pageSize = 10;

export default function UsuariosPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminUserRow['status']>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentUser(getStoredAdminUser());
    void loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<AdminUserRow[]>('/internal-users');
      setUsers(result);
    } catch (error) {
      const text = getErrorText(error, 'No se pudieron cargar los usuarios.');
      setMessage({ type: 'error', text });
      if (/sesion|token|unauthorized|expirada/i.test(text)) {
        clearAdminSession();
      }
    } finally {
      setIsLoading(false);
    }
  }

  const canCreateUser = Boolean(currentUser?.permissions.includes('users.create') || currentUser?.permissions.includes('users.manage'));
  const canViewUserProfile = Boolean(currentUser?.permissions.includes('users.view_profile') || currentUser?.permissions.includes('users.manage'));
  const canEditUser = Boolean(currentUser?.permissions.includes('users.edit') || currentUser?.permissions.includes('users.manage'));

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search
      || user.fullName.toLowerCase().includes(search)
      || user.email.toLowerCase().includes(search)
      || user.roleAssignments.some((a) => a.role.name.toLowerCase().includes(search))
      || user.storeAssignments.some((a) => a.store.name.toLowerCase().includes(search));
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function setFilter(update: () => void) {
    update();
    setCurrentPage(1);
  }

  async function exportUsers() {
    const rows = [
      ['Usuario', 'Correo', 'Rol', 'Estado'],
      ...filteredUsers.map((user) => [
        user.fullName,
        user.email,
        user.roleAssignments.map((a) => a.role.name).join(', ') || '-',
        statusLabel(user.status),
      ]),
    ];
    await exportRowsToXlsx(`usuarios-internos-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Usuarios', rows);
  }

  return (
    <AdminRoutedShell title="Usuarios">
      <section className="customer-dashboard-toolbar">
        {canCreateUser ? <a className="admin-primary" href="/usuarios/nuevo">Nuevo usuario</a> : null}
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2>Tabla de usuarios</h2></div>
          <span className="count-pill">{formatNumber(filteredUsers.length)}</span>
        </div>

        <div className="customer-table-toolbar">
          <label className="customer-search">
            <Search size={18} />
            <input value={searchTerm} onChange={(event) => setFilter(() => setSearchTerm(event.target.value))} placeholder="Buscar usuario, correo o rol..." />
          </label>
          <select value={statusFilter} onChange={(event) => setFilter(() => setStatusFilter(event.target.value as typeof statusFilter))}>
            <option value="ALL">Estado: Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>
          <button className="admin-secondary customer-export-button" onClick={exportUsers} type="button">
            <Download size={16} />
            Exportar
          </button>
        </div>

        <table className="customer-records-table users-records-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="table-main-cell">
                    <strong>{user.fullName}</strong>
                  </div>
                </td>
                <td><span className="table-email-cell">{user.email}</span></td>
                <td><span className="table-wrap-cell">{user.roleAssignments.map((a) => a.role.name).join(', ') || '-'}</span></td>
                <td><span className={statusClass(user.status)}>{statusLabel(user.status)}</span></td>
                <td>
                  <div className="customer-actions">
                    {canViewUserProfile ? <a aria-label={`Ver usuario ${user.fullName}`} className="customer-icon-action" href={`/usuarios/${user.id}`}><Eye size={16} /></a> : null}
                    {canEditUser ? <a aria-label={`Editar usuario ${user.fullName}`} className="customer-icon-action" href={`/usuarios/${user.id}/editar`}><Pencil size={16} /></a> : null}
                    {!canViewUserProfile && !canEditUser ? <span className="table-subtitle">Solo listado</span> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && visibleUsers.length === 0 ? <tr><td colSpan={5}>No hay usuarios con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={5}>Cargando usuarios...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(currentPage)} de {formatNumber(totalPages)} · {formatNumber(filteredUsers.length)} usuarios</span>
          <div className="customer-pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} type="button">‹</button>
            {pageWindow(currentPage, totalPages).map((p) => (
              <button className={p === currentPage ? 'active' : ''} key={p} onClick={() => setCurrentPage(p)} type="button">{p}</button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
