'use client';

import { ArrowLeft, CloudUpload, Gift, Image, Save } from 'lucide-react';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import ImageCropModal from '../components/ImageCropModal';
import { absoluteMediaUrl, adminApiRequest, getErrorText, readFileAsBase64 } from '../lib/adminApi';

type BrandOption = { id: string; code: string; name: string; isActive: boolean };
type Reward = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  pointsValue: number;
  stock?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
  requiresApproval: boolean;
  isGiftCard: boolean;
  productType?: string | null;
  genderTarget?: string | null;
  redemptionLimitPerCustomer?: number | null;
  brandItemId?: string | null;
};
type RewardForm = {
  code: string;
  name: string;
  description: string;
  pointsValue: string;
  stock: string;
  isActive: boolean;
  requiresApproval: boolean;
  isGiftCard: boolean;
  redemptionLimitPerCustomer: string;
  brandItemId: string;
  productType: string;
  genderTarget: string;
};

const PRODUCT_TYPE_OPTIONS = [
  ['DEPORTIVO', 'Deportivo'], ['CASUAL', 'Casual'], ['FORMAL', 'Formal'], ['RUNNING', 'Running'],
  ['URBANO', 'Urbano'], ['ROPA', 'Ropa'], ['ACCESORIO', 'Accesorio'], ['OTRO', 'Otro'],
] as const;
const GENDER_TARGET_OPTIONS = [
  ['HOMBRE', 'Hombre'], ['MUJER', 'Mujer'], ['NINO', 'Niño'], ['NINA', 'Niña'], ['UNISEX', 'Unisex'],
] as const;

function emptyForm(): RewardForm {
  return {
    code: '', name: '', description: '', pointsValue: '', stock: '', isActive: true, requiresApproval: true, isGiftCard: false, redemptionLimitPerCustomer: '', brandItemId: '', productType: '', genderTarget: '',
  };
}

function formFromReward(reward: Reward): RewardForm {
  return {
    code: reward.code,
    name: reward.name,
    description: reward.description ?? '',
    pointsValue: String(reward.pointsValue),
    stock: reward.stock == null ? '' : String(reward.stock),
    isActive: reward.isActive,
    requiresApproval: reward.requiresApproval ?? true,
    isGiftCard: reward.isGiftCard ?? false,
    redemptionLimitPerCustomer: reward.redemptionLimitPerCustomer == null ? '' : String(reward.redemptionLimitPerCustomer),
    brandItemId: reward.brandItemId ?? '',
    productType: reward.productType ?? '',
    genderTarget: reward.genderTarget ?? '',
  };
}

