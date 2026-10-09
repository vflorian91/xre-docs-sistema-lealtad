'use client';

import { ArrowLeft, Bike, Save, UserCircle } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { hasPermission } from '../../lib/permissions';

type Driver = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  code?: string | null;
  type: string;
  isActive: boolean;
  accessStatus?: string;
  mustChangePassword?: boolean;
  notes?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
};

type DriverForm = {
  fullName: string;
  phone: string;
  email: string;
  code: string;
  type: string;
  notes: string;
  vehiclePlate: string;
  vehicleType: string;
  vehicleBrand: string;
  vehicleModel: string;
  accessEmail: string;
  temporaryPassword: string;
  accessStatus: string;
};

function emptyForm(): DriverForm {
  return { fullName: '', phone: '', email: '', code: '', type: 'INTERNO', notes: '', vehiclePlate: '', vehicleType: '', vehicleBrand: '', vehicleModel: '', accessEmail: '', temporaryPassword: '', accessStatus: 'PENDIENTE_PRIMER_INGRESO' };
}

function formFromDriver(driver: Driver): DriverForm {
  return {
    fullName: driver.fullName,
    phone: driver.phone,
    email: driver.email ?? '',
    code: driver.code ?? '',
    type: driver.type,
    notes: driver.notes ?? '',
    vehiclePlate: driver.vehiclePlate ?? '',
    vehicleType: driver.vehicleType ?? '',
    vehicleBrand: driver.vehicleBrand ?? '',
    vehicleModel: driver.vehicleModel ?? '',
    accessEmail: driver.email ?? '',
    temporaryPassword: '',
    accessStatus: driver.accessStatus ?? 'PENDIENTE_PRIMER_INGRESO',
  };
}

