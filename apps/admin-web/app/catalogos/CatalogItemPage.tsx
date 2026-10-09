'use client';

import { ArrowLeft, Boxes, Image, Pencil, Save, Share2, Upload } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import ImageCropModal from '../components/ImageCropModal';
import { absoluteMediaUrl, adminApiRequest, fetchImageAsFile, getErrorText } from '../lib/adminApi';
import { formatDate } from '../lib/format';
import type { CatalogPageConfig } from './catalogConfigs';

const socialNetworks = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu-marca' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu-marca' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@tu-marca' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/tu-marca' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/502...' },
  { key: 'website', label: 'Página web', placeholder: 'https://www.tu-marca.com' },
] as const;

type SocialNetworkKey = (typeof socialNetworks)[number]['key'];
type SocialLinksForm = Record<SocialNetworkKey, { url: string; active: boolean }>;

type CatalogItemRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  cardImageUrl?: string | null;
  allowsSubcatalog?: boolean;
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parentItemId?: string | null;
  parentItem?: {
    id: string;
    code: string;
    name: string;
    catalog?: { code: string; name: string };
  } | null;
  socialLinks?: Partial<Record<SocialNetworkKey, { url?: string | null; active?: boolean }>> | null;
};

type CatalogRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  items: CatalogItemRow[];
};

type ItemForm = {
  code: string;
  name: string;
  description: string;
  allowsSubcatalog: boolean;
  parentItemId: string;
  sortOrder: string;
  socialLinks: SocialLinksForm;
};

type Mode = 'create' | 'view' | 'edit';

const emptyItemForm: ItemForm = {
  code: '',
  name: '',
  description: '',
  allowsSubcatalog: false,
  parentItemId: '',
  sortOrder: '0',
  socialLinks: emptySocialLinks(),
};

