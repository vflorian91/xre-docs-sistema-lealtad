'use client';

import { ArrowLeft, CloudUpload, Save, Tag } from 'lucide-react';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import ImageCropModal from '../../components/ImageCropModal';
import { absoluteMediaUrl, adminApiRequest, fetchImageAsFile, getErrorText, getStoredAdminUser, readFileAsBase64 } from '../../lib/adminApi';
import { hasPermission } from '../../lib/permissions';

type StoreBrand = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
};

type BrandForm = {
  name: string;
  code: string;
  description: string;
  websiteUrl: string;
  isActive: boolean;
  isFeatured: boolean;
};

function emptyForm(): BrandForm {
  return { name: '', code: '', description: '', websiteUrl: '', isActive: true, isFeatured: false };
}

function formFromBrand(brand: StoreBrand): BrandForm {
  return {
    name: brand.name,
    code: brand.code,
    description: brand.description ?? '',
    websiteUrl: brand.websiteUrl ?? '',
    isActive: brand.isActive,
    isFeatured: brand.isFeatured ?? false,
  };
}

export default function BrandFormPage({ mode, brandId }: { mode: 'create' | 'edit'; brandId?: string }) {
  const editing = mode === 'edit';
  const permissions = getStoredAdminUser()?.permissions;
  const canSave = hasPermission(permissions, editing ? 'store_brands.edit' : 'store_brands.create');
  const canToggleStatus = hasPermission(permissions, 'store_brands.status');
  const [brand, setBrand] = useState<StoreBrand | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [featuredModal, setFeaturedModal] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) { setFilePreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const existingLogoUrl = editing && brand?.logoUrl ? absoluteMediaUrl(brand.logoUrl) : null;
  const previewLogoUrl = filePreview ?? existingLogoUrl;

  useEffect(() => {
    if (!editing || !brandId) return;
    let cancelled = false;
    setLoading(true);
    adminApiRequest<StoreBrand>(`/admin/store/brands/${brandId}`)
      .then((result) => {
        if (cancelled) return;
        setBrand(result);
        setForm(formFromBrand(result));
      })
      .catch((error) => !cancelled && setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la marca.') }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [editing, brandId]);

  function chooseFile(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Selecciona una imagen PNG, JPG, JPEG o WEBP valida.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no debe superar los 10 MB.' });
      return;
    }
    setMessage(null);
    setCropFile(file);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { chooseFile(event.target.files?.[0]); }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function uploadLogo(id: string, file: File) {
    await adminApiRequest('/media/store/brands/logo', {
      method: 'POST',
      body: JSON.stringify({
        storeBrandId: id,
        purpose: 'STORE_BRAND_LOGO',
        filename: file.name,
        mimeType: file.type,
        dataBase64: await readFileAsBase64(file),
      }),
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (!form.name.trim() || !form.code.trim()) {
      setMessage({ type: 'error', text: 'Completa nombre y codigo de la marca.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      websiteUrl: form.websiteUrl.trim() || null,
      isFeatured: form.isFeatured,
      ...(editing ? {} : { isActive: true }),
    };
    try {
      const saved = editing && brandId
        ? await adminApiRequest<StoreBrand>(`/admin/store/brands/${brandId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminApiRequest<StoreBrand>('/admin/store/brands', { method: 'POST', body: JSON.stringify(payload) });
      if (editing && canToggleStatus && brand && saved.isActive !== form.isActive) {
        await adminApiRequest<StoreBrand>(`/admin/store/brands/${saved.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: form.isActive }),
        });
      }
      if (selectedFile) await uploadLogo(saved.id, selectedFile);
      // Al guardar (crear o editar) regresar a la tabla de registro de marcas.
      window.location.href = '/tienda-online/marcas';
      return;
    } catch (error) {
      const text = getErrorText(error, editing ? 'No se pudo actualizar la marca.' : 'No se pudo crear la marca.');
      // Si el rechazo es por el límite de marcas destacadas, mostrarlo como modal explicativo.
      if (/destacar|destacada/i.test(text)) {
        setForm((prev) => ({ ...prev, isFeatured: brand?.isFeatured ?? false }));
        setFeaturedModal(text);
      } else {
        setMessage({ type: 'error', text });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title = editing ? 'Editar marca' : 'Nueva marca';
  const subtitle = editing
    ? 'Actualiza la informacion, logo y estado de la marca de tienda online.'
    : 'Crea una marca para asociar productos de la tienda online.';

  return (
    <AdminRoutedShell title="Tienda Online">
      <div className="brand-form-page">
        <header className="brand-form-heading">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <a className="brand-back-button" href="/tienda-online/marcas"><ArrowLeft size={17} />Volver a tabla</a>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {loading ? <div className="brand-form-loading">Cargando informacion de la marca...</div> : (
          <form className="brand-form" onSubmit={submit}>
            <section className="brand-form-card">
              <header className="brand-card-title"><span><Tag size={18} /></span><div><h2>Configuracion de la marca</h2><p>Nombre, codigo y datos generales.</p></div></header>
              <div className="brand-general-grid brand-online-general-grid">
                <label className="form-field-name"><span className="field-line">Nombre <b>*</b></span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Nine West" /></label>
                <label className="form-field-code"><span className="field-line">Codigo <b>*</b></span><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Ej. NINE_WEST" /></label>
                <label className="form-field-brand"><span className="field-line">Sitio web</span><input value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} placeholder="https://www.marca.com" /></label>
                <label className="reward-description-field"><span className="field-line">Descripcion corta</span>
                  <span className="brand-textarea-wrap"><textarea maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descripcion breve de la marca..." /><small>{form.description.length} / 500</small></span>
                </label>
              </div>
              <div className="form-options-row">
                <label className="form-option-card"><input checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} type="checkbox" /><span><strong>Marca destacada</strong><small>Aparece en el inicio de la tienda del cliente. Máximo 5 marcas destacadas.</small></span></label>
                {editing && canToggleStatus ? (
                  <label className="form-option-card danger"><input checked={!form.isActive} onChange={(event) => setForm({ ...form, isActive: !event.target.checked })} type="checkbox" /><span><strong>Marca inactiva</strong><small>Deja de mostrarse en la tienda online del cliente.</small></span></label>
                ) : null}
              </div>
            </section>

            <section className="brand-form-card">
              <header className="brand-card-title"><span><CloudUpload size={18} /></span><div><h2>Logo</h2><p>Selecciona el logo que identificara la marca en la tienda.</p></div></header>
              <div className="brand-general-grid reward-image-grid">
                <div className="reward-image-row">
                  {previewLogoUrl ? (
                    <figure className="reward-image-preview">
                      <img alt="Vista previa del logo" src={previewLogoUrl} />
                      <figcaption>{selectedFile ? 'Logo nuevo seleccionado' : 'Logo actual de la marca'}</figcaption>
                      {existingLogoUrl && !selectedFile ? (
                        <button className="brand-file-button" type="button" onClick={async () => { try { setCropFile(await fetchImageAsFile(existingLogoUrl, 'logo.png')); } catch (error) { setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el logo para reencuadrar.') }); } }}>Ajustar encuadre</button>
                      ) : null}
                    </figure>
                  ) : null}
                  <div className={`brand-upload-zone${dragging ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                    <input ref={fileInput} accept="image/png,image/jpeg,image/webp,.jpg,.jpeg" onChange={onFileChange} type="file" />
                    <span className="brand-upload-icon"><CloudUpload size={23} /></span>
                    <div><p>Arrastra y suelta una imagen aqui o <button type="button" onClick={() => fileInput.current?.click()}>selecciona un archivo</button></p><small>{selectedFile ? `${selectedFile.name} - se aplicara al guardar` : existingLogoUrl ? 'Logo actual cargado - selecciona otro para reemplazarlo' : 'PNG, JPG o WEBP - maximo 10 MB'}</small></div>
                    <button className="brand-file-button" type="button" onClick={() => fileInput.current?.click()}>Subir nueva imagen</button>
                  </div>
                </div>
              </div>
            </section>

            <footer className="brand-form-actions">
              {canSave ? (
                <button className="primary" disabled={submitting || !form.name.trim() || !form.code.trim()} type="submit"><Save size={17} />{submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear marca'}</button>
              ) : null}
            </footer>
          </form>
        )}
      </div>

      {featuredModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header"><div><h2>No puedes destacar más marcas</h2></div></header>
            <p style={{ color: '#475569', lineHeight: 1.5 }}>{featuredModal}</p>
            <footer className="modal-actions">
              <button className="admin-primary" onClick={() => setFeaturedModal(null)} type="button">Entendido</button>
            </footer>
          </div>
        </div>
      ) : null}
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          title="Ajusta el logo de la marca"
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => { setSelectedFile(cropped); setCropFile(null); }}
        />
      ) : null}
    </AdminRoutedShell>
  );
}
