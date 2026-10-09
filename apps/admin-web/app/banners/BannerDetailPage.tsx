'use client';

import { ArrowLeft, Calendar, Image, Link as LinkIcon, Megaphone, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { absoluteMediaUrl, adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate, formatNumber } from '../lib/format';

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
type BannerPlacement = 'LOYALTY' | 'STORE';

type MarketingBannerDetail = {
  id: string;
  title: string;
  imageUrl?: string | null;
  ctaUrl?: string | null;
  status?: BannerStatus;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  sortOrder: number;
  placement?: BannerPlacement;
  totalViews?: number;
  totalClicks?: number;
  lastViewAt?: string | null;
  lastClickAt?: string | null;
  createdAt: string;
  updatedAt: string;
  audienceType?: 'ALL' | 'BRANDS';
  targetBrands?: Array<{ brandId: string; brand: { id: string; name: string } }>;
};

function audienceLabel(banner: MarketingBannerDetail) {
  if (banner.placement === 'STORE') return 'Tienda online';
  if (banner.audienceType !== 'BRANDS') return 'Todas las marcas';
  return banner.targetBrands?.map((target) => target.brand.name).join(', ') || 'Sin marcas seleccionadas';
}

const statusLabels: Record<BannerStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  DRAFT: 'Borrador',
};

function getBannerStatus(banner: MarketingBannerDetail): BannerStatus {
  if (banner.status) return banner.status;
  return banner.isActive ? 'ACTIVE' : 'INACTIVE';
}

function badgeClass(status: BannerStatus) {
  if (status === 'ACTIVE') return 'green';
  if (status === 'DRAFT') return 'amber';
  return 'red';
}

function ctr(totalViews = 0, totalClicks = 0) {
  if (!totalViews) return '0%';
  return `${((totalClicks / totalViews) * 100).toFixed(1)}%`;
}

export default function BannerDetailPage({
  bannerId,
  basePath = '/banners',
  shellTitle = 'Banners',
}: {
  bannerId: string;
  basePath?: string;
  shellTitle?: string;
}) {
  const [banner, setBanner] = useState<MarketingBannerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadBanner();
  }, [bannerId]);

  async function loadBanner() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<MarketingBannerDetail>(`/marketing-banners/${bannerId}`);
      setBanner(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el banner.') });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminRoutedShell title={shellTitle}>
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Regresar" className="customer-back-button" href={basePath}>
              <ArrowLeft size={20} />
            </a>
            <div>
              <h2>Ver banner</h2>
              <p>Consulta informacion, publicacion y rendimiento.</p>
            </div>
          </div>
          {banner ? (
            <div className="customer-profile-actions">
              <a className="admin-primary compact-action" href={`${basePath}/${banner.id}/editar`}><Pencil size={15} /> Editar banner</a>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando banner...</div> : null}

        {banner ? (
          <>
            <section className="customer-profile-hero banner-detail-hero">
              <div className="customer-avatar-large">
                {banner.imageUrl ? <img alt="" src={absoluteMediaUrl(banner.imageUrl)} /> : <Megaphone size={58} />}
              </div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>{banner.title}</h3>
                  <span className={`badge ${badgeClass(getBannerStatus(banner))}`}>{statusLabels[getBannerStatus(banner)]}</span>
                </div>
                <div className="customer-profile-info-grid">
                  <span><Calendar size={15} /> Inicio {formatDate(banner.startsAt)}</span>
                  <span><Calendar size={15} /> Fin {banner.endsAt ? formatDate(banner.endsAt) : '-'}</span>
                  <span><Megaphone size={15} /> Orden {formatNumber(banner.sortOrder)}</span>
                  <span><LinkIcon size={15} /> {banner.ctaUrl || 'Sin URL de destino'}</span>
                </div>
              </div>
            </section>

            <section className="customer-history-layout">
              <article className="customer-history-panel">
                <h3>Informacion general</h3>
                <table>
                  <tbody>
                    <tr><td>Titulo</td><td>{banner.title}</td></tr>
                    <tr><td>Estado</td><td>{statusLabels[getBannerStatus(banner)]}</td></tr>
                    <tr><td>Creado</td><td>{formatDate(banner.createdAt)}</td></tr>
                    <tr><td>Actualizado</td><td>{formatDate(banner.updatedAt)}</td></tr>
                  </tbody>
                </table>
              </article>
              <article className="customer-history-panel">
                <h3>Configuracion de publicacion</h3>
                <table>
                  <tbody>
                    <tr><td>Fecha inicio</td><td>{formatDate(banner.startsAt)}</td></tr>
                    <tr><td>Fecha fin</td><td>{banner.endsAt ? formatDate(banner.endsAt) : '-'}</td></tr>
                    <tr><td>Numero de orden</td><td>{formatNumber(banner.sortOrder)}</td></tr>
                    <tr><td>Audiencia</td><td>{audienceLabel(banner)}</td></tr>
                    <tr><td>URL de destino</td><td>{banner.ctaUrl || '-'}</td></tr>
                  </tbody>
                </table>
              </article>
              <article className="customer-history-panel">
                <h3>Imagen del banner</h3>
                {banner.imageUrl ? <img alt="" className="reward-detail-image" src={absoluteMediaUrl(banner.imageUrl)} /> : <p className="muted-copy">No hay imagen asignada.</p>}
              </article>
              <article className="customer-history-panel">
                <h3>Rendimiento del banner</h3>
                <table>
                  <tbody>
                    <tr><td>Visualizaciones totales</td><td>{formatNumber(banner.totalViews ?? 0)}</td></tr>
                    <tr><td>Clics totales</td><td>{formatNumber(banner.totalClicks ?? 0)}</td></tr>
                    <tr><td>CTR</td><td>{ctr(banner.totalViews, banner.totalClicks)}</td></tr>
                    <tr><td>Ultima visualizacion</td><td>{banner.lastViewAt ? formatDate(banner.lastViewAt) : '-'}</td></tr>
                    <tr><td>Ultimo clic</td><td>{banner.lastClickAt ? formatDate(banner.lastClickAt) : '-'}</td></tr>
                  </tbody>
                </table>
              </article>
            </section>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}
