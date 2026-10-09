'use client';

import {
  BarChart3,
  Banknote,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Database,
  Gift,
  Home,
  LogOut,
  Menu,
  Megaphone,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  UserCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import AdminSidebarController from '../AdminSidebarController';
import { absoluteMediaUrl, adminApiRequest, clearAdminSession, getStoredAdminUser, hasAdminSession, StoredAdminUser } from '../lib/adminApi';
import { resolveNotificationTarget } from '../lib/notificationLinks';

type InboxNotification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: { redemptionRequestId?: string; bannerId?: string; productId?: string } | null;
};

const MIN_ROUTE_LOADER_MS = 1400;

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  permissions?: string[];
  children?: Array<{
    label: string;
    href: string;
    permissions?: string[];
    children?: Array<{ label: string; href: string; permissions?: string[] }>;
  }>;
};

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Gestion Empresarial',
    items: [
      { label: 'Dashboard', icon: Home, href: '/dashboard', permissions: ['reports.read'] },
      { label: 'Clientes', icon: Users, href: '/clientes', permissions: ['customers.read'] },
      { label: 'Banners', icon: Megaphone, href: '/banners', permissions: ['marketing.read'] },
      {
        label: 'Gestion de Lealtad',
        icon: Gift,
        href: '/lealtad',
        permissions: ['redeemable_products.read', 'redemption_requests.read'],
        children: [
          { label: 'Productos Canjeables', href: '/premios', permissions: ['redeemable_products.read'] },
          { label: 'Solicitudes de Canje', href: '/canjes', permissions: ['redemption_requests.read'] },
          { label: 'Canjear Puntos', href: '/canjes/manual', permissions: ['redemption_requests.redeem_points'] },
        ],
      },
    ],
  },
  {
    title: 'Tienda',
    items: [
      { label: 'Registro de Facturas', icon: Receipt, href: '/tienda/registro-facturas', permissions: ['purchases.create', 'purchases.read'] },
      { label: 'Canjes de mi Tienda', icon: Gift, href: '/tienda/canjes', permissions: ['redemption_requests.read'] },
    ],
  },
  {
    title: 'Tienda Online',
    items: [
      { label: 'Marcas', icon: Tag, href: '/tienda-online/marcas', permissions: ['store_brands.read'] },
      { label: 'Productos', icon: ShoppingBag, href: '/tienda-online/productos', permissions: ['store_products.read'] },
      { label: 'Banners', icon: Megaphone, href: '/tienda-online/banners', permissions: ['marketing.read'] },
      { label: 'Pedidos', icon: ClipboardList, href: '/tienda-online/pedidos', permissions: ['store_orders.read'] },
      { label: 'Agenda de Entregas', icon: CalendarDays, href: '/tienda-online/agenda-entregas', permissions: ['store_delivery_schedule.read'] },
      { label: 'Mensajeros', icon: UserCircle, href: '/tienda-online/mensajeros', permissions: ['store_drivers.read'] },
      { label: 'Liquidación de Cobros', icon: Banknote, href: '/tienda-online/liquidaciones-cobros', permissions: ['store_payment_settlements.read'] },
      { label: 'Reportes', icon: BarChart3, href: '/tienda-online/reportes', permissions: ['store_reports.read'] },
    ],
  },
  {
    title: 'Configuracion',
    items: [
      { label: 'Usuarios', icon: Users, href: '/usuarios', permissions: ['users.read'] },
      { label: 'Transacciones', icon: Database, href: '/transacciones', permissions: ['purchases.read'] },
      { label: 'Reportes', icon: BarChart3, href: '/reportes', permissions: ['reports.read'] },
      { label: 'Notificaciones', icon: Bell, href: '/notificaciones', permissions: ['notifications.read'] },
      {
        label: 'Catalogos',
        icon: Database,
        href: '/catalogos',
        permissions: ['catalogs.read'],
        children: [
          { label: 'Pais', href: '/catalogos/pais', permissions: ['catalogs.read'] },
          { label: 'Departamentos', href: '/catalogos/departamentos', permissions: ['catalogs.read'] },
          { label: 'Municipios', href: '/catalogos/municipios', permissions: ['catalogs.read'] },
          { label: 'Roles', href: '/catalogos/roles', permissions: ['roles.read'] },
          { label: 'Tiendas', href: '/catalogos/tiendas', permissions: ['stores.read'] },
          { label: 'Marcas', href: '/catalogos/marca', permissions: ['catalogs.read'] },
        ],
      },
      {
        label: 'Parametros',
        icon: Settings,
        href: '/parametros',
        permissions: ['settings.read'],
        children: [
          { label: 'Puntos', href: '/parametros/puntos', permissions: ['settings.read'] },
          { label: 'Niveles de clientes', href: '/parametros/niveles', permissions: ['settings.read'] },
          { label: 'Promociones', href: '/parametros/promociones', permissions: ['settings.read'] },
        ],
      },
      { label: 'Auditoria', icon: ShieldCheck, href: '/audit', permissions: ['audit.read'] },
    ],
  },
];

