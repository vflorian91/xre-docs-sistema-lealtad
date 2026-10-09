'use client';

import { ArrowLeft, Eye, EyeOff, KeyRound, Save } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';

type StoreRow = { id: string; code: string; name: string; status: 'ACTIVE' | 'INACTIVE' };
type StoresResponse = { data: StoreRow[] };
type RoleRow = { id: string; name: string };
type CatalogItem = { id: string; name: string; code: string; parentItemId?: string | null };
type CatalogResponse = { items: CatalogItem[] };
type CreatedUser = { id: string; fullName: string; email: string };

type UserForm = {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  storeId: string;
  status: 'ACTIVE' | 'INACTIVE';
  mustChangePassword: boolean;
  paisItemId: string;
  departamentoItemId: string;
  municipioItemId: string;
};

const emptyForm: UserForm = {
  fullName: '', email: '', password: '', roleId: '', storeId: '',
  status: 'ACTIVE', mustChangePassword: true,
  paisItemId: '', departamentoItemId: '', municipioItemId: '',
};

export default function NuevoUsuarioPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [departamentos, setDepartamentos] = useState<CatalogItem[]>([]);
  const [municipios, setMunicipios] = useState<CatalogItem[]>([]);
  const [allDepartamentos, setAllDepartamentos] = useState<CatalogItem[]>([]);
  const [allMunicipios, setAllMunicipios] = useState<CatalogItem[]>([]);

  const [form, setForm] = useState<UserForm>(emptyForm);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const [paisSearch, setPaisSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [munSearch, setMunSearch] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userInitials = useMemo(() => initials(form.fullName || 'Usuario'), [form.fullName]);

  useEffect(() => { void loadOptions(); }, []);

  async function loadOptions() {
    setIsLoading(true);
    setMessage(null);
    try {
      const [rolesResult, storesResult, paisResult, deptResult, munResult] = await Promise.all([
        adminApiRequest<RoleRow[]>('/internal-users/roles'),
        adminApiRequest<StoresResponse>('/stores?limit=500&status=ACTIVE&sortBy=name&sortDirection=asc'),
        adminApiRequest<CatalogResponse>('/catalogs/PAIS'),
        adminApiRequest<CatalogResponse>('/catalogs/DEPARTAMENTO'),
        adminApiRequest<CatalogResponse>('/catalogs/MUNICIPIO'),
      ]);
      const sellerRole = rolesResult.find((r) => r.name === 'Vendedora');
      setRoles(rolesResult);
      setStores(storesResult.data.filter((s) => s.status === 'ACTIVE'));
      setPaises(paisResult.items);
      setAllDepartamentos(deptResult.items);
      setAllMunicipios(munResult.items);
      setForm((prev) => ({ ...prev, roleId: prev.roleId || sellerRole?.id || rolesResult[0]?.id || '' }));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los datos.') });
    } finally {
      setIsLoading(false);
    }
  }

  function handlePaisChange(paisItemId: string) {
    setForm((prev) => ({ ...prev, paisItemId, departamentoItemId: '', municipioItemId: '' }));
    setDepartamentos(paisItemId ? allDepartamentos.filter((d) => d.parentItemId === paisItemId) : []);
    setMunicipios([]);
    setPaisSearch('');
    setDeptSearch('');
    setMunSearch('');
  }

  function handleDeptChange(departamentoItemId: string) {
    setForm((prev) => ({ ...prev, departamentoItemId, municipioItemId: '' }));
    setMunicipios(departamentoItemId ? allMunicipios.filter((m) => m.parentItemId === departamentoItemId) : []);
    setDeptSearch('');
    setMunSearch('');
  }

  function handleMunChange(municipioItemId: string) {
    setForm((prev) => ({ ...prev, municipioItemId }));
    setMunSearch('');
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      setMessage({ type: 'error', text: 'Completa los campos obligatorios antes de crear el usuario.' });
      return;
    }
    setIsSubmitting(true);
    setCreatedUserId(null);
    setMessage(null);

    try {
      const created = await adminApiRequest<CreatedUser>('/internal-users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          mustChangePassword: form.mustChangePassword,
          roleIds: [form.roleId],
          storeIds: form.storeId ? [form.storeId] : [],
          paisItemId: form.paisItemId || null,
          departamentoItemId: form.departamentoItemId || null,
          municipioItemId: form.municipioItemId || null,
        }),
      });
      setCreatedUserId(created.id);
      setForm((prev) => ({ ...emptyForm, roleId: prev.roleId }));
      setDepartamentos([]);
      setMunicipios([]);
      setShowPassword(false);
      setMessage({ type: 'success', text: 'Usuario interno creado correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear el usuario.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function generateTemporaryPassword() {
    setForm((prev) => ({ ...prev, password: buildTemporaryPassword(), mustChangePassword: true }));
    setShowPassword(true);
  }

  const isInactive = form.status !== 'ACTIVE';
  const canSave = Boolean(form.fullName.trim() && form.email.trim() && form.password.length >= 8 && form.roleId);

  const filteredPaises = paises.filter((p) => p.name.toLowerCase().includes(paisSearch.toLowerCase()));
  const filteredDepts = departamentos.filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase()));
  const filteredMuns = municipios.filter((m) => m.name.toLowerCase().includes(munSearch.toLowerCase()));

  return (
    <AdminRoutedShell title="Crear usuario">
      <form className="user-edit-shell" onSubmit={createUser}>
        <section className="user-edit-card">
          <div className="user-edit-header">
            <a aria-label="Volver a usuarios" className="user-edit-back" href="/usuarios">
              <ArrowLeft size={19} />
            </a>
            <div className="user-edit-avatar">{userInitials}</div>
            <div className="user-edit-title">
              <h1>Crear perfil de usuario</h1>
              <p>Registra informacion, rol, tienda y seguridad inicial.</p>
            </div>
            <div className="user-edit-actions">
              <a className="user-edit-secondary" href="/usuarios">Cancelar</a>
              <button className="user-edit-primary" disabled={isSubmitting || isLoading || !canSave} type="submit">
                <Save size={16} />
                {isSubmitting ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>

          {message ? <div className={`user-edit-message ${message.type}`}>{message.text}</div> : null}
          {createdUserId ? <div className="user-edit-message success"><a href={`/usuarios/${createdUserId}`}>Ver usuario creado</a></div> : null}
          {isLoading ? <div className="user-edit-message success">Cargando opciones...</div> : null}

          <div className="user-edit-form-card">
            <label className="user-edit-field">
              <span>Nombre completo <b>*</b></span>
              <input autoComplete="name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>

            <label className="user-edit-field">
              <span>Correo electronico <b>*</b></span>
              <input autoComplete="email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>

            <label className="user-edit-field">
              <span>Rol <b>*</b></span>
              <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                <option value="">Seleccionar rol</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>

            <label className="user-edit-field">
              <span>Tienda asignada</span>
              <select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
                <option value="">Sin tienda asignada</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>

            <label className="user-edit-field">
              <span>Estado <b>*</b></span>
              <input readOnly value={isInactive ? 'Inactivo' : 'Activo'} />
            </label>

            <label className="user-edit-checkbox inline">
              <input checked={isInactive} onChange={(e) => setForm({ ...form, status: e.target.checked ? 'INACTIVE' : 'ACTIVE' })} type="checkbox" />
              <span>Inactivar usuario</span>
            </label>

            <label className="user-edit-field">
              <span>Contrasena temporal <b>*</b></span>
              <div className="user-edit-password">
                <input
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Genera una contrasena temporal"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button aria-label={showPassword ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPassword((v) => !v)} type="button">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button className="user-edit-generate" onClick={generateTemporaryPassword} type="button">
              <KeyRound size={16} />
              Generar contrasena temporal
            </button>

            <label className="user-edit-checkbox full">
              <input checked={form.mustChangePassword} onChange={(e) => setForm({ ...form, mustChangePassword: e.target.checked })} type="checkbox" />
              <span>Cambio obligatorio de contrasena</span>
            </label>
          </div>

          <div className="user-edit-section-label">Ubicacion</div>

          <div className="user-edit-form-card">
            <div className="user-edit-field">
              <span>Pais</span>
              <input
                className="user-edit-search-input"
                placeholder="Buscar pais..."
                value={paisSearch || (form.paisItemId ? (paises.find((p) => p.id === form.paisItemId)?.name ?? '') : '')}
                onChange={(e) => { setPaisSearch(e.target.value); if (!e.target.value) handlePaisChange(''); }}
                onFocus={() => setPaisSearch('')}
              />
              {paisSearch.length > 0 ? (
                <div className="user-edit-dropdown">
                  {filteredPaises.length ? filteredPaises.map((p) => (
                    <button key={p.id} type="button" onClick={() => { handlePaisChange(p.id); setPaisSearch(''); }}>
                      {p.name}
                    </button>
                  )) : <span className="user-edit-dropdown-empty">No hay registros disponibles</span>}
                </div>
              ) : null}
            </div>

            <div className="user-edit-field">
              <span>Departamento</span>
              <input
                className="user-edit-search-input"
                disabled={!form.paisItemId}
                placeholder={form.paisItemId ? 'Buscar departamento...' : 'Selecciona un pais primero'}
                value={deptSearch || (form.departamentoItemId ? (departamentos.find((d) => d.id === form.departamentoItemId)?.name ?? '') : '')}
                onChange={(e) => { setDeptSearch(e.target.value); if (!e.target.value) handleDeptChange(''); }}
                onFocus={() => setDeptSearch('')}
              />
              {deptSearch.length > 0 ? (
                <div className="user-edit-dropdown">
                  {filteredDepts.length ? filteredDepts.map((d) => (
                    <button key={d.id} type="button" onClick={() => { handleDeptChange(d.id); setDeptSearch(''); }}>
                      {d.name}
                    </button>
                  )) : <span className="user-edit-dropdown-empty">No hay registros disponibles</span>}
                </div>
              ) : null}
            </div>

            <div className="user-edit-field">
              <span>Municipio</span>
              <input
                className="user-edit-search-input"
                disabled={!form.departamentoItemId}
                placeholder={form.departamentoItemId ? 'Buscar municipio...' : 'Selecciona un departamento primero'}
                value={munSearch || (form.municipioItemId ? (municipios.find((m) => m.id === form.municipioItemId)?.name ?? '') : '')}
                onChange={(e) => { setMunSearch(e.target.value); if (!e.target.value) handleMunChange(''); }}
                onFocus={() => setMunSearch('')}
              />
              {munSearch.length > 0 ? (
                <div className="user-edit-dropdown">
                  {filteredMuns.length ? filteredMuns.map((m) => (
                    <button key={m.id} type="button" onClick={() => { handleMunChange(m.id); setMunSearch(''); }}>
                      {m.name}
                    </button>
                  )) : <span className="user-edit-dropdown-empty">No hay registros disponibles</span>}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </form>
    </AdminRoutedShell>
  );
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SA';
}

function buildTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@$%*?';
  const all = `${upper}${lower}${numbers}${symbols}`;
  const required = [pick(upper), pick(lower), pick(numbers), pick(symbols)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

function pick(source: string) {
  return source[Math.floor(Math.random() * source.length)];
}