export default function CatalogItemPage({ config, itemId, mode }: { config: CatalogPageConfig; itemId?: string; mode: Mode }) {
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow | null>(null);
  const [item, setItem] = useState<CatalogItemRow | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyItemForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadCatalogs();
  }, [config.code, itemId]);

  const allItems = useMemo(() => catalogs.flatMap((row) => row.items), [catalogs]);
  const itemRelations = useMemo(() => buildRelations(allItems), [allItems]);
  const parentOptions = useMemo(() => {
    if (!config.parentCatalogCode) return [];
    return catalogs
      .find((row) => row.code === config.parentCatalogCode)
      ?.items
      .filter((row) => row.isActive || row.id === form.parentItemId) ?? [];
  }, [catalogs, config.parentCatalogCode, form.parentItemId]);

  const readOnly = mode === 'view';
  const pageTitle = mode === 'create'
    ? `Nuevo ${config.itemColumnLabel.toLowerCase()}`
    : mode === 'edit'
      ? `Editar ${config.itemColumnLabel.toLowerCase()}`
      : `Detalle de ${config.itemColumnLabel.toLowerCase()}`;

  async function loadCatalogs() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [currentCatalog, parentCatalog] = await Promise.all([
        adminApiRequest<CatalogRow>(`/catalogs/${config.code}?includeInactive=true`),
        config.parentCatalogCode
          ? adminApiRequest<CatalogRow>(`/catalogs/${config.parentCatalogCode}?includeInactive=true`)
          : Promise.resolve(null),
      ]);
      const result = parentCatalog ? [currentCatalog, parentCatalog] : [currentCatalog];
      const currentItem = itemId
        ? currentCatalog?.items.find((row) => row.id === itemId)
          ?? null
        : null;

      setCatalogs(result);
      setCatalog(currentCatalog);
      setItem(currentItem);
      setForm(currentItem ? formFromItem(currentItem) : emptyItemForm);

      if (!currentCatalog) {
        setMessage({ type: 'error', text: 'Catalogo no encontrado. Revisa la data inicial.' });
      } else if (itemId && !currentItem) {
        setMessage({ type: 'error', text: 'Registro no encontrado.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el registro.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog || readOnly) return;

    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      code: form.code,
      name: form.name,
      description: config.showDescription ? form.description || null : undefined,
      allowsSubcatalog: config.showAllowsSubcatalog ? form.allowsSubcatalog : undefined,
      parentItemId: config.parentCatalogCode ? form.parentItemId || null : undefined,
      sortOrder: Number(form.sortOrder || 0),
      socialLinks: config.showSocialLinks ? form.socialLinks : undefined,
    };

    try {
      if (mode === 'edit' && item) {
        await adminApiRequest(`/catalogs/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        window.location.href = `${config.basePath}/${item.id}`;
      } else {
        await adminApiRequest(`/catalogs/${catalog.code}/items`, {
          method: 'POST',
          body: JSON.stringify({ ...payload, parentItemId: payload.parentItemId || undefined }),
        });
        window.location.href = config.basePath;
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, mode === 'edit' ? 'No se pudo actualizar el registro.' : 'No se pudo crear el registro.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function onCardImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadCardImage(file: File) {
    if (!item) return;

    setIsUploadingImage(true);
    setMessage(null);

    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await adminApiRequest('/media/brands/card-image', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'BRAND_CARD_IMAGE',
          filename: file.name,
          mimeType: file.type,
          dataBase64,
          catalogItemId: item.id,
        }),
      });

      setMessage({ type: 'success', text: 'Imagen de tarjeta guardada correctamente.' });
      void loadCatalogs();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo subir la imagen.') });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <AdminRoutedShell title={`Catalogos / ${config.title}`}>
      <div className="brand-form-page">
        <header className="brand-form-heading">
          <div><h1>{pageTitle}</h1><p>{config.description}</p></div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a className="brand-back-button" href={config.basePath}><ArrowLeft size={17} />Volver a tabla</a>
            {mode === 'view' && item ? (
              <a className="admin-primary" href={`${config.basePath}/${item.id}/editar`}><Pencil size={16} />Editar</a>
            ) : null}
          </div>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <form className="brand-form" onSubmit={(event) => void saveItem(event)}>
          <section className="brand-form-card">
            <header className="brand-card-title">
              <span><Boxes size={18} /></span>
              <div>
                <h2>{mode === 'create' ? 'Información del registro' : item?.code ?? 'Registro'}</h2>
                <p>{mode === 'create' ? `Agrega un registro al catálogo ${config.title}.` : config.itemLabel}</p>
              </div>
              {item ? <span className={item.isActive ? 'badge green' : 'badge red'} style={{ marginLeft: 'auto' }}>{item.isActive ? 'Activo' : 'Inactivo'}</span> : null}
            </header>
            <div className="brand-general-grid">
              <label>Código <b>*</b><input disabled={readOnly} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/\s+/g, '_') })} placeholder="CODIGO" /></label>
              <label>{config.itemColumnLabel} <b>*</b><input disabled={readOnly} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre visible" /></label>
              {config.parentCatalogCode ? (
                <label>{config.parentLabel} <b>*</b>
                  <select disabled={readOnly} required value={form.parentItemId} onChange={(event) => setForm({ ...form, parentItemId: event.target.value })}>
                    <option value="">Selecciona una opcion</option>
                    {parentOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </label>
              ) : null}
              {config.showDescription ? (
                <label>Descripción<input disabled={readOnly} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descripcion del registro" /></label>
              ) : null}
              {!config.hideSortOrder ? (
                <label>Orden<input disabled={readOnly} min={0} max={9999} type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
              ) : null}
            </div>
            {config.showAllowsSubcatalog ? (
              <div className="form-options-row">
                <label className="form-option-card"><input checked={form.allowsSubcatalog} disabled={readOnly} onChange={(event) => setForm({ ...form, allowsSubcatalog: event.target.checked })} type="checkbox" /><span><strong>Permite subcatálogo</strong><small>Habilita registros hijos dentro de este elemento.</small></span></label>
              </div>
            ) : null}
          </section>

          {config.showCardImage && item ? (
            <section className="brand-form-card">
              <header className="brand-card-title"><span><Image size={18} /></span><div><h2>Imagen de tarjeta</h2><p>Imagen que identificará la marca en el catálogo del cliente.</p></div></header>
              <div className="brand-general-grid reward-image-grid">
                <label className="brand-upload-field">Imagen de tarjeta</label>
                <div className="reward-image-row">
                  {item.cardImageUrl ? (
                    <figure className="reward-image-preview">
                      <img alt="Tarjeta de marca" src={absoluteMediaUrl(item.cardImageUrl)} />
                      <figcaption>Imagen actual</figcaption>
                      {!readOnly ? (
                        <button className="brand-file-button" disabled={isUploadingImage} type="button" onClick={async () => { try { setCropFile(await fetchImageAsFile(item.cardImageUrl as string, 'tarjeta.png')); } catch (error) { setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la imagen para reencuadrar.') }); } }}>Ajustar encuadre</button>
                      ) : null}
                    </figure>
                  ) : null}
                  <div className="brand-upload-zone">
                    <input ref={fileInputRef} accept="image/jpeg,image/png,image/webp" disabled={isUploadingImage} type="file" onChange={onCardImageSelected} />
                    <span className="brand-upload-icon"><Upload size={23} /></span>
                    <div><p>Selecciona una imagen para {item.cardImageUrl ? 'reemplazar la actual' : 'la tarjeta'}</p><small>600 × 378 px (1.586:1) · JPG, PNG o WEBP · máx. 10 MB</small></div>
                    <button className="brand-file-button" disabled={isUploadingImage} type="button" onClick={() => fileInputRef.current?.click()}>{isUploadingImage ? 'Subiendo…' : item.cardImageUrl ? 'Cambiar imagen' : 'Subir imagen'}</button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {config.showSocialLinks ? (
            <section className="brand-form-card">
              <header className="brand-card-title"><span><Share2 size={18} /></span><div><h2>Redes sociales</h2><p>Configura los enlaces que verá el cliente en el inicio de la PWA.</p></div></header>
              <div className="catalog-social-links-grid">
                {socialNetworks.map((network) => (
                  <div className="catalog-social-link-row" key={network.key}>
                    <label className="catalog-social-switch">
                      <input
                        checked={form.socialLinks[network.key].active}
                        disabled={readOnly}
                        onChange={(event) => setForm({
                          ...form,
                          socialLinks: {
                            ...form.socialLinks,
                            [network.key]: { ...form.socialLinks[network.key], active: event.target.checked },
                          },
                        })}
                        type="checkbox"
                      />
                      {network.label}
                    </label>
                    <input
                      disabled={readOnly}
                      type="url"
                      value={form.socialLinks[network.key].url}
                      onChange={(event) => setForm({
                        ...form,
                        socialLinks: {
                          ...form.socialLinks,
                          [network.key]: { ...form.socialLinks[network.key], url: event.target.value },
                        },
                      })}
                      placeholder={network.placeholder}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {item ? (
            <div className="catalog-readonly-meta">
              <span>Creado: {formatDate(item.createdAt)}</span>
              <span>Actualizado: {formatDate(item.updatedAt)}</span>
              {parentLabel(item, itemRelations) ? <span>{config.parentLabel ?? 'Padre'}: {parentLabel(item, itemRelations)}</span> : null}
            </div>
          ) : null}

          {!readOnly ? (
            <footer className="brand-form-actions">
              <button className="primary" disabled={isSubmitting || isLoading || !form.code || !form.name || (Boolean(config.parentCatalogCode) && !form.parentItemId)} type="submit">
                <Save size={16} />
                {mode === 'edit' ? 'Guardar cambios' : 'Crear registro'}
              </button>
            </footer>
          ) : null}
        </form>
      </div>
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          aspect={1.586}
          title="Ajusta la imagen de la tarjeta"
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => { setCropFile(null); void uploadCardImage(cropped); }}
        />
      ) : null}
    </AdminRoutedShell>
  );
}

function buildRelations(items: CatalogItemRow[]) {
  return new Map(items.map((row) => [row.id, row]));
}

function parentLabel(item: CatalogItemRow, relations: Map<string, CatalogItemRow>) {
  if (item.parentItem?.name) return item.parentItem.name;
  if (!item.parentItemId) return null;

  return relations.get(item.parentItemId)?.name ?? null;
}

function formFromItem(item: CatalogItemRow): ItemForm {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    allowsSubcatalog: Boolean(item.allowsSubcatalog),
    parentItemId: item.parentItemId ?? '',
    sortOrder: String(item.sortOrder ?? 0),
    socialLinks: socialLinksFromItem(item.socialLinks),
  };
}

function emptySocialLinks(): SocialLinksForm {
  return socialNetworks.reduce((links, network) => {
    links[network.key] = { url: '', active: false };
    return links;
  }, {} as SocialLinksForm);
}

function socialLinksFromItem(value: CatalogItemRow['socialLinks']): SocialLinksForm {
  const links = emptySocialLinks();
  if (!value) return links;

  for (const network of socialNetworks) {
    const item = value[network.key];
    links[network.key] = {
      url: typeof item?.url === 'string' ? item.url : '',
      active: item?.active === true,
    };
  }

  return links;
}
