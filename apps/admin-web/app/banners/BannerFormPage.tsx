'use client';

import { ArrowLeft, CloudUpload, Image, Info, Save, Users } from 'lucide-react';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import ImageCropModal from '../components/ImageCropModal';
import { absoluteMediaUrl, adminApiRequest, fetchImageAsFile, getErrorText, readFileAsBase64 } from '../lib/adminApi';

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
type BannerAudience = 'ALL' | 'BRANDS';
type BannerPlacement = 'LOYALTY' | 'STORE';
type BrandOption = { id: string; code: string; name: string; isActive: boolean };
type Banner = {
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
  audienceType?: BannerAudience;
  targetBrands?: Array<{ brandId: string; brand: BrandOption }>;
};

type BannerForm = {
  title: string;
  ctaUrl: string;
  status: BannerStatus;
  startsAt: string;
  endsAt: string;
  sortOrder: string;
  audienceType: BannerAudience;
  targetBrandIds: string[];
};

function emptyForm(): BannerForm {
  return {
    title: '',
    ctaUrl: '',
    status: 'ACTIVE',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: '',
    sortOrder: '1',
    audienceType: 'ALL',
    targetBrandIds: [],
  };
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function statusOf(banner: Banner): BannerStatus {
  return banner.status ?? (banner.isActive ? 'ACTIVE' : 'INACTIVE');
}

function formFromBanner(banner: Banner): BannerForm {
  return {
    title: banner.title,
    ctaUrl: banner.ctaUrl ?? '',
    status: statusOf(banner),
    startsAt: toDateInput(banner.startsAt),
    endsAt: toDateInput(banner.endsAt),
    sortOrder: String(banner.sortOrder || 1),
    audienceType: banner.audienceType ?? 'ALL',
    targetBrandIds: banner.targetBrands?.map((target) => target.brandId) ?? [],
  };
}

function validUrl(value: string) {
  if (!value || value.startsWith('/')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export default function BannerFormPage({
  mode,
  bannerId,
  basePath = '/banners',
  placement = 'LOYALTY',
  showAudience = true,
  shellTitle = 'Banners',
}: {
  mode: 'create' | 'edit';
  bannerId?: string;
  basePath?: string;
  placement?: BannerPlacement;
  showAudience?: boolean;
  shellTitle?: string;
}) {
  const editing = mode === 'edit';
  const [banner, setBanner] = useState<Banner | null>(null);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [computingOrder, setComputingOrder] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAudience) return;
    adminApiRequest<{ items: BrandOption[] }>('/catalogs/BRANDS')
      .then((catalog) => setBrands(catalog.items.filter((brand) => brand.isActive)))
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las marcas.') }));
  }, [showAudience]);

  useEffect(() => {
    if (!editing || !bannerId) return;
    let cancelled = false;
    setLoading(true);
    adminApiRequest<Banner>(`/marketing-banners/${bannerId}`)
      .then((result) => {
        if (cancelled) return;
        setBanner(result);
        setForm(formFromBanner(result));
      })
      .catch((error) => !cancelled && setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el banner.') }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [editing, bannerId]);

  const targetBrandKey = form.targetBrandIds.join(',');

  useEffect(() => {
    if (editing && !banner) return;
    let cancelled = false;
    setComputingOrder(true);
    const params = new URLSearchParams({ audienceType: showAudience ? form.audienceType : 'ALL', placement });
    if (form.audienceType === 'BRANDS' && form.targetBrandIds.length) {
      params.set('brandIds', form.targetBrandIds.join(','));
    }
    if (editing && bannerId) params.set('excludeId', bannerId);
    adminApiRequest<{ sortOrder: number | null }>(`/marketing-banners/next-sort-order?${params.toString()}`)
      .then((result) => {
        if (cancelled) return;
        setForm((prev) => ({ ...prev, sortOrder: result.sortOrder != null ? String(result.sortOrder) : '' }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setComputingOrder(false); });
    return () => { cancelled = true; };
  }, [form.audienceType, targetBrandKey, editing, bannerId, banner, placement, showAudience]);

  function resetForm() {
    setForm(banner ? formFromBanner(banner) : emptyForm());
    setSelectedFile(null);
    setMessage(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function chooseFile(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Selecciona una imagen PNG, JPG, JPEG o WEBP válida.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no debe superar los 10 MB.' });
      return;
    }
    setMessage(null);
    setCropFile(file);
  }

  useEffect(() => {
    if (!selectedFile) { setFilePreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function reframeBanner() {
    if (!banner?.imageUrl) return;
    try {
      setCropFile(await fetchImageAsFile(banner.imageUrl, 'banner.png'));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la imagen para reencuadrar.') });
    }
  }

  const bannerPreviewUrl = filePreview ?? (banner?.imageUrl ? absoluteMediaUrl(banner.imageUrl) : null);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function uploadImage(file: File) {
    const asset = await adminApiRequest<{ publicUrl: string }>('/media/banners/image', {
      method: 'POST',
      body: JSON.stringify({
        purpose: 'BANNER',
        filename: file.name,
        mimeType: file.type,
        dataBase64: await readFileAsBase64(file),
      }),
    });
    return asset.publicUrl;
  }

  async function save(statusOverride?: BannerStatus) {
    if (!form.title.trim() || !form.startsAt || !form.endsAt) {
      setMessage({ type: 'error', text: 'Completa título y fechas.' });
      return;
    }
    if (!form.sortOrder) {
      setMessage({ type: 'error', text: 'No hay número de orden disponible para esa audiencia (máximo 7 banners activos).' });
      return;
    }
    if (!editing && !selectedFile) {
      setMessage({ type: 'error', text: 'Debe cargar una imagen para guardar el banner.' });
      return;
    }
    if (new Date(`${form.endsAt}T23:59:59`) < new Date(`${form.startsAt}T00:00:00`)) {
      setMessage({ type: 'error', text: 'La fecha fin no puede ser menor que la fecha de inicio.' });
      return;
    }
    if (!validUrl(form.ctaUrl.trim())) {
      setMessage({ type: 'error', text: 'La URL ingresada no tiene un formato válido.' });
      return;
    }
    if (showAudience && form.audienceType === 'BRANDS' && form.targetBrandIds.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos una marca para esta audiencia.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const imageUrl = selectedFile ? await uploadImage(selectedFile) : banner?.imageUrl;
      const payload = {
        title: form.title.trim(),
        imageUrl,
        ctaUrl: form.ctaUrl.trim() || null,
        status: statusOverride ?? form.status,
        startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
        endsAt: new Date(`${form.endsAt}T23:59:59`).toISOString(),
        sortOrder: Number(form.sortOrder),
        placement,
        audienceType: showAudience ? form.audienceType : 'ALL',
        targetBrandIds: showAudience && form.audienceType === 'BRANDS' ? form.targetBrandIds : [],
      };
      const saved = editing && bannerId
        ? await adminApiRequest<Banner>(`/marketing-banners/${bannerId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminApiRequest<Banner>('/marketing-banners', { method: 'POST', body: JSON.stringify(payload) });
      if (editing) {
        setBanner(saved);
        setForm(formFromBanner(saved));
        setSelectedFile(null);
        if (fileInput.current) fileInput.current.value = '';
        setMessage({ type: 'success', text: 'Banner actualizado correctamente.' });
      } else {
        window.location.href = basePath;
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, editing ? 'No se pudo actualizar el banner.' : 'No se pudo crear el banner.') });
    } finally {
      setSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  const title = editing ? 'Editar banner' : 'Nuevo banner';
  const subtitle = editing
    ? 'Actualiza la información, vigencia e imagen del banner.'
    : placement === 'STORE'
      ? 'Crea un nuevo banner promocional para el inicio de tienda online.'
      : 'Crea un nuevo banner promocional para la app del cliente.';

  return (
    <AdminRoutedShell title={shellTitle}>
      <div className="brand-form-page banner-brand-form-page">
        <header className="brand-form-heading">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <a className="brand-back-button" href={basePath}><ArrowLeft size={17} />Volver a tabla</a>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {loading ? <div className="brand-form-loading">Cargando información del banner…</div> : (
          <form className="brand-form" onSubmit={submit}>
            <section className="brand-form-card">
              <header className="brand-card-title"><span><Info size={18} /></span><h2>Información general</h2></header>
              <div className="brand-general-grid">
                <label>Título <b>*</b><input required maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Promoción Bono 14" /></label>
                <label>Número de orden <b>*</b><input readOnly disabled value={computingOrder ? 'Calculando…' : form.sortOrder} title="El orden se asigna automáticamente según la audiencia y marcas seleccionadas." /></label>
                <label>Fecha de inicio <b>*</b><input required type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
                <label>Fecha fin <b>*</b><input required type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
                {editing ? (
                  <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BannerStatus })}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="DRAFT">Borrador</option></select></label>
                ) : null}
                <label className={editing ? undefined : 'brand-description-field'}>URL de destino<input value={form.ctaUrl} onChange={(event) => setForm({ ...form, ctaUrl: event.target.value })} placeholder="/beneficios o https://..." /></label>
              </div>
            </section>

            {showAudience ? (
            <section className="brand-form-card">
              <header className="brand-card-title"><span><Users size={18} /></span><div><h2>Audiencia</h2><p>Define qué clientes podrán ver este banner.</p></div></header>
              <div className="banner-audience-options">
                <label className={`banner-audience-choice${form.audienceType === 'ALL' ? ' selected' : ''}`}>
                  <input checked={form.audienceType === 'ALL'} name="audienceType" onChange={() => setForm({ ...form, audienceType: 'ALL', targetBrandIds: [] })} type="radio" />
                  <span><strong>Todas las marcas</strong><small>El banner será visible para todos los clientes.</small></span>
                </label>
                <label className={`banner-audience-choice${form.audienceType === 'BRANDS' ? ' selected' : ''}`}>
                  <input checked={form.audienceType === 'BRANDS'} name="audienceType" onChange={() => setForm({ ...form, audienceType: 'BRANDS' })} type="radio" />
                  <span><strong>Marcas específicas</strong><small>Selecciona una o varias marcas para segmentar el banner.</small></span>
                </label>
              </div>
              {form.audienceType === 'BRANDS' ? (
                <div className="banner-brand-selector">
                  <div className="banner-brand-selector-head"><strong>Marcas seleccionadas</strong><span>{form.targetBrandIds.length} de {brands.length}</span></div>
                  <div className="banner-brand-grid">
                    {brands.map((brand) => {
                      const checked = form.targetBrandIds.includes(brand.id);
                      return (
                        <label className={checked ? 'selected' : ''} key={brand.id}>
                          <input
                            checked={checked}
                            onChange={(event) => setForm({
                              ...form,
                              targetBrandIds: event.target.checked
                                ? [...form.targetBrandIds, brand.id]
                                : form.targetBrandIds.filter((id) => id !== brand.id),
                            })}
                            type="checkbox"
                          />
                          <span><strong>{brand.name}</strong><small>{brand.code}</small></span>
                        </label>
                      );
                    })}
                    {!brands.length ? <p className="muted-copy">No hay marcas activas disponibles.</p> : null}
                  </div>
                </div>
              ) : null}
            </section>
            ) : null}

            <section className="brand-form-card">
              <header className="brand-card-title"><span><Image size={18} /></span><div><h2>Imagen</h2><p>Selecciona la imagen promocional que verá el cliente.</p></div></header>
              <div className="brand-general-grid">
                <label className="brand-upload-field">Imagen del banner <b>*</b></label>
                {bannerPreviewUrl ? (
                  <figure className="reward-image-preview banner-image-preview">
                    <img alt="Vista previa del banner" src={bannerPreviewUrl} />
                    <figcaption>{selectedFile ? 'Imagen nueva seleccionada' : 'Imagen actual del banner'}</figcaption>
                    {banner?.imageUrl && !selectedFile ? (
                      <button className="brand-file-button" type="button" onClick={() => void reframeBanner()}>Ajustar encuadre</button>
                    ) : null}
                  </figure>
                ) : null}
                <div
                  className={`brand-upload-zone${dragging ? ' is-dragging' : ''}`}
                  onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <input ref={fileInput} accept="image/png,image/jpeg,image/webp,.jpg,.jpeg" onChange={onFileChange} type="file" />
                  <span className="brand-upload-icon"><CloudUpload size={23} /></span>
                  <div><p>Arrastra y suelta una imagen aquí o <button type="button" onClick={() => fileInput.current?.click()}>selecciona un archivo</button></p><small>{selectedFile ? selectedFile.name : editing && banner?.imageUrl ? 'Imagen actual cargada · selecciona otra para reemplazarla' : 'PNG, JPG o WEBP · máximo 10 MB'}</small></div>
                  <button className="brand-file-button" type="button" onClick={() => fileInput.current?.click()}>Seleccionar archivo</button>
                </div>
              </div>
            </section>

            <footer className="brand-form-actions">
              {!editing ? <button disabled={submitting} type="button" onClick={() => void save('DRAFT')}><Save size={17} />Guardar borrador</button> : null}
              <button className="primary" disabled={submitting || !form.title.trim()} type="submit"><Save size={17} />{submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear banner'}</button>
            </footer>
          </form>
        )}
      </div>
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          aspect={2.25}
          title="Ajusta el banner"
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => { setSelectedFile(cropped); setCropFile(null); }}
        />
      ) : null}
    </AdminRoutedShell>
  );
}