export default function RewardFormPage({ mode, rewardId }: { mode: 'create' | 'edit'; rewardId?: string }) {
  const editing = mode === 'edit';
  const [reward, setReward] = useState<Reward | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) { setFilePreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const existingImageUrl = editing && reward?.imageUrl ? absoluteMediaUrl(reward.imageUrl) : null;
  const previewImageUrl = filePreview ?? existingImageUrl;

  useEffect(() => {
    adminApiRequest<{ items: BrandOption[] }>('/catalogs/BRANDS')
      .then((catalog) => setBrands(catalog.items.filter((brand) => brand.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing || !rewardId) return;
    let cancelled = false;
    setLoading(true);
    adminApiRequest<Reward>(`/rewards/${rewardId}`)
      .then((result) => {
        if (cancelled) return;
        setReward(result);
        setForm(formFromReward(result));
      })
      .catch((error) => !cancelled && setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el premio.') }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [editing, rewardId]);

  function resetForm() {
    setForm(reward ? formFromReward(reward) : emptyForm());
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
    setCropFile(file);
    setMessage(null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { chooseFile(event.target.files?.[0]); }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function uploadImage(id: string, file: File) {
    await adminApiRequest('/media/rewards/image', {
      method: 'POST',
      body: JSON.stringify({
        rewardId: id,
        purpose: 'REWARD_IMAGE',
        filename: file.name,
        mimeType: file.type,
        dataBase64: await readFileAsBase64(file),
      }),
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.pointsValue) {
      setMessage({ type: 'error', text: 'Completa código, nombre y costo en puntos.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      pointsValue: Number(form.pointsValue),
      stock: form.stock ? Number(form.stock) : null,
      isActive: editing ? form.isActive : true,
      isPublished: editing ? form.isActive : true,
      requiresApproval: form.requiresApproval,
      isGiftCard: form.isGiftCard,
      isFeatured: false,
      displayOrder: 0,
      categoryItemId: null,
      brandItemId: form.brandItemId || null,
      productType: form.productType || null,
      genderTarget: form.genderTarget || null,
      redemptionLimitPerCustomer: form.redemptionLimitPerCustomer ? Number(form.redemptionLimitPerCustomer) : (editing ? null : undefined),
      termsConditions: null,
    };
    try {
      const saved = editing && rewardId
        ? await adminApiRequest<Reward>(`/rewards/${rewardId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminApiRequest<Reward>('/rewards', { method: 'POST', body: JSON.stringify(payload) });
      if (selectedFile) await uploadImage(saved.id, selectedFile);
      if (editing) {
        const refreshed = await adminApiRequest<Reward>(`/rewards/${saved.id}`);
        setReward(refreshed);
        setForm(formFromReward(refreshed));
        setSelectedFile(null);
        if (fileInput.current) fileInput.current.value = '';
        setMessage({ type: 'success', text: 'Premio actualizado correctamente.' });
      } else {
        window.location.href = '/premios';
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, editing ? 'No se pudo actualizar el premio.' : 'No se pudo crear el premio.') });
    } finally {
      setSubmitting(false);
    }
  }

  const title = editing ? 'Editar premio' : 'Nuevo premio';
  const subtitle = editing
    ? 'Actualiza la información, puntos, disponibilidad e imagen del premio.'
    : 'Crea un nuevo beneficio canjeable para el catálogo del cliente.';

  return (
    <AdminRoutedShell title="Premios">
      <div className="brand-form-page reward-brand-form-page">
        <header className="brand-form-heading">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <a className="brand-back-button" href="/premios"><ArrowLeft size={17} />Volver a tabla</a>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {loading ? <div className="brand-form-loading">Cargando información del premio…</div> : (
          <form className="brand-form" onSubmit={submit}>
            <section className="brand-form-card reward-configuration-card">
              <header className="brand-card-title"><span><Gift size={18} /></span><div><h2>Configuración del premio</h2><p>Información, costo, disponibilidad y comportamiento del canje.</p></div></header>
              <div className="brand-general-grid reward-general-grid">
                <label className="form-field-code"><span className="field-line">Código <b>*</b></span><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Ej. GIFT_Q25" /></label>
                <label className="form-field-name"><span className="field-line">Nombre visible <b>*</b></span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Tarjeta Regalo Q25" /></label>
                <label className="form-field-brand"><span className="field-line">Marca</span>
                  <select value={form.brandItemId} onChange={(event) => setForm({ ...form, brandItemId: event.target.value })}>
                    <option value="">Todas las marcas</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                  <small className="brand-field-hint">Solo se muestra a clientes de esta marca.</small>
                </label>
                <label className="reward-field-points"><span className="field-line">Costo en puntos <b>*</b></span><input required inputMode="numeric" value={form.pointsValue} onChange={(event) => setForm({ ...form, pointsValue: event.target.value.replace(/\D/g, '') })} placeholder="5000" /></label>
                <label className="reward-field-number"><span className="field-line">Stock</span><input inputMode="numeric" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value.replace(/\D/g, '') })} placeholder="Sin límite" /></label>
                <label className="reward-field-number"><span className="field-line">Límite por cliente</span><input inputMode="numeric" value={form.redemptionLimitPerCustomer} onChange={(event) => setForm({ ...form, redemptionLimitPerCustomer: event.target.value.replace(/\D/g, '') })} placeholder="Sin límite" /></label>
                <label className="form-field-brand"><span className="field-line">Tipo</span>
                  <select value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })}>
                    <option value="">Sin tipo</option>
                    {PRODUCT_TYPE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </select>
                </label>
                <label className="form-field-brand"><span className="field-line">Género</span>
                  <select value={form.genderTarget} onChange={(event) => setForm({ ...form, genderTarget: event.target.value })}>
                    <option value="">Sin género</option>
                    {GENDER_TARGET_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </select>
                </label>
                <label className="reward-description-field"><span className="field-line">Descripción corta</span>
                  <span className="brand-textarea-wrap"><textarea maxLength={180} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descripción breve del premio..." /><small>{form.description.length} / 180</small></span>
                </label>
              </div>
              <div className="form-options-row reward-options-row">
                <label className="form-option-card"><input checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} type="checkbox" /><span><strong>Requiere aprobación</strong><small>Si se desactiva, el canje se aplica inmediatamente.</small></span></label>
                <label className="form-option-card"><input checked={form.isGiftCard} onChange={(event) => setForm({ ...form, isGiftCard: event.target.checked })} type="checkbox" /><span><strong>Tarjeta de regalo</strong><small>Se mostrará como producto digital en el historial.</small></span></label>
                {editing ? <label className="form-option-card danger"><input checked={!form.isActive} onChange={(event) => setForm({ ...form, isActive: !event.target.checked })} type="checkbox" /><span><strong>Premio inactivo</strong><small>Deja de aparecer en el catálogo del cliente.</small></span></label> : null}
              </div>
            </section>

            <section className="brand-form-card">
              <header className="brand-card-title"><span><Image size={18} /></span><div><h2>Imagen</h2><p>Selecciona la imagen que identificará el premio en el catálogo.</p></div></header>
              <div className="brand-general-grid reward-image-grid">
                <label className="brand-upload-field">Imagen del premio</label>
                <div className="reward-image-row">
                  {previewImageUrl ? (
                    <figure className="reward-image-preview">
                      <img alt="Vista previa del premio" src={previewImageUrl} />
                      <figcaption>{selectedFile ? 'Imagen nueva seleccionada' : 'Imagen actual del premio'}</figcaption>
                    </figure>
                  ) : null}
                  <div className={`brand-upload-zone${dragging ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                    <input ref={fileInput} accept="image/png,image/jpeg,image/webp,.jpg,.jpeg" onChange={onFileChange} type="file" />
                    <span className="brand-upload-icon"><CloudUpload size={23} /></span>
                    <div><p>Arrastra y suelta una imagen aquí o <button type="button" onClick={() => fileInput.current?.click()}>selecciona un archivo</button></p><small>{selectedFile ? selectedFile.name : existingImageUrl ? 'Imagen actual cargada · selecciona otra para reemplazarla' : 'PNG, JPG o WEBP · máximo 10 MB'}</small></div>
                    <button className="brand-file-button" type="button" onClick={() => fileInput.current?.click()}>Seleccionar archivo</button>
                  </div>
                </div>
              </div>
            </section>

            <footer className="brand-form-actions">
              <button className="primary" disabled={submitting || !form.code.trim() || !form.name.trim() || !form.pointsValue} type="submit"><Save size={17} />{submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear premio'}</button>
            </footer>
          </form>
        )}
      </div>
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          title="Ajusta la imagen del premio"
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => { setSelectedFile(cropped); setCropFile(null); }}
        />
      ) : null}
    </AdminRoutedShell>
  );
}
