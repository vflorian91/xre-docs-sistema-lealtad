'use client';

import { ArrowLeft, Megaphone, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import type { CustomerSegmentLevel, CustomerSegmentStatus, NotificationAudience, NotificationType } from '../NotificacionesPage';

type CustomerRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
};

type RoleRow = {
  id: string;
  name: string;
};

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
};

type NotificationForm = {
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  customerId: string;
  internalUserId: string;
  roleId: string;
  segmentStatus: CustomerSegmentStatus;
  segmentLevel: CustomerSegmentLevel;
  startsAt: string;
  expiresAt: string;
};

function emptyNotificationForm(): NotificationForm {
  return {
    title: '',
    body: '',
    type: 'INFO',
    audience: 'GLOBAL_CUSTOMERS',
    customerId: '',
    internalUserId: '',
    roleId: '',
    segmentStatus: 'ACTIVE',
    segmentLevel: '',
    startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: '',
  };
}

export default function NuevaNotificacionPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [form, setForm] = useState<NotificationForm>(emptyNotificationForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [customersResult, usersResult, rolesResult] = await Promise.all([
        adminApiRequest<CustomerRow[] | { data: CustomerRow[] }>('/customers?limit=200'),
        adminApiRequest<AdminUserRow[]>('/internal-users'),
        adminApiRequest<RoleRow[]>('/internal-users/roles'),
      ]);

      setCustomers(Array.isArray(customersResult) ? customersResult : customersResult.data ?? []);
      setUsers(usersResult);
      setRoles(rolesResult);
    } catch {
      // Los selectores se mantienen vacios si alguna lista auxiliar no carga.
    }
  }

  function requestSendConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsConfirmOpen(true);
  }

  async function sendNotification() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          type: form.type,
          audience: form.audience,
          customerId: form.audience === 'CUSTOMER' ? form.customerId : undefined,
          internalUserId: form.audience === 'INTERNAL_USER' ? form.internalUserId : undefined,
          roleId: form.audience === 'ROLE' ? form.roleId : undefined,
          customerSegment: form.audience === 'CUSTOMER_SEGMENT'
            ? {
                status: form.segmentStatus || undefined,
                level: form.segmentLevel || undefined,
              }
            : undefined,
          startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        }),
      });

      setIsConfirmOpen(false);
      router.push('/notificaciones');
    } catch (error) {
      setIsConfirmOpen(false);
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo enviar la notificacion.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSend = Boolean(
    form.title
    && form.body
    && form.startsAt
    && (form.audience !== 'CUSTOMER' || form.customerId)
    && (form.audience !== 'INTERNAL_USER' || form.internalUserId)
    && (form.audience !== 'ROLE' || form.roleId)
    && (form.audience !== 'CUSTOMER_SEGMENT' || form.segmentStatus || form.segmentLevel),
  );

  return (
    <AdminRoutedShell title="Nueva notificacion">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Nueva notificacion</h2>
          <p>Prepara el mensaje y confirma el envio antes de publicarlo.</p>
        </div>
        <Link className="admin-secondary" href="/notificaciones">
          <ArrowLeft size={16} />
          Volver al registro
        </Link>
      </section>

      <article className="notification-form-card notification-create-panel">
        <div className="settings-card-heading">
          <span className="customer-metric-icon blue"><Megaphone size={24} /></span>
          <div>
            <h2>Datos del envio</h2>
            <p>La notificacion quedara registrada en la tabla historica.</p>
          </div>
        </div>

        <form className="admin-form" onSubmit={requestSendConfirmation}>
          <label>
            Titulo
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nuevo beneficio disponible" />
          </label>
          <label>
            Mensaje
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Texto corto de la notificacion" />
          </label>
          <label>
            Tipo
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as NotificationType })}>
              <option value="INFO">Informativa</option>
              <option value="SUCCESS">Exito</option>
              <option value="WARNING">Advertencia</option>
              <option value="PROMOTION">Promocion</option>
              <option value="SYSTEM">Sistema</option>
            </select>
          </label>
          <label>
            Destinatario
            <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as NotificationAudience })}>
              <option value="GLOBAL_CUSTOMERS">Todos los clientes</option>
              <option value="CUSTOMER_SEGMENT">Clientes segmentados</option>
              <option value="GLOBAL_INTERNAL">Todos los usuarios internos</option>
              <option value="CUSTOMER">Cliente especifico</option>
              <option value="INTERNAL_USER">Usuario interno especifico</option>
              <option value="ROLE">Rol especifico</option>
            </select>
          </label>
          {form.audience === 'CUSTOMER' ? (
            <label>
              Cliente
              <select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
                <option value="">Seleccionar cliente</option>
                {customers.map((customer) => (
                  <option value={customer.id} key={customer.id}>{customer.fullName} - {customer.code}</option>
                ))}
              </select>
            </label>
          ) : null}
          {form.audience === 'CUSTOMER_SEGMENT' ? (
            <>
              <label>
                Estado del cliente
                <select value={form.segmentStatus} onChange={(event) => setForm({ ...form, segmentStatus: event.target.value as CustomerSegmentStatus })}>
                  <option value="">Cualquier estado</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="INACTIVE">Inactivos</option>
                </select>
              </label>
              <label>
                Nivel
                <select value={form.segmentLevel} onChange={(event) => setForm({ ...form, segmentLevel: event.target.value as CustomerSegmentLevel })}>
                  <option value="">Cualquier nivel</option>
                  <option value="Básico">Basico</option>
                  <option value="Bronce">Bronce</option>
                  <option value="Plata">Plata</option>
                  <option value="Oro">Oro</option>
                </select>
              </label>
            </>
          ) : null}
          {form.audience === 'INTERNAL_USER' ? (
            <label>
              Usuario interno
              <select value={form.internalUserId} onChange={(event) => setForm({ ...form, internalUserId: event.target.value })}>
                <option value="">Seleccionar usuario</option>
                {users.map((row) => (
                  <option value={row.id} key={row.id}>{row.fullName} - {row.email}</option>
                ))}
              </select>
            </label>
          ) : null}
          {form.audience === 'ROLE' ? (
            <label>
              Rol
              <select value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })}>
                <option value="">Seleccionar rol</option>
                {roles.map((role) => (
                  <option value={role.id} key={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Inicio
            <input type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          </label>
          <label>
            Vence opcional
            <input type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
          </label>
          <button className="admin-primary" disabled={isSubmitting || !canSend} type="submit">
            <Send size={16} />
            Enviar
          </button>
        </form>
      </article>

      {isConfirmOpen ? (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-confirm-title">
            <h2 id="notification-confirm-title">Confirmar envio</h2>
            <p>¿Seguro de realizar el envio de la notificacion?</p>
            <div>
              <button className="admin-secondary" disabled={isSubmitting} onClick={() => setIsConfirmOpen(false)} type="button">
                Cancelar
              </button>
              <button className="admin-primary" disabled={isSubmitting} onClick={() => void sendNotification()} type="button">
                Enviar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AdminRoutedShell>
  );
}