function initials(name?: string) {
  if (!name) return 'AD';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';
}

function firstName(name?: string) {
  return name?.split(' ')[0] || 'Administrador';
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasAnyPermission(userPermissions: string[] | undefined, requiredPermissions?: string[]) {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  if (!userPermissions || userPermissions.length === 0) return false;

  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

function filterNavSections(sections: typeof navSections, userPermissions: string[] | undefined) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({
          ...item,
          children: item.children
            ?.map((child) => ({
              ...child,
              children: child.children?.filter((grandChild) => hasAnyPermission(userPermissions, grandChild.permissions)),
            }))
            .filter((child) => hasAnyPermission(userPermissions, child.permissions) || Boolean(child.children?.length)),
        }))
        .filter((item) => hasAnyPermission(userPermissions, item.permissions) || Boolean(item.children?.length)),
    }))
    .filter((section) => section.items.length > 0);
}

export default function AdminAppShell({
  title,
  children,
  hideSidebar = false,
  headerContent,
  showSearch = false,
}: {
  title: string;
  children: ReactNode;
  hideSidebar?: boolean;
  headerContent?: ReactNode;
  showSearch?: boolean;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [hasSession, setHasSession] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [openNavGroups, setOpenNavGroups] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [inboxNotifications, setInboxNotifications] = useState<InboxNotification[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoaderStartedAtRef = useRef(0);
  const routeLoaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (routeLoaderTimerRef.current) {
      clearTimeout(routeLoaderTimerRef.current);
      routeLoaderTimerRef.current = null;
    }

    const elapsed = Date.now() - routeLoaderStartedAtRef.current;
    const remaining = Math.max(MIN_ROUTE_LOADER_MS - elapsed, 0);
    if (routeLoaderStartedAtRef.current > 0 && remaining > 0) {
      routeLoaderTimerRef.current = setTimeout(() => {
        setIsRouteLoading(false);
        routeLoaderStartedAtRef.current = 0;
        routeLoaderTimerRef.current = null;
      }, remaining);
    } else {
      setIsRouteLoading(false);
      routeLoaderStartedAtRef.current = 0;
    }

    setIsAccountMenuOpen(false);
    setIsNotificationsOpen(false);

    return () => {
      if (routeLoaderTimerRef.current) {
        clearTimeout(routeLoaderTimerRef.current);
        routeLoaderTimerRef.current = null;
      }
    };
  }, [pathname]);

  useEffect(() => {
    const storedUser = getStoredAdminUser();
    setUser(storedUser);
    setHasSession(Boolean(storedUser && hasAdminSession()));
    setIsSessionReady(true);

    const syncUser = (event: Event) => {
      const nextUser = (event as CustomEvent<StoredAdminUser>).detail ?? getStoredAdminUser();
      setUser(nextUser);
      setHasSession(Boolean(nextUser && hasAdminSession()));
    };

    window.addEventListener('adminUserUpdated', syncUser);

    return () => {
      window.removeEventListener('adminUserUpdated', syncUser);
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !accountMenuRef.current?.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !notificationsMenuRef.current?.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    const closeNavGroups = () => setOpenNavGroups([]);

    window.addEventListener('adminSidebarClosed', closeNavGroups);

    return () => {
      window.removeEventListener('adminSidebarClosed', closeNavGroups);
    };
  }, []);

  useEffect(() => {
    if (!hasSession) return undefined;

    let isCancelled = false;

    const loadUnreadCount = async () => {
      try {
        const result = await adminApiRequest<{ count: number }>('/notifications/internal/unread-count');
        if (!isCancelled) {
          setUnreadCount(result.count);
        }
      } catch {
        // Ignorar errores de polling de notificaciones.
      }
    };

    void loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [hasSession]);

  async function toggleNotifications() {
    const willOpen = !isNotificationsOpen;
    setIsNotificationsOpen(willOpen);
    if (!willOpen) return;

    setIsLoadingInbox(true);
    try {
      const result = await adminApiRequest<InboxNotification[]>('/notifications/internal');
      setInboxNotifications(result);
    } catch {
      setInboxNotifications([]);
    } finally {
      setIsLoadingInbox(false);
    }
  }

  async function openNotification(notification: InboxNotification) {
    setIsNotificationsOpen(false);
    if (!notification.isRead) {
      try {
        await adminApiRequest(`/notifications/${notification.id}/internal/read`, { method: 'POST' });
        setUnreadCount((value) => Math.max(0, value - 1));
      } catch {
        // Si falla marcar como leida, igual navegamos al detalle.
      }
    }
    const target = resolveNotificationTarget(notification.metadata);
    if (target) router.push(target);
  }

  const unreadInbox = inboxNotifications.filter((notification) => !notification.isRead);
  const visibleInbox = (unreadInbox.length > 0 ? unreadInbox : inboxNotifications).slice(0, 3);

  const logout = async () => {
    try {
      await adminApiRequest('/auth/internal/logout', { method: 'POST' });
    } catch {
      // La salida local debe funcionar incluso si el token ya vencio.
    }

    clearAdminSession();
    window.location.href = '/';
  };

  const visibleNavSections = filterNavSections(navSections, user?.permissions);

  function startRouteLoading(targetHref: string) {
    if (targetHref !== pathname) {
      routeLoaderStartedAtRef.current = Date.now();
      setIsRouteLoading(true);
    }
  }

  const toggleSidebar = () => {
    const nextIsOpen = !document.body.classList.contains('admin-sidebar-open');
    document.body.classList.toggle('admin-sidebar-open', nextIsOpen);
    document.querySelector<HTMLButtonElement>('button[aria-label="Abrir menu"]')?.setAttribute('aria-expanded', String(nextIsOpen));
    if (!nextIsOpen) {
      setOpenNavGroups([]);
    }
  };

  const toggleNavGroup = (href: string) => {
    setOpenNavGroups((current) => (current.includes(href) ? current.filter((item) => item !== href) : [...current, href]));
  };

  if (!isSessionReady) {
    return (
      <main className="admin-shell">
        <section className="workspace">
          <header className="topbar">
            <div className="title-row">
              <button className="icon-button" aria-expanded="false" aria-label="Abrir menu" type="button">
                <Menu size={24} />
              </button>
              <div>
                <h1>{title}</h1>
                <p>Cargando sesion</p>
              </div>
            </div>
          </header>
          <div className="content">{children}</div>
        </section>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="admin-shell">
        <section className="workspace">
          <header className="topbar">
            <div className="title-row">
              <div>
                <h1>{title}</h1>
                <p>Sesion requerida</p>
              </div>
            </div>
          </header>
          <div className="content">
            <section className="panel">
              <h2>Necesitas iniciar sesion</h2>
              <p className="muted-copy">Ingresa primero al panel administrativo para cargar tus permisos y datos de sesion.</p>
              <div className="form-actions">
                <Link className="admin-primary" href="/">Ir al login</Link>
              </div>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {hideSidebar ? null : <AdminSidebarController />}
      <main className={`admin-shell routed-admin-shell${hideSidebar ? ' admin-shell-no-sidebar' : ''}`}>
        {hideSidebar ? null : <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark logo-mark">
              <img src="/images/brand/loyalty-logo.png" alt="Sistema de Lealtad" />
            </div>
            <div>
              <strong>Sistema de Lealtad</strong>
              <span>Panel Administrativo</span>
            </div>
          </div>

          {visibleNavSections.map((section) => (
            <nav className="nav-section" key={section.title}>
              <span>{section.title}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isChildActive = item.children?.some((child) => child.children?.some((grandChild) => isActivePath(pathname, grandChild.href)) || isActivePath(pathname, child.href)) ?? false;
                const isActive = isChildActive || isActivePath(pathname, item.href);
                const isOpen = openNavGroups.includes(item.href);

                if (item.children) {
                  return (
                    <div className="nav-item-group" key={item.href}>
                      <button
                        aria-expanded={isOpen}
                        className={`nav-item nav-item-toggle${isActive ? ' active' : ''}`}
                        onClick={() => toggleNavGroup(item.href)}
                        type="button"
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                        <ChevronDown className="nav-item-chevron" size={16} />
                      </button>
                      {isOpen ? (
                        <div className="nav-subitems">
                          {item.children.map((child) => {
                            const childIsActive = child.children?.some((grandChild) => isActivePath(pathname, grandChild.href)) || isActivePath(pathname, child.href);

                            return (
                              <div className="nav-subitem-group" key={child.href}>
                                <Link className={`nav-subitem${childIsActive ? ' active' : ''}`} href={child.href} onClick={() => startRouteLoading(child.href)}>
                                  {child.label}
                                </Link>
                                {child.children ? (
                                  <div className="nav-nested-subitems">
                                    {child.children.map((grandChild) => (
                                      <Link className={`nav-subitem nav-subitem-nested${isActivePath(pathname, grandChild.href) ? ' active' : ''}`} href={grandChild.href} key={grandChild.href} onClick={() => startRouteLoading(grandChild.href)}>
                                        {grandChild.label}
                                      </Link>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div className="nav-item-group" key={item.href}>
                    <Link className={`nav-item${isActive ? ' active' : ''}`} href={item.href} onClick={() => startRouteLoading(item.href)}>
                      <Icon size={20} />
                      {item.label}
                    </Link>
                  </div>
                );
              })}
            </nav>
          ))}
        </aside>}

        <section className="workspace">
          <header className="topbar">
            <div className="title-row">
              {hideSidebar ? null : (
                <button className="icon-button" aria-expanded="false" aria-label="Abrir menu" onClick={toggleSidebar} type="button">
                  <Menu size={24} />
                </button>
              )}
              <div>{headerContent ?? <h1>{title}</h1>}</div>
            </div>
            <div className="account-area">
              {showSearch ? (
                <button aria-label="Buscar" className="brand-header-search" type="button">
                  <Search size={21} />
                </button>
              ) : null}
              <div className="notification-menu-wrap" ref={notificationsMenuRef}>
                <button
                  aria-expanded={isNotificationsOpen}
                  aria-label="Notificaciones"
                  className="notification"
                  onClick={() => void toggleNotifications()}
                  type="button"
                >
                  <Bell size={22} />
                  {unreadCount > 0 ? (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  ) : null}
                </button>
                {isNotificationsOpen ? (
                  <div className="notification-menu">
                    <header className="notification-menu-header">
                      <strong>Notificaciones</strong>
                      <span>{unreadInbox.length > 0 ? `${unreadInbox.length} sin leer` : 'Al dia'}</span>
                    </header>
                    {isLoadingInbox ? (
                      <p className="notification-menu-empty">Cargando...</p>
                    ) : visibleInbox.length === 0 ? (
                      <p className="notification-menu-empty">No tienes notificaciones todavia.</p>
                    ) : (
                      <ul className="notification-menu-list">
                        {visibleInbox.map((notification) => (
                          <li key={notification.id}>
                            <button
                              className={notification.isRead ? 'read' : 'unread'}
                              onClick={() => void openNotification(notification)}
                              type="button"
                            >
                              <strong>{notification.title}</strong>
                              <span>{notification.body}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link className="notification-menu-footer" href="/notificaciones/recibidas" onClick={() => startRouteLoading('/notificaciones/recibidas')}>
                      Ver mas
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="account-menu-wrap" ref={accountMenuRef}>
                <button
                  aria-expanded={isAccountMenuOpen}
                  aria-label="Abrir menu de usuario"
                  className="account-menu-trigger"
                  onClick={() => setIsAccountMenuOpen((value) => !value)}
                  type="button"
                >
                  <span className="avatar">
                    {user?.profilePhotoUrl ? <img alt="" src={absoluteMediaUrl(user.profilePhotoUrl)} /> : initials(user?.fullName)}
                  </span>
                  <span className="account-copy">
                    <strong>{user?.fullName || 'Administrador'}</strong>
                    <small>{user?.email || user?.roles?.join(', ') || 'Administrador'}</small>
                  </span>
                  <ChevronDown size={18} />
                </button>
                {isAccountMenuOpen ? (
                  <div className="account-menu">
                    <Link href="/mi-perfil" onClick={() => startRouteLoading('/mi-perfil')}>
                      <UserCircle size={17} />
                      Ver perfil
                    </Link>
                    <button onClick={() => void logout()} type="button">
                      <LogOut size={17} />
                      Cerrar sesion
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="content">
            {isRouteLoading ? (
              <div className="admin-route-loader" role="status" aria-live="polite">
                <img alt="" className="admin-route-loader-logo" src="/images/brand/loyalty-logo.png" />
                <span>Cargando pantalla...</span>
              </div>
            ) : null}
            {children}
          </div>
        </section>
      </main>
    </>
  );
}
