'use client';

import { ArrowLeft, CloudUpload, Info, Save, Share2 } from 'lucide-react';
import { ChangeEvent, CSSProperties, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import ImageCropModal from '../../components/ImageCropModal';
import { absoluteMediaUrl, adminApiRequest, fetchImageAsFile, getErrorText } from '../../lib/adminApi';

const networks = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu-marca', Icon: FacebookIcon, tone: 'facebook' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu-marca', Icon: InstagramIcon, tone: 'instagram' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@tu-marca', Icon: TikTokIcon, tone: 'tiktok' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/tu-marca', Icon: XIcon, tone: 'x' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/521234567890', Icon: WhatsAppIcon, tone: 'whatsapp' },
  { key: 'website', label: 'Página web', placeholder: 'https://www.tu-marca.com', Icon: WebsiteIcon, tone: 'website' },
] as const;

const cardTextColors = [
  { label: 'Negro', value: '#111827' },
  { label: 'Blanco', value: '#FFFFFF' },
  { label: 'Plateado', value: '#D7DBE3' },
  { label: 'Dorado', value: '#D4A84B' },
] as const;

type NetworkKey = (typeof networks)[number]['key'];
type SocialLinks = Record<NetworkKey, { active: boolean; url: string }>;
type Brand = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  cardImageUrl?: string | null;
  cardTextColor?: string | null;
  socialLinks?: Partial<Record<NetworkKey, { active?: boolean; url?: string | null }>> | null;
};
type Catalog = { code: string; items: Brand[] };

function emptyLinks(): SocialLinks {
  return networks.reduce((result, network) => {
    result[network.key] = { active: false, url: '' };
    return result;
  }, {} as SocialLinks);
}

function linksFromBrand(brand?: Brand | null): SocialLinks {
  const result = emptyLinks();
  if (!brand?.socialLinks) return result;
  networks.forEach(({ key }) => {
    result[key] = {
      active: brand.socialLinks?.[key]?.active === true,
      url: brand.socialLinks?.[key]?.url ?? '',
    };
  });
  return result;
}

