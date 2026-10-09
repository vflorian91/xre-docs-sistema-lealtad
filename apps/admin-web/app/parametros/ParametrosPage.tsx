'use client';

import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate } from '../lib/format';

type SettingKey = 'POINTS_TO_BALANCE_CONVERSION' | 'REDEMPTIONS' | 'PROMOTIONAL_BALANCE';

type SettingRow = {
  id: string;
  key: SettingKey;
  value: unknown;
  description?: string | null;
  isEditable: boolean;
  updatedAt: string;
};

type OperationalSettingForms = {
  conversion: {
    points: string;
    amount: string;
    minimumPoints: string;
    isEnabled: boolean;
  };
  redemptions: {
    expirationDays: string;
  };
  promotionalBalance: {
    maxUsePerPurchase: string;
  };
};

const defaultForms: OperationalSettingForms = {
  conversion: {
    points: '100',
    amount: '1',
    minimumPoints: '100',
    isEnabled: true,
  },
  redemptions: {
    expirationDays: '30',
  },
  promotionalBalance: {
    maxUsePerPurchase: '',
  },
};

export default function ParametrosPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [forms, setForms] = useState<OperationalSettingForms>(defaultForms);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<SettingRow[]>('/settings');
      setSettings(result);
      setForms(resolveOperationalSettingForms(result));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los parametros.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveConversionSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSetting('POINTS_TO_BALANCE_CONVERSION', {
      points: Number(forms.conversion.points),
      amount: Number(forms.conversion.amount),
      minimumPoints: Number(forms.conversion.minimumPoints),
      isEnabled: forms.conversion.isEnabled,
    }, 'Conversion de puntos actualizada.');
  }

  async function saveRedemptionsSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSetting('REDEMPTIONS', {
      expirationDays: Number(forms.redemptions.expirationDays),
    }, 'Parametros de canjes actualizados.');
  }

  async function savePromotionalBalanceSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSetting('PROMOTIONAL_BALANCE', {
      maxUsePerPurchase: forms.promotionalBalance.maxUsePerPurchase ? Number(forms.promotionalBalance.maxUsePerPurchase) : null,
    }, 'Limites de saldo promocional actualizados.');
  }

  async function saveSetting(key: SettingKey, value: Record<string, unknown>, successText: string) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify(value),
      });
      await loadSettings();
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo guardar el parametro.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Parametros">
      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Parametros</h2>
          <p>Ajusta conversiones, vencimientos y limites operativos del sistema.</p>
        </div>
        <button className="admin-secondary" disabled={isLoading} onClick={() => void loadSettings()} type="button">Actualizar</button>
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="admin-section-grid">
        <article className="panel form-panel">
          <h2>Conversion puntos a saldo</h2>
          <p className="muted-copy">Controla cuantos puntos equivalen a saldo promocional.</p>
          <form className="admin-form" onSubmit={saveConversionSetting}>
            <label>
              Puntos base
              <input inputMode="numeric" value={forms.conversion.points} onChange={(event) => setForms({ ...forms, conversion: { ...forms.conversion, points: event.target.value.replace(/\D/g, '') } })} />
            </label>
            <label>
              Saldo generado Q
              <input inputMode="decimal" value={forms.conversion.amount} onChange={(event) => setForms({ ...forms, conversion: { ...forms.conversion, amount: event.target.value } })} />
            </label>
            <label>
              Minimo de puntos
              <input inputMode="numeric" value={forms.conversion.minimumPoints} onChange={(event) => setForms({ ...forms, conversion: { ...forms.conversion, minimumPoints: event.target.value.replace(/\D/g, '') } })} />
            </label>
            <label className="check-row">
              <input checked={forms.conversion.isEnabled} type="checkbox" onChange={(event) => setForms({ ...forms, conversion: { ...forms.conversion, isEnabled: event.target.checked } })} />
              Conversion habilitada
            </label>
            <button className="admin-primary" disabled={isSubmitting} type="submit">Guardar conversion</button>
          </form>
        </article>

        <article className="panel form-panel">
          <h2>Canjes</h2>
          <p className="muted-copy">Define cuantos dias tiene un cliente para validar un canje solicitado.</p>
          <form className="admin-form" onSubmit={saveRedemptionsSetting}>
            <label>
              Dias para vencimiento
              <input inputMode="numeric" value={forms.redemptions.expirationDays} onChange={(event) => setForms({ ...forms, redemptions: { expirationDays: event.target.value.replace(/\D/g, '') } })} />
            </label>
            <button className="admin-primary" disabled={isSubmitting} type="submit">Guardar canjes</button>
          </form>
        </article>

        <article className="panel form-panel wide-panel">
          <h2>Saldo promocional</h2>
          <p className="muted-copy">Puedes limitar el monto maximo que una tienda puede aplicar en una compra.</p>
          <form className="admin-form inline-settings-form" onSubmit={savePromotionalBalanceSetting}>
            <label>
              Maximo por compra Q
              <input inputMode="decimal" placeholder="Sin limite" value={forms.promotionalBalance.maxUsePerPurchase} onChange={(event) => setForms({ ...forms, promotionalBalance: { maxUsePerPurchase: event.target.value } })} />
            </label>
            <button className="admin-primary" disabled={isSubmitting} type="submit">Guardar saldo</button>
          </form>
        </article>

        <article className="panel table-panel wide-panel">
          <div className="panel-header">
            <h2>Parametros registrados</h2>
            <span className="count-pill">{settings.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Parametro</th>
                <th>Editable</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id}>
                  <td>
                    <strong>{settingLabel(setting.key)}</strong>
                    <p className="table-subtitle">{setting.description ?? setting.key}</p>
                  </td>
                  <td><span className={setting.isEditable ? 'badge green' : 'badge red'}>{setting.isEditable ? 'SI' : 'NO'}</span></td>
                  <td>{formatDate(setting.updatedAt)}</td>
                </tr>
              ))}
              {!settings.length ? (
                <tr><td colSpan={3}>{isLoading ? 'Cargando parametros...' : 'No hay parametros registrados.'}</td></tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>
    </AdminRoutedShell>
  );
}

