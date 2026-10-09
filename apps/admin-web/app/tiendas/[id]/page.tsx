'use client';

import { ArrowLeft, Building2, CalendarDays, MapPinned, Pencil, Store, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatDate, formatNumber } from '../../lib/format';

type StoreStatus = 'ACTIVE' | 'INACTIVE';
type StoreLocationType = 'CAPITAL' | 'DEPARTMENT';

type StoreDetail = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  locationType: StoreLocationType;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
  metrics: {
    usersAssigned: number;
    activeUsersAssigned: number;
    customersRegistered: number;
    purchasesRegistered: number;
  };
  users: Array<{
    user: {
      id: string;
      fullName: string;
      email: string;
      status: string;
    };
  }>;
};

type TiendaDetallePageProps = {
  basePath?: string;
};

export default function TiendaDetallePage({ basePath = '/catalogos/tiendas' }: TiendaDetallePageProps) {
  const params = useParams<{ id: string }>();
  const storeId = params.id;
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStore() {
      setIsLoading(true);
      setMessage(null);

      try {
        const result = await adminApiRequest<StoreDetail>(`/stores/${storeId}`);
        if (isMounted) setStore(result);
      } catch (error) {
        if (isMounted) setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la tienda.') });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (storeId) void loadStore();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  return (
    <AdminRoutedShell title="Perfil de tienda">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <a aria-label="Volver a tiendas" className="customer-back-button" href={basePath}>
            <ArrowLeft size={20} />
          </a>
          <div>
            <h2>Perfil de tienda</h2>
            <p>Consulta información operativa, usuarios asignados y métricas principales.</p>
          </div>
          {store ? (
            <div className="customer-profile-actions">
              <a className="admin-primary" href={`${basePath}/${store.id}/editar`}><Pencil size={16} /> Editar</a>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="panel customer-profile-state">Cargando tienda...</div> : null}

        {store ? (
          <>
            {store.status === 'INACTIVE' && store.metrics.usersAssigned > 0 ? (
              <div className="form-error">Esta tienda se encuentra inactiva y todavía tiene usuarios asignados. Estos usuarios deberán ser reasignados a una tienda activa para continuar operando.</div>
            ) : null}

            <section className="panel customer-profile-hero">
              <div className="customer-profile-avatar"><Store size={76} /></div>
              <div className="customer-profile-main">
                <div className="customer-profile-title">
                  <h3>{store.name}</h3>
                  <span className={store.status === 'ACTIVE' ? 'badge green' : 'badge red'}>{statusLabel(store.status)}</span>
                </div>
                <p>Código <strong>{store.code}</strong></p>
                <div className="customer-profile-contact-grid">
                  <span><Building2 size={18} /> {store.address ?? 'Sin dirección registrada'}</span>
                  <span><MapPinned size={18} /> {locationLabel(store.locationType)}</span>
                  <span><CalendarDays size={18} /> Creada {formatDate(store.createdAt)}</span>
                  <span><CalendarDays size={18} /> Actualizada {formatDate(store.updatedAt)}</span>
                </div>
              </div>
            </section>

            <article className="panel table-panel wide-panel customer-table-panel">
              <div className="panel-header customer-table-header">
                <div><h2><Users size={27} /> Usuarios asignados</h2></div>
                <span className="count-pill">{formatNumber(store.users.length)}</span>
              </div>
              <table className="customer-records-table">
                <thead>
                  <tr>
                    <th>Nombre de usuario</th>
                    <th>Correo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {store.users.map(({ user }) => (
                    <tr key={user.id}>
                      <td><span className="table-main-text">{user.fullName}</span></td>
                      <td>{user.email}</td>
                      <td><span className={user.status === 'ACTIVE' ? 'badge green' : 'badge red'}>{user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></td>
                    </tr>
                  ))}
                  {!store.users.length ? <tr><td colSpan={3}>No hay usuarios asignados a esta tienda.</td></tr> : null}
                </tbody>
              </table>
            </article>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}

function locationLabel(value: StoreLocationType) {
  return value === 'CAPITAL' ? 'Capital' : 'Departamento';
}

function statusLabel(value: StoreStatus) {
  return value === 'ACTIVE' ? 'Activa' : 'Inactiva';
}
