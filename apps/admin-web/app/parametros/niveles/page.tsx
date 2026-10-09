'use client';

import { Save, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { formatNumber } from '../../lib/format';

type LoyaltyLevelTier = {
  id: string;
  code: string;
  name: string;
  minPurchases: number;
  maxPurchases: number | null;
  sortOrder: number;
  isActive: boolean;
};

type TierForm = {
  name: string;
  minPurchases: string;
  maxPurchases: string;
  sortOrder: string;
  isActive: boolean;
};

export default function ParametrosNivelesPage() {
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [tiers, setTiers] = useState<LoyaltyLevelTier[]>([]);
  const [forms, setForms] = useState<Record<string, TierForm>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = Boolean(user?.permissions.includes('settings.manage'));

  useEffect(() => {
    setUser(getStoredAdminUser());
    void loadTiers();
  }, []);

  async function loadTiers() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<LoyaltyLevelTier[]>('/loyalty-levels?includeInactive=true');
      const ordered = [...result].sort((left, right) => left.sortOrder - right.sortOrder);
      setTiers(ordered);
      setForms(Object.fromEntries(ordered.map((tier) => [tier.id, formFromTier(tier)])));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los niveles de clientes.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTier(tier: LoyaltyLevelTier) {
    const form = forms[tier.id];
    if (!form) return;

    const minPurchases = Number(form.minPurchases);
    const maxPurchases = form.maxPurchases.trim() ? Number(form.maxPurchases) : null;

    if (!form.name.trim() || Number.isNaN(minPurchases) || minPurchases < 0) {
      setMessage({ type: 'error', text: 'Completa el nombre y el minimo de compras.' });
      return;
    }

    if (maxPurchases !== null && (Number.isNaN(maxPurchases) || maxPurchases < minPurchases)) {
      setMessage({ type: 'error', text: 'El maximo de compras debe ser mayor o igual al minimo.' });
      return;
    }

    setSavingId(tier.id);
    setMessage(null);

    try {
      await adminApiRequest(`/loyalty-levels/${tier.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          minPurchases,
          maxPurchases,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        }),
      });
      await loadTiers();
      setMessage({ type: 'success', text: 'Nivel actualizado y clientes recalculados correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo guardar el nivel.') });
    } finally {
      setSavingId(null);
    }
  }

  function updateForm(id: string, patch: Partial<TierForm>) {
    setForms((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  return (
    <AdminRoutedShell title="Parametros / Niveles">
      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Niveles de clientes</h2>
          <p>Define cuantas compras necesita un cliente para pertenecer a cada nivel.</p>
        </div>
        <button className="admin-secondary" disabled={isLoading} onClick={() => void loadTiers()} type="button">Actualizar</button>
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Settings size={24} /> Configuracion de niveles</h2></div>
          <span className="count-pill">{formatNumber(tiers.length)}</span>
        </div>

        <table className="customer-records-table">
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Nombre visible</th>
              <th>Compras desde</th>
              <th>Compras hasta</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => {
              const form = forms[tier.id] ?? formFromTier(tier);

              return (
                <tr key={tier.id}>
                  <td>
                    <span className="store-code-pill">{tier.code}</span>
                    <p className="table-subtitle"><Users size={13} /> Nivel actual del sistema</p>
                  </td>
                  <td>
                    <input
                      aria-label={`Nombre de ${tier.name}`}
                      disabled={!canManage || savingId === tier.id}
                      value={form.name}
                      onChange={(event) => updateForm(tier.id, { name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Compras minimas de ${tier.name}`}
                      disabled={!canManage || savingId === tier.id}
                      inputMode="numeric"
                      value={form.minPurchases}
                      onChange={(event) => updateForm(tier.id, { minPurchases: event.target.value.replace(/\D/g, '') })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Compras maximas de ${tier.name}`}
                      disabled={!canManage || savingId === tier.id}
                      inputMode="numeric"
                      placeholder="Sin limite"
                      value={form.maxPurchases}
                      onChange={(event) => updateForm(tier.id, { maxPurchases: event.target.value.replace(/\D/g, '') })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Orden de ${tier.name}`}
                      disabled={!canManage || savingId === tier.id}
                      inputMode="numeric"
                      value={form.sortOrder}
                      onChange={(event) => updateForm(tier.id, { sortOrder: event.target.value.replace(/\D/g, '') })}
                    />
                  </td>
                  <td>
                    <label className="check-row compact-check-row">
                      <input
                        checked={form.isActive}
                        disabled={!canManage || savingId === tier.id}
                        type="checkbox"
                        onChange={(event) => updateForm(tier.id, { isActive: event.target.checked })}
                      />
                      Activo
                    </label>
                  </td>
                  <td>
                    {canManage ? (
                      <button className="customer-icon-action" disabled={savingId === tier.id} onClick={() => void saveTier(tier)} type="button">
                        <Save size={16} />
                      </button>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
            {!isLoading && tiers.length === 0 ? <tr><td colSpan={7}>No hay niveles configurados.</td></tr> : null}
            {isLoading ? <tr><td colSpan={7}>Cargando niveles...</td></tr> : null}
          </tbody>
        </table>
      </article>
    </AdminRoutedShell>
  );
}

function formFromTier(tier: LoyaltyLevelTier): TierForm {
  return {
    name: tier.name,
    minPurchases: String(tier.minPurchases),
    maxPurchases: tier.maxPurchases == null ? '' : String(tier.maxPurchases),
    sortOrder: String(tier.sortOrder),
    isActive: tier.isActive,
  };
}