function resolveOperationalSettingForms(settings: SettingRow[]): OperationalSettingForms {
  const conversion = settingValue(settings, 'POINTS_TO_BALANCE_CONVERSION');
  const redemptions = settingValue(settings, 'REDEMPTIONS');
  const promotionalBalance = settingValue(settings, 'PROMOTIONAL_BALANCE');

  return {
    conversion: {
      points: String(numberSetting(conversion.points, 100)),
      amount: String(numberSetting(conversion.amount, 1)),
      minimumPoints: String(numberSetting(conversion.minimumPoints, 100)),
      isEnabled: typeof conversion.isEnabled === 'boolean' ? conversion.isEnabled : true,
    },
    redemptions: {
      expirationDays: String(numberSetting(redemptions.expirationDays, 30)),
    },
    promotionalBalance: {
      maxUsePerPurchase: promotionalBalance.maxUsePerPurchase === null || promotionalBalance.maxUsePerPurchase === undefined
        ? ''
        : String(numberSetting(promotionalBalance.maxUsePerPurchase, 0)),
    },
  };
}

function settingValue(settings: SettingRow[], key: SettingKey) {
  const row = settings.find((setting) => setting.key === key);
  return isRecord(row?.value) ? row.value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberSetting(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function settingLabel(key: SettingKey) {
  const labels: Record<SettingKey, string> = {
    POINTS_TO_BALANCE_CONVERSION: 'Conversion de puntos a saldo',
    REDEMPTIONS: 'Canjes',
    PROMOTIONAL_BALANCE: 'Saldo promocional',
  };

  return labels[key];
}