export default function BrandFormPage({ mode, itemId }: { mode: 'create' | 'edit'; itemId?: string }) {
  const editing = mode === 'edit';
  const [brand, setBrand] = useState<Brand | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cardTextColor, setCardTextColor] = useState('#111827');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(emptyLinks);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing || !itemId) return;
    let cancelled = false;
    setLoading(true);
    adminApiRequest<Catalog>('/catalogs/BRANDS?includeInactive=true')
      .then((catalog) => {
        if (cancelled) return;
        const existing = catalog.items.find((item) => item.id === itemId) ?? null;
        if (!existing) throw new Error('Marca no encontrada.');
        setBrand(existing);
        applyBrand(existing);
      })
      .catch((error) => !cancelled && setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la marca.') }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [editing, itemId]);

  function applyBrand(value?: Brand | null) {
    setCode(value?.code ?? '');
    setName(value?.name ?? '');
    setDescription(value?.description ?? '');
    setCardTextColor(value?.cardTextColor ?? '#111827');
    setSocialLinks(linksFromBrand(value));
    setSelectedFile(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function chooseFile(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Selecciona una imagen PNG, JPG, JPEG o WEBP válida.' });
      return;
    }
    setMessage(null);
    setCropFile(file);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  const selectedPreviewUrl = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : null, [selectedFile]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  function validateLinks() {
    for (const network of networks) {
      const link = socialLinks[network.key];
      if (!link.active) continue;
      if (!link.url.trim()) return `Ingresa la URL de ${network.label}.`;
      try {
        const parsed = new URL(link.url.trim());
        if (parsed.protocol !== 'https:') return `La URL de ${network.label} debe iniciar con https://.`;
        if (network.key === 'whatsapp' && parsed.hostname !== 'wa.me') return 'WhatsApp debe usar el formato https://wa.me/numero.';
      } catch {
        return `La URL de ${network.label} no es válida.`;
      }
    }
    return null;
  }

  async function uploadImage(catalogItemId: string, file: File) {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
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
        catalogItemId,
      }),
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const linkError = validateLinks();
    if (linkError) {
      setMessage({ type: 'error', text: linkError });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      cardTextColor,
      socialLinks,
    };
    try {
      const saved = editing && brand
        ? await adminApiRequest<Brand>(`/catalogs/items/${brand.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminApiRequest<Brand>('/catalogs/BRANDS/items', { method: 'POST', body: JSON.stringify(payload) });
      if (selectedFile) await uploadImage(saved.id, selectedFile);
      window.location.href = '/catalogos/marca';
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, editing ? 'No se pudo actualizar la marca.' : 'No se pudo crear la marca.') });
    } finally {
      setSubmitting(false);
    }
  }

  const title = editing ? 'Editar marca' : 'Nueva marca';
  const subtitle = editing
    ? 'Actualiza la información, imagen y redes sociales de la marca.'
    : 'Crea una nueva marca y configura su imagen y redes sociales.';
  const existingCardImageUrl = brand?.cardImageUrl ? absoluteMediaUrl(brand.cardImageUrl) : null;
  const previewImageUrl = selectedPreviewUrl ?? existingCardImageUrl;

  return (
    <AdminRoutedShell title={title}>
      <div className="brand-form-page">
        <header className="brand-form-heading">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <a className="brand-back-button" href="/catalogos/marca"><ArrowLeft size={17} />Volver a tabla</a>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {loading ? <div className="brand-form-loading">Cargando información de la marca…</div> : (
          <form className="brand-form" onSubmit={(event) => void submit(event)}>
            <section className="brand-form-card">
              <header className="brand-card-title">
                <span><Info size={18} /></span>
                <div>
                  <h2>Configuración de la marca</h2>
                  <p>Información, descripción y apariencia de la tarjeta.</p>
                </div>
              </header>
              <div className="brand-general-grid">
                <label className="form-field-code"><span className="field-line">Código <b>*</b></span><input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ej. MAR-001" /></label>
                <label className="form-field-name"><span className="field-line">Nombre visible <b>*</b></span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Mi Marca" /></label>
                <label className="brand-description-field">Descripción corta (opcional)
                  <span className="brand-textarea-wrap">
                    <textarea maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Breve descripción de la marca..." />
                    <small>{description.length} / 120</small>
                  </span>
                </label>
                <div className="brand-card-color-field">
                  <div>
                    <strong>Color del texto de la tarjeta</strong>
                    <small>Elige el color que tenga mejor contraste con la imagen.</small>
                  </div>
                  <div className="brand-color-options" role="group" aria-label="Color del texto de la tarjeta">
                    {cardTextColors.map((color) => (
                      <button
                        aria-label={color.label}
                        aria-pressed={cardTextColor.toUpperCase() === color.value}
                        className="brand-color-option"
                        key={color.value}
                        onClick={() => setCardTextColor(color.value)}
                        style={{ '--brand-color': color.value } as CSSProperties}
                        title={color.label}
                        type="button"
                      >
                        <span />{color.label}
                      </button>
                    ))}
                    <label className="brand-custom-color">
                      <input aria-label="Elegir color personalizado" type="color" value={cardTextColor} onChange={(event) => setCardTextColor(event.target.value.toUpperCase())} />
                      Personalizado
                    </label>
                  </div>
                  <div className="brand-color-preview" style={{ color: cardTextColor }}>
                    <span>Vista previa</span><strong>45,500 <small>pts</small></strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="brand-form-card">
              <header className="brand-card-title">
                <span><CloudUpload size={18} /></span>
                <div>
                  <h2>Imagen</h2>
                  <p>Selecciona la imagen que identificará la marca en la PWA.</p>
                </div>
              </header>
              <div className="brand-general-grid reward-image-grid">
                <div className="reward-image-row">
                  {previewImageUrl ? (
                    <figure className="reward-image-preview">
                      <img alt="Imagen actual de la tarjeta" src={previewImageUrl} />
                      <figcaption>{selectedFile ? 'Nueva imagen seleccionada' : 'Imagen actual de la tarjeta'}</figcaption>
                      {existingCardImageUrl && !selectedFile ? (
                        <button className="brand-file-button" type="button" onClick={async () => { try { setCropFile(await fetchImageAsFile(existingCardImageUrl, 'tarjeta.png')); } catch (error) { setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la imagen para reencuadrar.') }); } }}>Ajustar encuadre</button>
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
                    <input ref={fileInput} accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.webp" onChange={onFileChange} type="file" />
                    <span className="brand-upload-icon"><CloudUpload size={23} /></span>
                    <div><p>Arrastra y suelta una imagen aquí o <button type="button" onClick={() => fileInput.current?.click()}>selecciona un archivo</button></p><small>{selectedFile ? selectedFile.name : brand?.cardImageUrl ? 'Imagen actual cargada · puedes reemplazarla' : 'PNG, JPG o WEBP · recomendado 1080×680 o menos de 500 KB'}</small></div>
                    <button className="brand-file-button" type="button" onClick={() => fileInput.current?.click()}>Seleccionar archivo</button>
                  </div>
                </div>
              </div>
            </section>

            <section className="brand-form-card brand-social-card">
              <header className="brand-card-title"><span><Share2 size={18} /></span><div><h2>Redes sociales</h2><p>Activa solo las redes que deseas mostrar al cliente e ingresa la URL correspondiente.</p></div></header>
              <div className="brand-social-grid">
                {networks.map((network) => {
                  const link = socialLinks[network.key];
                  const Icon = network.Icon;
                  return (
                    <div className="brand-social-row" key={network.key}>
                      <span className={`brand-network-icon ${network.tone}`}><Icon /></span>
                      <strong>{network.label}</strong>
                      <label className="brand-switch">
                        <input checked={link.active} onChange={(event) => setSocialLinks({ ...socialLinks, [network.key]: { ...link, active: event.target.checked } })} type="checkbox" />
                        <span />
                      </label>
                      <input disabled={!link.active} type="url" value={link.url} onChange={(event) => setSocialLinks({ ...socialLinks, [network.key]: { ...link, url: event.target.value } })} placeholder={network.placeholder} />
                    </div>
                  );
                })}
              </div>
            </section>

            <footer className="brand-form-actions">
              <button className="primary" disabled={submitting || !code.trim() || !name.trim()} type="submit"><Save size={17} />{submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear registro'}</button>
            </footer>
          </form>
        )}
      </div>
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          aspect={1.586}
          title="Ajusta la imagen de la tarjeta"
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => { setSelectedFile(cropped); setCropFile(null); }}
        />
      ) : null}
    </AdminRoutedShell>
  );
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.4 22v-8.1h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2v3.2H10V22h3.4Z" /></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.1-2.25a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" /></svg>;
}

function TikTokIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.3 3c.3 2.2 1.5 3.6 3.7 3.8v3.1a7 7 0 0 1-3.7-1.1v6.1c0 3.1-2.1 5.6-5.5 5.6-3 0-5.3-2-5.3-4.9 0-3.4 2.8-5.2 6-5v3.2c-1.4-.2-2.7.4-2.7 1.8 0 1 .8 1.7 1.9 1.7 1.3 0 2.1-.8 2.1-2.5V3h3.5Z" /></svg>;
}

function XIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 10.6 20.3 3h-1.6L13 9.6 8.4 3H3.1l7 10.1L3.1 21h1.6l6.1-7 4.9 7H21l-7.3-10.4Zm-2.2 2.5-.7-1-5.6-8h2.4l4.5 6.5.7 1 5.9 8.4h-2.4l-4.8-6.9Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.5l-1 4.9 5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.5c-1.5 0-2.9-.4-4.1-1.2l-.3-.2-2.9.8.6-2.9-.2-.3A7.8 7.8 0 1 1 12 19.7Zm4.5-5.8c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-.2-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.1-.3 0-.4.1-.5l.4-.4c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.9-2-.2-.5-.5-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.4s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.2-.2-.2-.5-.4Z" /></svg>;
}

function WebsiteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3.3a15.2 15.2 0 0 0-1.1-5 8.1 8.1 0 0 1 4.4 5ZM12 4.1c.7 1 1.4 3.2 1.6 6.9h-3.2c.2-3.7.9-5.9 1.6-6.9ZM4.3 13h3.9c.1 1.9.4 3.7.9 5.1A8 8 0 0 1 4.3 13Zm3.9-2H4.3a8 8 0 0 1 4.8-5.1A18.5 18.5 0 0 0 8.2 11Zm3.8 8.9c-.7-1-1.4-3.2-1.6-6.9h3.2c-.2 3.7-.9 5.9-1.6 6.9Zm2.5-1.8c.5-1.4.8-3.2.9-5.1h3.3a8.1 8.1 0 0 1-4.2 5.1Z" /></svg>;
}
