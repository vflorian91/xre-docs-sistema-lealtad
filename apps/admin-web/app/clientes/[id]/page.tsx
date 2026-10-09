'use client';

import {
  ArrowLeft,
  CalendarDays,
  CirclePlus,
  Mail,
  MapPin,
  MinusCircle,
  Pencil,
  Phone,
  ShoppingBag,
  User,
  WalletCards,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { PointsAdjustModal, PointsAdjustModalState } from '../../components/PointsAdjustModal';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatDate, formatMoney, formatNumber, formatTime } from '../../lib/format';

type StoreRef = {
  id: string;
  code: string;
  name: string;
};

type CustomerProfile = {
  customer: {
    id: string;
    code: string;
    taxId?: string | null;
    fullName: string;
    phone: string;
    email?: string | null;
    birthDate?: string | null;
    availablePoints?: number;
    loyaltyLevel?: string | null;
    purchasesCount?: number;
    status: string;
    registrationSource: string;
    createdAt: string;
    updatedAt: string;
    registrationStore?: StoreRef | null;
  };
  levelProgress?: {
    code: string;
    name: string;
    minPurchases: number;
    maxPurchases: number | null;
    nextLevelName: string | null;
    nextLevelMinPurchases: number | null;
    remainingPurchases: number;
  };
  purchases: Array<{
    id: string;
    invoiceNumber: string;
    amount: string;
    status?: string;
    pointsCalculated?: number;
    purchasedAt: string;
    store: StoreRef;
    internalUser: { id: string; fullName: string; email: string };
  }>;
  pointMovements: Array<{
    id: string;
    type: string;
    status: string;
    points: number;
    description?: string | null;
    createdAt: string;
    purchase?: {
      id: string;
      invoiceNumber: string;
      amount: string;
      purchasedAt: string;
      store: StoreRef;
      internalUser: { id: string; fullName: string; email: string };
    } | null;
  }>;
  redemptions: Array<{
    id: string;
    requestCode: string;
    status: string;
    pointsReserved: number;
    requestedAt: string;
    deliveredAt?: string | null;
    product: { id: string; name: string };
    pickupStore?: StoreRef | null;
    managedByInternalUser?: { id: string; fullName: string; email: string } | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    module: string;
    createdAt: string;
    actor: { id: string | null; label: string; secondary: string };
  }>;
};

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pointsAdjustState, setPointsAdjustState] = useState<PointsAdjustModalState | null>(null);

  async function loadProfile(isMounted = true) {
      setIsLoading(true);
      setError(null);

      try {
        const body = await adminApiRequest<CustomerProfile>(`/customers/${customerId}/profile`);

        if (isMounted) {
          setProfile(body);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(getErrorText(requestError, 'No se pudo cargar el perfil del cliente.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
  }

  useEffect(() => {
    let isMounted = true;
    if (customerId) {
      void loadProfile(isMounted);
    }

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  function adjustPoints(mode: 'add' | 'remove') {
    if (!profile) return;
    setPointsAdjustState({
      mode,
      customerName: profile.customer.fullName,
      onConfirm: (points, description) => applyAdjustPoints(points, description),
    });
  }

  async function applyAdjustPoints(points: number, description: string) {
    if (!profile) return;
    setPointsAdjustState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest('/points/adjustments', {
        method: 'POST',
        body: JSON.stringify({ customerId: profile.customer.id, points, description }),
      });
      await loadProfile();
      setMessage({ type: 'success', text: 'Ajuste de puntos realizado correctamente.' });
    } catch (actionError) {
      setMessage({ type: 'error', text: getErrorText(actionError, 'No se pudieron actualizar los puntos.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Perfil del cliente">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <a aria-label="Volver a clientes" className="customer-back-button" href="/clientes">
            <ArrowLeft size={20} />
          </a>
          <div>
            <h2>Perfil del cliente</h2>
            <p>Consulta el detalle completo, comportamiento y actividad del cliente.</p>
          </div>
          <div className="customer-profile-actions">
            <a className="admin-secondary" href="/clientes">
              <ArrowLeft size={16} />
              Regresar
            </a>
            <a className="admin-secondary" href={`/clientes/${customerId}/editar`}>
              <Pencil size={16} />
              Editar cliente
            </a>
            <button className="admin-primary" disabled={isSubmitting || !profile} onClick={() => void adjustPoints('add')} type="button">
              <CirclePlus size={16} />
              Sumar puntos
            </button>
            <button className="admin-secondary" disabled={isSubmitting || !profile} onClick={() => void adjustPoints('remove')} type="button">
              <MinusCircle size={16} />
              Quitar puntos
            </button>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="panel customer-profile-state">Cargando perfil...</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        {profile ? <CustomerProfileDashboard profile={profile} /> : null}
      </section>
      {pointsAdjustState ? (
        <PointsAdjustModal state={pointsAdjustState} onClose={() => setPointsAdjustState(null)} isSubmitting={isSubmitting} />
      ) : null}
    </AdminRoutedShell>
  );
}

function CustomerProfileDashboard({ profile }: { profile: CustomerProfile }) {
  const customer = profile.customer;
  const totalPurchased = profile.purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0);
  const redemptionBreakdown = redemptionsByCategory(profile.redemptions);
  const level = customer.loyaltyLevel ?? 'Básico';
  const purchasesCount = customer.purchasesCount ?? 0;
  const levelProgress = profile.levelProgress;
  const nextLevel = levelProgress?.nextLevelName ?? null;
  const nextTarget = levelProgress?.nextLevelMinPurchases ?? null;
  const progress = nextTarget ? Math.min(100, Math.round((purchasesCount / nextTarget) * 100)) : 100;
  const remainingPurchases = levelProgress?.remainingPurchases ?? 0;
  const monthlyPurchases = useMemo(() => purchaseBars(profile.purchases), [profile.purchases]);
  const pointTrend = useMemo(() => pointLine(profile.pointMovements, customer.availablePoints ?? 0), [profile.pointMovements, customer.availablePoints]);

  return (
    <>
      <section className="panel customer-profile-hero">
        <div className="customer-avatar-large">
          <User size={64} />
        </div>
        <div className="customer-profile-main">
          <div className="customer-profile-name-row">
            <h3>{customer.fullName}</h3>
            <span className={customer.status === 'ACTIVE' ? 'badge green' : 'badge red'}>{customer.status === 'ACTIVE' ? 'Activo' : customer.status}</span>
            <span className={`loyalty-level-badge ${loyaltyLevelClass(customer.loyaltyLevel)}`}>{level}</span>
          </div>
          <p className="customer-code-line">Código de cliente <strong>{customer.code}</strong></p>
          <div className="customer-profile-info-grid">
            <span><WalletCards size={15} /> NIT {customer.taxId ?? 'Sin NIT'}</span>
            <span><Phone size={15} /> {customer.phone}</span>
            <span><Mail size={15} /> {customer.email ?? 'Sin correo'}</span>
            <span><MapPin size={15} /> {customer.registrationStore?.name ?? originLabel(customer.registrationSource)}</span>
            <span><CalendarDays size={15} /> Registrado el {formatDate(customer.createdAt)}</span>
          </div>
        </div>
        <div className="customer-level-progress">
          <strong>{nextLevel ? `Faltan ${formatNumber(remainingPurchases)} compras para subir a ${nextLevel}` : 'Nivel máximo alcanzado'}</strong>
          <div className="customer-progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{formatNumber(purchasesCount)} / {nextTarget ? formatNumber(nextTarget) : formatNumber(purchasesCount)} compras</p>
          <div>
            <span>Nivel actual <b>{level}</b></span>
            <span>Siguiente nivel <b>{nextLevel ?? level}</b></span>
          </div>
        </div>
      </section>

      <section className="customer-analytics-grid">
        <article className="panel customer-chart-card wide">
          <h3>Evolución de puntos</h3>
          <PointEvolutionChart points={pointTrend} />
        </article>
        <article className="panel customer-chart-card">
          <h3>Compras por mes (Q)</h3>
          {monthlyPurchases.length ? (
            <div className="customer-bar-chart" style={{ gridTemplateColumns: `repeat(${monthlyPurchases.length}, minmax(52px, 82px))` }}>
              {monthlyPurchases.map((month) => (
                <div key={month.key}>
                  <span title={`Q${formatMoney(month.amount)}`} style={{ height: `${month.percent}%` }} />
                  <small>{month.label}</small>
                </div>
              ))}
            </div>
          ) : <div className="customer-chart-empty">Sin compras registradas para este cliente.</div>}
        </article>
        <article className="panel customer-chart-card">
          <h3>Canjes por categoría</h3>
          {profile.redemptions.length ? (
            <div className="customer-donut-summary customer-donut-clean">
              <div
                style={{
                  background: `conic-gradient(#2563eb 0 ${redemptionBreakdown.validated.percent}%, #22c55e ${redemptionBreakdown.validated.percent}% ${redemptionBreakdown.validated.percent + redemptionBreakdown.requested.percent}%, #f97316 ${redemptionBreakdown.validated.percent + redemptionBreakdown.requested.percent}% 100%)`,
                }}
              >
                <strong>{formatNumber(profile.redemptions.length)}</strong>
                <span>canjes</span>
              </div>
              <ul>
                <li><b className="blue-dot" /> Canjes validados <em>{formatNumber(redemptionBreakdown.validated.count)} · {formatNumber(redemptionBreakdown.validated.points)} pts</em></li>
                <li><b className="green-dot" /> Canjes solicitados <em>{formatNumber(redemptionBreakdown.requested.count)} · {formatNumber(redemptionBreakdown.requested.points)} pts</em></li>
                <li><b className="amber-dot" /> Canjes cancelados <em>{formatNumber(redemptionBreakdown.cancelled.count)} · {formatNumber(redemptionBreakdown.cancelled.points)} pts</em></li>
              </ul>
            </div>
          ) : (
            <div className="customer-chart-empty">Sin canjes registrados para este cliente.</div>
          )}
        </article>
      </section>

      <section className="customer-history-layout">
        <article className="panel table-panel customer-history-panel">
          <div className="panel-header">
            <h3>Historial reciente</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Tienda / Canal</th>
                <th>Puntos</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory(profile).map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.date)} <span className="table-subtitle">{formatTime(item.date)}</span></td>
                  <td><span className={`history-type ${item.tone}`}>{item.type}</span></td>
                  <td>{item.description}</td>
                  <td>{item.channel}</td>
                  <td className={item.points >= 0 ? 'positive' : 'negative'}>{item.points ? `${item.points > 0 ? '+' : ''}${formatNumber(item.points)}` : '-'}</td>
                  <td>{item.amount ? `Q${formatMoney(item.amount)}` : '-'}</td>
                  <td><span className={`badge ${item.status === 'Anulada' || item.status === 'Rechazada' ? 'red' : item.status === 'Revisión' ? 'amber' : 'green'}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel customer-behavior-panel">
          <h3>Resumen de comportamiento</h3>
          <ul>
            <li><User size={18} /><span><strong>Cliente frecuente</strong>{purchaseFrequency(profile.purchases)} compras por mes.</span></li>
            <li><ShoppingBag size={18} /><span><strong>Ticket promedio</strong>Q{formatMoney(profile.purchases.length ? totalPurchased / profile.purchases.length : 0)} por compra.</span></li>
            <li><WalletCards size={18} /><span><strong>Canjes realizados</strong>{formatNumber(profile.redemptions.length)} beneficios registrados.</span></li>
            <li><CalendarDays size={18} /><span><strong>Último cambio</strong>{profile.auditLogs[0] ? formatDate(profile.auditLogs[0].createdAt) : 'Sin auditoría'}.</span></li>
          </ul>
        </article>
      </section>
    </>
  );
}

function purchaseBars(purchases: CustomerProfile['purchases']) {
  const totalsByMonth = new Map<string, { date: Date; amount: number }>();
  purchases.forEach((purchase) => {
    const date = new Date(purchase.purchasedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = totalsByMonth.get(key);
    totalsByMonth.set(key, { date, amount: (current?.amount ?? 0) + Number(purchase.amount) });
  });
  const recent = [...totalsByMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const max = Math.max(1, ...recent.map(([, month]) => month.amount));

  return recent.map(([key, month]) => ({
    key,
    amount: month.amount,
    label: new Intl.DateTimeFormat('es-GT', { month: 'short', year: '2-digit' }).format(month.date),
    percent: Math.max(12, Math.round((month.amount / max) * 100)),
  }));
}

function pointLine(movements: CustomerProfile['pointMovements'], currentPoints: number) {
  const recent = movements.slice(0, 10).reverse();
  let running = Math.max(0, currentPoints - recent.reduce((sum, movement) => sum + movement.points, 0));
  const values = recent.map((movement) => {
    running += movement.points;
    return running;
  });
  const max = Math.max(1, ...values, currentPoints);

  const source = values.length
    ? recent.map((movement, index) => ({ value: values[index], date: new Date(movement.createdAt) }))
    : [{ value: currentPoints, date: new Date() }];

  return source.map((point) => ({
    ...point,
    percent: Math.round((point.value / max) * 100),
    label: new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' }).format(point.date),
  }));
}

function PointEvolutionChart({ points }: { points: ReturnType<typeof pointLine> }) {
  const width = 640;
  const plotLeft = 24;
  const plotRight = 616;
  const plotTop = 18;
  const plotBottom = 128;
  const xFor = (index: number) => points.length === 1
    ? width / 2
    : plotLeft + ((plotRight - plotLeft) * index) / (points.length - 1);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: plotBottom - ((plotBottom - plotTop) * point.percent) / 100,
  }));
  const linePoints = coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const areaPoints = coordinates.length > 1
    ? `${plotLeft},${plotBottom} ${linePoints} ${plotRight},${plotBottom}`
    : '';
  const labelStep = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div className="customer-line-chart">
      <svg viewBox={`0 0 ${width} 160`} role="img" aria-label="Evolución del saldo de puntos">
        {[plotTop, 55, 92, plotBottom].map((y) => <line key={y} x1={plotLeft} x2={plotRight} y1={y} y2={y} />)}
        {areaPoints ? <polygon className="customer-points-area" points={areaPoints} /> : null}
        {coordinates.length > 1 ? <polyline className="customer-points-line" points={linePoints} /> : null}
        {coordinates.map((point, index) => (
          <g key={`${point.date.toISOString()}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" />
            {(index % labelStep === 0 || index === coordinates.length - 1) ? <text x={point.x} y="151" textAnchor="middle">{point.label}</text> : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function recentHistory(profile: CustomerProfile) {
  const pointAdjustments = profile.pointMovements
    .filter((movement) => movement.type === 'ADMIN_ADJUSTMENT_POSITIVE' || movement.type === 'ADMIN_ADJUSTMENT_NEGATIVE')
    .slice(0, 8)
    .map((movement) => ({
      id: `points-${movement.id}`,
      date: movement.createdAt,
      type: movement.points > 0 ? 'Suma de puntos' : 'Resta de puntos',
      tone: movement.points > 0 ? 'green' : 'red',
      description: movement.description ?? 'Ajuste manual',
      channel: 'Administración',
      points: movement.points,
      amount: 0,
      status: movement.status,
    }));
  const redemptions = profile.redemptions.slice(0, 3).map((redemption) => ({
    id: `redemption-${redemption.id}`,
    date: redemption.deliveredAt ?? redemption.requestedAt,
    type: 'Canje',
    tone: 'amber',
    description: `${redemption.product.name} ${redemption.requestCode}`,
    channel: redemption.pickupStore?.name ?? 'Pendiente',
    points: -redemption.pointsReserved,
    amount: 0,
    status: redemption.status,
  }));
  const purchases = profile.purchases.slice(0, 8).map((purchase) => ({
    id: `purchase-${purchase.id}`,
    date: purchase.purchasedAt,
    type: 'Compra',
    tone: 'blue',
    description: `Factura No. ${purchase.invoiceNumber}`,
    channel: purchase.store.name,
    points: purchase.pointsCalculated ?? 0,
    amount: Number(purchase.amount),
    status: purchaseStatusLabel(purchase.status),
  }));
  return [...pointAdjustments, ...redemptions, ...purchases]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
}

function purchaseStatusLabel(status?: string) {
  if (status === 'REVERSED') return 'Anulada';
  if (status === 'REJECTED') return 'Rechazada';
  if (status === 'PENDING_REVIEW') return 'Revisión';
  return 'Registrada';
}

function redemptionsByCategory(redemptions: CustomerProfile['redemptions']) {
  const groups = {
    validated: { count: 0, points: 0 },
    requested: { count: 0, points: 0 },
    cancelled: { count: 0, points: 0 },
  };

  redemptions.forEach((redemption) => {
    const group = redemption.status === 'DELIVERED' || redemption.status === 'READY' || redemption.status === 'SENT_TO_STORE' || redemption.status === 'APPROVED'
      ? groups.validated
      : redemption.status === 'CANCELLED' || redemption.status === 'REJECTED' || redemption.status === 'EXPIRED'
        ? groups.cancelled
        : groups.requested;
    group.count += 1;
    group.points += redemption.pointsReserved;
  });

  const total = Math.max(1, redemptions.length);
  return {
    validated: { ...groups.validated, percent: Math.round((groups.validated.count / total) * 100) },
    requested: { ...groups.requested, percent: Math.round((groups.requested.count / total) * 100) },
    cancelled: { ...groups.cancelled, percent: Math.round((groups.cancelled.count / total) * 100) },
  };
}

function purchaseFrequency(purchases: CustomerProfile['purchases']) {
  if (!purchases.length) return '0';

  const dates = purchases.map((purchase) => new Date(purchase.purchasedAt).getTime());
  const spanDays = Math.max(30, (Math.max(...dates) - Math.min(...dates)) / 86400000);

  return (purchases.length / (spanDays / 30)).toFixed(1);
}

function loyaltyLevelClass(level?: string | null) {
  if (level === 'Oro') return 'gold';
  if (level === 'Plata') return 'silver';
  if (level === 'Bronce') return 'bronze';

  return 'basic';
}

function originLabel(source: string) {
  if (source === 'STORE') return 'Tienda';
  if (source === 'ADMIN') return 'Administración';

  return source;
}
