'use client';

import { CreditCard, FileBarChart, Package, ScrollText, ShoppingCart, Truck, Users } from 'lucide-react';

export const REPORT_LINKS = [
  { label: 'Ventas y pedidos', description: 'Pedidos solicitados, confirmados y entregados', href: '/tienda-online/reportes/ventas', icon: ShoppingCart, permission: 'store_reports.sales' },
  { label: 'Pagos', description: 'Estado de pagos confirmados y pendientes', href: '/tienda-online/reportes/pagos', icon: CreditCard, permission: 'store_reports.payments' },
  { label: 'Liquidaciones', description: 'Cortes de cobros activos y anulados', href: '/tienda-online/reportes/liquidaciones', icon: ScrollText, permission: 'store_reports.settlements' },
  { label: 'Entregas', description: 'Operación logística de mensajería', href: '/tienda-online/reportes/entregas', icon: Truck, permission: 'store_reports.deliveries' },
  { label: 'Productos', description: 'Rendimiento de productos vendidos', href: '/tienda-online/reportes/productos', icon: Package, permission: 'store_reports.products' },
  { label: 'Clientes compradores', description: 'Clientes con pedidos en tienda online', href: '/tienda-online/reportes/clientes', icon: Users, permission: 'store_reports.customers' },
];

export default function ReportNav({ permissions, activeHref }: { permissions: string[] | undefined; activeHref?: string }) {
  const visible = REPORT_LINKS.filter((link) => permissions?.includes(link.permission));

  return (
    <div className="report-nav-grid">
      {visible.map((link) => {
        const Icon = link.icon;
        const isActive = link.href === activeHref;
        return (
          <a className={`report-nav-card${isActive ? ' active' : ''}`} href={link.href} key={link.href}>
            <Icon size={20} />
            <div>
              <strong>{link.label}</strong>
              <small>{link.description}</small>
            </div>
          </a>
        );
      })}
      {visible.length === 0 ? <p className="muted-copy"><FileBarChart size={16} /> No tienes permisos para ver reportes específicos.</p> : null}
    </div>
  );
}
