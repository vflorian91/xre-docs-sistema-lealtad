import { CalendarDays, ChevronRight, MoreVertical } from 'lucide-react';
import type React from 'react';
import type { ChartSeries, DashboardTone, DonutItem, MetricItem } from './types';

type MetricCardProps = {
  item: MetricItem;
};

export function DashboardMetricCard({ item }: MetricCardProps) {
  const Icon = item.icon;
  return (
    <article className="split-metric-card">
      <span className={`split-metric-icon ${item.tone}`}>
        <Icon size={30} aria-hidden="true" />
      </span>
      <div>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
      </div>
    </article>
  );
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="split-month-picker">
      <CalendarDays size={18} aria-hidden="true" />
      <input type="month" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Seleccionar mes" />
    </label>
  );
}

export function DashboardLineChart({ title, labels, series, selectedMonth, onMonthChange, isLoading }: {
  title: string;
  labels: string[];
  series: ChartSeries[];
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  isLoading?: boolean;
}) {
  const max = Math.max(1, ...series.flatMap((entry) => entry.values));
  const width = 820;
  const height = 250;
  const padX = 34;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  return (
    <section className="split-panel split-chart-panel">
      <div className="split-panel-header">
        <div>
          <h2>{title}</h2>
          <div className="split-legend">
            {series.map((entry) => <span key={entry.label}><i style={{ background: entry.color }} />{entry.label}</span>)}
          </div>
        </div>
        <MonthPicker value={selectedMonth} onChange={onMonthChange} />
      </div>
      <div className="split-chart-wrap" aria-busy={isLoading}>
        <svg className="split-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {[0, 1, 2, 3].map((tick) => {
            const y = padY + (innerH / 3) * tick;
            return <line key={tick} x1={padX} x2={width - padX} y1={y} y2={y} className="split-grid-line" />;
          })}
          {series.map((entry) => {
            const points = entry.values.map((value, index) => {
              const x = padX + (innerW / Math.max(1, entry.values.length - 1)) * index;
              const y = padY + innerH - (value / max) * innerH;
              return `${x},${y}`;
            });
            return <polyline key={entry.label} points={points.join(' ')} fill="none" stroke={entry.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
          })}
          {labels.map((label, index) => {
            if (index !== 0 && index !== labels.length - 1 && index % 4 !== 0) return null;
            const x = padX + (innerW / Math.max(1, labels.length - 1)) * index;
            return <text key={label} x={x} y={height - 2} textAnchor="middle" className="split-axis-text">{label}</text>;
          })}
        </svg>
      </div>
    </section>
  );
}

export function DashboardDonutChart({ title, items }: { title: string; items: DonutItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const gradient = buildConicGradient(items, total);

  return (
    <section className="split-panel split-donut-panel">
      <div className="split-panel-header"><h2>{title}</h2></div>
      <div className="split-donut-layout">
        <div className="split-donut" style={{ background: gradient }} aria-hidden="true" />
        <div className="split-donut-legend">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <p key={item.label}>
                <span><i style={{ background: item.color }} />{item.label}</span>
                <b>{pct}% <small>({item.value})</small></b>
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function DashboardTable({ title, href, columns, rows }: {
  title: string;
  href: string;
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <section className="split-panel split-table-panel">
      <div className="split-panel-header">
        <h2>{title}</h2>
        <a href={href}>Ver todos</a>
      </div>
      <div className="split-table-wrap">
        <table className="split-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Acciones</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                <td><button className="split-row-action" type="button" aria-label="Mas acciones"><MoreVertical size={18} /></button></td>
              </tr>
            )) : (
              <tr><td colSpan={columns.length + 1} className="split-empty">Sin informacion para el periodo seleccionado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AlertsCard({ title, href, alerts }: {
  title: string;
  href: string;
  alerts: Array<{ label: string; detail: string; value: string; tone: DashboardTone; icon: React.ElementType }>;
}) {
  return (
    <section className="split-panel split-alert-panel">
      <div className="split-panel-header">
        <h2>{title}</h2>
        <a href={href}>Ver todas</a>
      </div>
      <div className="split-alert-list">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <a className="split-alert-item" href={href} key={alert.label}>
              <span className={`split-alert-icon ${alert.tone}`}><Icon size={22} aria-hidden="true" /></span>
              <span><strong>{alert.label}</strong><small>{alert.detail}</small></span>
              <b className={alert.tone}>{alert.value}</b>
              <ChevronRight size={20} aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function StatusBadge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: DashboardTone }) {
  return <span className={`split-badge ${tone}`}>{children}</span>;
}

function buildConicGradient(items: DonutItem[], total: number) {
  if (total <= 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';
  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 360;
    cursor = end;
    return `${item.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