export default function DriverFormPage({ mode, driverId }: { mode: 'create' | 'edit'; driverId?: string }) {
  const editing = mode === 'edit';
  const permissions = getStoredAdminUser()?.permissions;
  const canSave = hasPermission(permissions, editing ? 'store_drivers.edit' : 'store_drivers.create');
  const canManageAccess = hasPermission(permissions, 'store_drivers.access');
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(editing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!editing || !driverId) return;
    setIsLoading(true);
    adminApiRequest<Driver>(`/admin/store/drivers/${driverId}`)
      .then((driver) => setForm(formFromDriver(driver)))
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el mensajero.') }))
      .finally(() => setIsLoading(false));
  }, [editing, driverId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (!form.fullName.trim() || form.phone.length !== 8) {
      setMessage({ type: 'error', text: 'Completa nombre y telefono de 8 digitos.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone,
      email: form.email.trim() || null,
      code: form.code.trim() || null,
      type: form.type.trim() || 'INTERNO',
      notes: form.notes.trim() || null,
      vehiclePlate: form.vehiclePlate.trim() || null,
      vehicleType: form.vehicleType.trim() || null,
      vehicleBrand: form.vehicleBrand.trim() || null,
      vehicleModel: form.vehicleModel.trim() || null,
    };

    try {
      if (editing && driverId) {
        await adminApiRequest(`/admin/store/drivers/${driverId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        if (canManageAccess && form.accessEmail.trim() && form.temporaryPassword.trim()) {
          await adminApiRequest(`/admin/store/drivers/${driverId}/access`, {
            method: 'POST',
            body: JSON.stringify({ email: form.accessEmail.trim(), temporaryPassword: form.temporaryPassword }),
          });
        }
        if (canManageAccess && form.accessStatus) {
          await adminApiRequest(`/admin/store/drivers/${driverId}/access/status`, {
            method: 'PATCH',
            body: JSON.stringify({ accessStatus: form.accessStatus }),
          });
        }
        setMessage({ type: 'success', text: 'Mensajero actualizado correctamente.' });
      } else {
        const created = await adminApiRequest<Driver>('/admin/store/drivers', { method: 'POST', body: JSON.stringify({ ...payload, isActive: true }) });
        if (canManageAccess && form.accessEmail.trim() && form.temporaryPassword.trim()) {
          await adminApiRequest(`/admin/store/drivers/${created.id}/access`, {
            method: 'POST',
            body: JSON.stringify({ email: form.accessEmail.trim(), temporaryPassword: form.temporaryPassword }),
          });
        }
        window.location.href = '/tienda-online/mensajeros';
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, editing ? 'No se pudo actualizar el mensajero.' : 'No se pudo crear el mensajero.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <div className="brand-form-page">
        <header className="brand-form-heading">
          <div>
            <h1>{editing ? 'Editar mensajero' : 'Nuevo mensajero'}</h1>
            <p>Registra datos operativos del mensajero para asignacion de entregas.</p>
          </div>
          <a className="brand-back-button" href="/tienda-online/mensajeros"><ArrowLeft size={17} />Volver a tabla</a>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="brand-form-loading">Cargando mensajero...</div> : (
          <form className="brand-form" onSubmit={submit}>
            <section className="brand-form-card">
              <header className="brand-card-title"><span><UserCircle size={18} /></span><div><h2>Datos del mensajero</h2><p>Nombre, contacto y notas operativas.</p></div></header>
              <div className="brand-general-grid">
                <label className="form-field-name"><span className="field-line">Nombre <b>*</b></span><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nombre completo" /></label>
                <label className="form-field-code"><span className="field-line">Telefono <b>*</b></span><input required inputMode="numeric" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 8) })} placeholder="8 digitos" /></label>
                <label className="form-field-brand"><span className="field-line">Email operativo</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="correo@dominio.com" /></label>
                <label className="form-field-brand"><span className="field-line">Codigo</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="MENSAJERO_01" /></label>
                <label className="form-field-brand"><span className="field-line">Tipo</span><input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value.toUpperCase() })} placeholder="INTERNO" /></label>
                <label className="reward-description-field"><span className="field-line">Notas</span><span className="brand-textarea-wrap"><textarea maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notas operativas del mensajero" /><small>{form.notes.length} / 500</small></span></label>
              </div>
            </section>
            <section className="brand-form-card">
              <header className="brand-card-title"><span><Bike size={18} /></span><div><h2>Vehículo asignado</h2><p>Vehículo que la empresa asigna al mensajero.</p></div></header>
              <div className="brand-general-grid">
                <label className="form-field-brand"><span className="field-line">Número de placa</span><input value={form.vehiclePlate} onChange={(event) => setForm({ ...form, vehiclePlate: event.target.value.toUpperCase() })} placeholder="P-123ABC" /></label>
                <label className="form-field-brand"><span className="field-line">Tipo</span><input value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })} placeholder="Moto, Carro, Bicicleta..." /></label>
                <label className="form-field-brand"><span className="field-line">Marca</span><input value={form.vehicleBrand} onChange={(event) => setForm({ ...form, vehicleBrand: event.target.value })} placeholder="Yamaha" /></label>
                <label className="form-field-brand"><span className="field-line">Línea / modelo</span><input value={form.vehicleModel} onChange={(event) => setForm({ ...form, vehicleModel: event.target.value })} placeholder="FZ - 2022" /></label>
              </div>
            </section>
            {canManageAccess ? (
              <section className="brand-form-card">
                <header className="brand-card-title"><span><UserCircle size={18} /></span><div><h2>Acceso PWA Mensajero</h2><p>Email y contrasena temporal para el primer ingreso.</p></div></header>
                <div className="brand-general-grid">
                  <label className="form-field-brand"><span className="field-line">Email de acceso</span><input type="email" value={form.accessEmail} onChange={(event) => setForm({ ...form, accessEmail: event.target.value })} placeholder="mensajero@dominio.com" /></label>
                  <label className="form-field-brand"><span className="field-line">{editing ? 'Nueva contrasena temporal' : 'Contrasena temporal'}</span><input minLength={8} type="password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} placeholder="Minimo 8 caracteres" /></label>
                  <label className="form-field-brand"><span className="field-line">Estado de acceso</span><select value={form.accessStatus} onChange={(event) => setForm({ ...form, accessStatus: event.target.value })}>
                    <option value="PENDIENTE_PRIMER_INGRESO">Pendiente primer ingreso</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select></label>
                </div>
              </section>
            ) : null}
            <footer className="brand-form-actions">
              {canSave ? <button className="primary" disabled={isSubmitting || !form.fullName.trim() || form.phone.length !== 8} type="submit"><Save size={17} />{isSubmitting ? 'Guardando...' : 'Guardar mensajero'}</button> : null}
            </footer>
          </form>
        )}
      </div>
    </AdminRoutedShell>
  );
}
