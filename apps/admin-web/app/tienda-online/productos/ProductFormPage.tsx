'use client';

import { ArrowLeft, CloudUpload, Plus, Save, ShoppingBag, Trash2 } from 'lucide-react';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import ImageCropModal from '../../components/ImageCropModal';
import { absoluteMediaUrl, adminApiRequest, fetchImageAsFile, getErrorText, getStoredAdminUser, readFileAsBase64 } from '../../lib/adminApi';
import { hasPermission } from '../../lib/permissions';

type StoreBrandOption = { id: string; name: string; code: string; isActive: boolean };

type StoreProductImage = { id: string; imageUrl: string; isMain: boolean; displayOrder: number };

type StoreProduct = {
  id: string;
  brandId: string;
  name: string;
  sku?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  price: number;
  stockQuantity: number;
  minimumStock?: number | null;
  mainImageUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  generatesLoyaltyPoints?: boolean;
  productType?: string | null;
  genderTarget?: string | null;
  images: StoreProductImage[];
  variants?: StoreProductVariant[];
};

const PRODUCT_TYPE_OPTIONS = [
  ['DEPORTIVO', 'Deportivo'], ['CASUAL', 'Casual'], ['FORMAL', 'Formal'], ['RUNNING', 'Running'],
  ['URBANO', 'Urbano'], ['ROPA', 'Ropa'], ['ACCESORIO', 'Accesorio'], ['OTRO', 'Otro'],
] as const;
const GENDER_TARGET_OPTIONS = [
  ['HOMBRE', 'Hombre'], ['MUJER', 'Mujer'], ['NINO', 'Niño'], ['NINA', 'Niña'], ['UNISEX', 'Unisex'],
] as const;

type StoreProductVariant = {
  id?: string;
  sku?: string | null;
  optionValues?: Array<{ name: string; value: string }>;
  size?: string | null;
  color?: string | null;
  genderTarget?: string | null;
  productType?: string | null;
  imageUrl?: string | null;
  price: number;
  promotionalPrice?: number | null;
  stockQuantity: number;
  minimumStock?: number | null;
  isActive: boolean;
  displayOrder: number;
};

type ProductForm = {
  brandId: string;
  name: string;
  sku: string;
  description: string;
  price: string;
  stockQuantity: string;
  minimumStock: string;
  isFeatured: boolean;
  generatesLoyaltyPoints: boolean;
  productType: string;
  genderTarget: string;
  isActive: boolean;
};

function emptyForm(): ProductForm {
  return {
    brandId: '', name: '', sku: '', description: '', price: '', stockQuantity: '200',
    minimumStock: '5', isFeatured: false, generatesLoyaltyPoints: true, productType: '', genderTarget: '', isActive: true,
  };
}

function formFromProduct(product: StoreProduct): ProductForm {
  return {
    brandId: product.brandId,
    name: product.name,
    sku: product.sku ?? '',
    description: product.shortDescription ?? product.fullDescription ?? '',
    price: String(product.price),
    stockQuantity: String(product.stockQuantity),
    minimumStock: product.minimumStock == null ? '' : String(product.minimumStock),
    isFeatured: product.isFeatured,
    generatesLoyaltyPoints: product.generatesLoyaltyPoints ?? true,
    productType: product.productType ?? '',
    genderTarget: product.genderTarget ?? '',
    isActive: product.isActive,
  };
}

function variantsFromProduct(product: StoreProduct): StoreProductVariant[] {
  return (product.variants ?? []).map((variant, index) => ({
    id: variant.id,
    sku: variant.sku ?? '',
    size: variant.size ?? '',
    color: variant.color ?? '',
    genderTarget: variant.genderTarget ?? '',
    productType: variant.productType ?? '',
    imageUrl: variant.imageUrl ?? null,
    price: variant.price,
    promotionalPrice: variant.promotionalPrice ?? null,
    stockQuantity: variant.stockQuantity,
    minimumStock: variant.minimumStock ?? null,
    isActive: variant.isActive,
    displayOrder: variant.displayOrder ?? index,
  }));
}

function emptyVariant(displayOrder: number, fallbackPrice: string): StoreProductVariant {
  return {
    sku: '',
    size: '',
    color: '',
    genderTarget: '',
    productType: '',
    imageUrl: null,
    price: Number(fallbackPrice) || 0,
    promotionalPrice: null,
    stockQuantity: 200,
    minimumStock: 5,
    isActive: true,
    displayOrder,
  };
}

export default function ProductFormPage({ mode, productId }: { mode: 'create' | 'edit'; productId?: string }) {
  const editing = mode === 'edit';
  const permissions = getStoredAdminUser()?.permissions;
  const canSave = hasPermission(permissions, editing ? 'store_products.edit' : 'store_products.create');
  const canToggleStatus = hasPermission(permissions, 'store_products.status');
  const canManageImages = hasPermission(permissions, 'store_products.images');
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [variants, setVariants] = useState<StoreProductVariant[]>([]);
  const [brands, setBrands] = useState<StoreBrandOption[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<{ kind: 'main' } | { kind: 'variant'; index: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApiRequest<StoreBrandOption[]>('/admin/store/brands?status=true')
      .then((result) => setBrands(result.filter((brand) => brand.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFile) { setFilePreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const mainImage = product?.images.find((image) => image.isMain) ?? null;
  const existingImageUrl = editing && (mainImage?.imageUrl ?? product?.mainImageUrl) ? absoluteMediaUrl((mainImage?.imageUrl ?? product?.mainImageUrl) as string) : null;
  const previewImageUrl = filePreview ?? existingImageUrl;

  useEffect(() => {
    if (!editing || !productId) return;
    void loadProduct();
  }, [editing, productId]);

  async function loadProduct() {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    try {
      const result = await adminApiRequest<StoreProduct>(`/admin/store/products/${productId}`);
      if (cancelled) return;
      setProduct(result);
      setForm(formFromProduct(result));
      setVariants(variantsFromProduct(result));
    } catch (error) {
      if (!cancelled) setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el producto.') });
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

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
    setCropTarget({ kind: 'main' });
    setCropFile(file);
  }

  function chooseVariantFile(index: number, file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Selecciona una imagen PNG, JPG, JPEG o WEBP valida.' });
      return;
    }
    setMessage(null);
    setCropTarget({ kind: 'variant', index });
    setCropFile(file);
  }

  async function reframeImage(target: { kind: 'main' } | { kind: 'variant'; index: number }, url: string) {
    try {
      const file = await fetchImageAsFile(url, target.kind === 'variant' ? 'variante.png' : 'producto.png');
      setCropTarget(target);
      setCropFile(file);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la imagen para reencuadrar.') });
    }
  }

  function onCropConfirm(cropped: File) {
    const target = cropTarget;
    setCropFile(null);
    setCropTarget(null);
    if (!target) return;
    if (target.kind === 'main') {
      setSelectedFile(cropped);
    } else {
      void uploadVariantImage(target.index, cropped);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { chooseFile(event.target.files?.[0]); }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function uploadImage(id: string, file: File) {
    const uploadResult = await adminApiRequest<{ asset: { publicUrl: string } }>('/media/store/products/image', {
      method: 'POST',
      body: JSON.stringify({
        storeProductId: id,
        purpose: 'STORE_PRODUCT_IMAGE',
        filename: file.name,
        mimeType: file.type,
        dataBase64: await readFileAsBase64(file),
      }),
    });

    await adminApiRequest(`/admin/store/products/${id}/images`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl: uploadResult.asset.publicUrl }),
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (!form.brandId || !form.name.trim() || !form.price) {
      setMessage({ type: 'error', text: 'Completa marca, nombre y precio del producto.' });
      return;
    }
    const preparedVariants = prepareVariants();
    if (!preparedVariants.ok) {
      setMessage({ type: 'error', text: preparedVariants.message });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    try {
      let saved: StoreProduct;
      if (editing && productId) {
        saved = await adminApiRequest<StoreProduct>(`/admin/store/products/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            brandId: form.brandId,
            name: form.name.trim(),
            sku: form.sku.trim() || null,
            shortDescription: form.description.trim() || null,
            fullDescription: null,
            price: Number(form.price),
            stockQuantity: Number(form.stockQuantity) || 0,
            minimumStock: form.minimumStock ? Number(form.minimumStock) : null,
            variants: preparedVariants.variants,
            isFeatured: form.isFeatured,
            generatesLoyaltyPoints: form.generatesLoyaltyPoints,
            productType: form.productType || null,
            genderTarget: form.genderTarget || null,
            isActive: canToggleStatus ? form.isActive : undefined,
          }),
        });
      } else {
        saved = await adminApiRequest<StoreProduct>('/admin/store/products', {
          method: 'POST',
          body: JSON.stringify({
            brandId: form.brandId,
            name: form.name.trim(),
            sku: form.sku.trim() || null,
            shortDescription: form.description.trim() || null,
            fullDescription: null,
            price: Number(form.price),
            stockQuantity: Number(form.stockQuantity) || 0,
            minimumStock: form.minimumStock ? Number(form.minimumStock) : null,
            variants: preparedVariants.variants,
            isFeatured: form.isFeatured,
            generatesLoyaltyPoints: form.generatesLoyaltyPoints,
            productType: form.productType || null,
            genderTarget: form.genderTarget || null,
            isActive: true,
          }),
        });
      }

      if (selectedFile) await uploadImage(saved.id, selectedFile);

      if (editing) {
        await loadProduct();
        setSelectedFile(null);
        if (fileInput.current) fileInput.current.value = '';
        setMessage({ type: 'success', text: 'Producto actualizado correctamente.' });
      } else {
        window.location.href = '/tienda-online/productos';
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, editing ? 'No se pudo actualizar el producto.' : 'No se pudo crear el producto.') });
    } finally {
      setSubmitting(false);
    }
  }

  function prepareVariants(): { ok: true; variants: StoreProductVariant[] } | { ok: false; message: string } {
    const cleanVariants = variants
      .map((variant, index) => ({
        ...variant,
        sku: variant.sku?.trim() || null,
        size: variant.size?.trim() || null,
        color: variant.color?.trim() || null,
        genderTarget: variant.genderTarget || null,
        productType: variant.productType || null,
        imageUrl: variant.imageUrl || null,
        price: Number(variant.price) || 0,
        promotionalPrice: variant.promotionalPrice == null || Number(variant.promotionalPrice) <= 0 ? null : Number(variant.promotionalPrice),
        stockQuantity: Number(variant.stockQuantity) || 0,
        minimumStock: variant.minimumStock == null || Number(variant.minimumStock) < 0 ? null : Number(variant.minimumStock),
        displayOrder: index,
      }))
      .filter((variant) => variant.size || variant.color || variant.genderTarget || variant.productType || variant.sku || variant.price > 0 || variant.stockQuantity > 0);

    for (const [index, variant] of cleanVariants.entries()) {
      if (!variant.size && !variant.color) return { ok: false, message: `La variante ${index + 1} debe tener al menos talla o color.` };
      if (variant.price <= 0) return { ok: false, message: `Ingresa un precio valido para la variante ${index + 1}.` };
      if (variant.promotionalPrice != null && variant.promotionalPrice >= variant.price) {
        return { ok: false, message: `El precio promocional de la variante ${index + 1} debe ser menor al precio regular.` };
      }
    }

    return { ok: true, variants: cleanVariants };
  }

  async function uploadVariantImage(index: number, file: File) {
    try {
      const base64 = await readFileAsBase64(file);
      const uploadResult = await adminApiRequest<{ asset: { publicUrl: string } }>('/media/store/products/image', {
        method: 'POST',
        body: JSON.stringify({ purpose: 'STORE_PRODUCT_IMAGE', filename: file.name, mimeType: file.type, dataBase64: base64, storeProductId: productId ?? 'nuevo' }),
      });
      updateVariant(index, { imageUrl: uploadResult.asset.publicUrl });
      setMessage({ type: 'success', text: 'Imagen de variante cargada.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo subir la imagen de la variante.') });
    }
  }

  function updateVariant(index: number, patch: Partial<StoreProductVariant>) {
    setVariants((current) => current.map((variant, itemIndex) => (itemIndex === index ? { ...variant, ...patch } : variant)));
  }

  const title = editing ? 'Editar producto' : 'Nuevo producto';
  const subtitle = editing
    ? 'Actualiza la informacion, precio, imagen y publicacion del producto.'
    : 'Crea un nuevo producto para la tienda online del cliente.';

  return (
    <AdminRoutedShell title="Tienda Online">
      <div className="brand-form-page">
        <header className="brand-form-heading">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <a className="brand-back-button" href="/tienda-online/productos"><ArrowLeft size={17} />Volver a tabla</a>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {loading ? <div className="brand-form-loading">Cargando informacion del producto...</div> : (
          <>
            <form className="brand-form" onSubmit={submit}>
              <section className="brand-form-card">
                <header className="brand-card-title"><span><ShoppingBag size={18} /></span><div><h2>Informacion del producto</h2><p>Marca, nombre, precio y descripcion.</p></div></header>
                <div className="brand-general-grid store-product-general-grid">
                  <label className="form-field-brand"><span className="field-line">Marca <b>*</b></span>
                    <select required value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })}>
                      <option value="">Selecciona una marca</option>
                      {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                    </select>
                  </label>
                  <label className="form-field-name"><span className="field-line">Nombre <b>*</b></span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Zapato casual dama" /></label>
                  <label className="form-field-code"><span className="field-line">SKU</span><input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })} placeholder="Ej. NW-ZAP-001" /></label>
                  <label className="reward-field-points"><span className="field-line">Precio (GTQ) <b>*</b></span><input required inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value.replace(/[^0-9.]/g, '') })} placeholder="399.00" /></label>
                  <label className="reward-field-number"><span className="field-line">{editing ? 'Stock' : 'Stock inicial'}</span><input inputMode="numeric" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value.replace(/\D/g, '') })} placeholder="0" /></label>
                  <label className="reward-field-number"><span className="field-line">Stock minimo</span><input inputMode="numeric" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value.replace(/\D/g, '') })} placeholder="Sin definir" /></label>
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
                  <label className="reward-description-field store-product-description-field"><span className="field-line">Descripcion</span>
                    <span className="brand-textarea-wrap"><textarea maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descripcion del producto..." /><small>{form.description.length} / 500</small></span>
                  </label>
                </div>
                <div className="form-options-row">
                  {editing && canToggleStatus ? <label className="form-option-card danger"><input checked={!form.isActive} onChange={(event) => setForm({ ...form, isActive: !event.target.checked })} type="checkbox" /><span><strong>Inactivar</strong><small>Si esta inactivo, no sera visible en la tienda.</small></span></label> : null}
                  <label className="form-option-card"><input checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} type="checkbox" /><span><strong>Producto destacado</strong><small>Puede mostrarse primero en la tienda.</small></span></label>
                  <label className="form-option-card"><input checked={form.generatesLoyaltyPoints} onChange={(event) => setForm({ ...form, generatesLoyaltyPoints: event.target.checked })} type="checkbox" /><span><strong>Genera puntos de lealtad</strong><small>Si está activo, la compra de este producto suma puntos al cliente.</small></span></label>
                </div>
              </section>

              <section className="brand-form-card">
                <header className="brand-card-title">
                  <span><ShoppingBag size={18} /></span>
                  <div><h2>Variantes del producto</h2><p>Opciones como talla, color, tamano, capacidad o material.</p></div>
                </header>
                <div className="product-variant-toolbar">
                  <div>
                    <strong>{variants.length ? `${variants.length} variante${variants.length === 1 ? '' : 's'}` : 'Producto sin variantes'}</strong>
                    <small>{variants.length ? 'El cliente elegira una variante antes de agregar al carrito.' : 'Si no agregas variantes, se usara el precio y stock general del producto.'}</small>
                  </div>
                  <button type="button" onClick={() => setVariants((current) => [...current, emptyVariant(current.length, form.price)])}>
                    <Plus size={16} /> Agregar variante
                  </button>
                </div>

                {variants.length ? (
                  <div className="product-variant-list">
                    {variants.map((variant, variantIndex) => (
                      <article className="product-variant-card" key={variant.id ?? variantIndex}>
                        <header className="product-variant-card-head">
                          <strong>Variante {variantIndex + 1}</strong>
                          <div>
                            <label className="product-variant-active"><input checked={variant.isActive} onChange={(event) => updateVariant(variantIndex, { isActive: event.target.checked })} type="checkbox" /> Activa</label>
                            <button aria-label="Eliminar variante" type="button" onClick={() => setVariants((current) => current.filter((_, index) => index !== variantIndex))}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </header>

                        <div className="product-variant-fields">
                          <label><span>Talla</span><input value={variant.size ?? ''} onChange={(event) => updateVariant(variantIndex, { size: event.target.value })} placeholder="Ej. 38 / M" /></label>
                          <label><span>Color</span><input value={variant.color ?? ''} onChange={(event) => updateVariant(variantIndex, { color: event.target.value })} placeholder="Ej. Negro" /></label>
                          <label><span>Género</span>
                            <select value={variant.genderTarget ?? ''} onChange={(event) => updateVariant(variantIndex, { genderTarget: event.target.value })}>
                              <option value="">Sin género</option>
                              {GENDER_TARGET_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                            </select>
                          </label>
                          <label><span>Tipo</span>
                            <select value={variant.productType ?? ''} onChange={(event) => updateVariant(variantIndex, { productType: event.target.value })}>
                              <option value="">Sin tipo</option>
                              {PRODUCT_TYPE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                            </select>
                          </label>
                          <label><span>SKU</span><input value={variant.sku ?? ''} onChange={(event) => updateVariant(variantIndex, { sku: event.target.value.toUpperCase() })} placeholder="Ej. ZAP-38-NEG" /></label>
                          <label><span>Precio</span><input inputMode="decimal" value={String(variant.price || '')} onChange={(event) => updateVariant(variantIndex, { price: Number(event.target.value.replace(/[^0-9.]/g, '')) || 0 })} placeholder="399.00" /></label>
                          <label><span>Precio promoción</span><input inputMode="decimal" value={variant.promotionalPrice == null ? '' : String(variant.promotionalPrice)} onChange={(event) => updateVariant(variantIndex, { promotionalPrice: event.target.value ? Number(event.target.value.replace(/[^0-9.]/g, '')) || 0 : null })} placeholder="Opcional" /></label>
                          <label><span>Stock</span><input inputMode="numeric" value={String(variant.stockQuantity || '')} onChange={(event) => updateVariant(variantIndex, { stockQuantity: Number(event.target.value.replace(/\D/g, '')) || 0 })} placeholder="200" /></label>
                          <label><span>Stock mínimo</span><input inputMode="numeric" value={variant.minimumStock == null ? '' : String(variant.minimumStock)} onChange={(event) => updateVariant(variantIndex, { minimumStock: event.target.value ? Number(event.target.value.replace(/\D/g, '')) || 0 : null })} placeholder="5" /></label>
                        </div>

                        <div className="product-variant-image">
                          {variant.imageUrl ? <img alt="Variante" src={absoluteMediaUrl(variant.imageUrl)} /> : <span className="product-variant-image-empty">Sin imagen</span>}
                          {editing ? (
                            <>
                              <label className="brand-file-button product-variant-image-btn">
                                {variant.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                                <input accept="image/png,image/jpeg,image/webp" hidden type="file" onChange={(event) => { chooseVariantFile(variantIndex, event.target.files?.[0]); event.target.value = ''; }} />
                              </label>
                              {variant.imageUrl ? <button className="brand-file-button product-variant-image-btn" type="button" onClick={() => void reframeImage({ kind: 'variant', index: variantIndex }, variant.imageUrl as string)}>Ajustar encuadre</button> : null}
                            </>
                          ) : <small className="product-variant-image-hint">Guarda el producto para subir imagen de variante.</small>}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>

              {canManageImages ? (
                <section className="brand-form-card">
                  <header className="brand-card-title"><span><CloudUpload size={18} /></span><div><h2>Imagen principal</h2><p>Selecciona la imagen que se mostrara en la tienda online.</p></div></header>
                  <div className="brand-general-grid reward-image-grid">
                    <div className="reward-image-row">
                      {previewImageUrl ? (
                        <figure className="reward-image-preview">
                          <img alt="Vista previa del producto" src={previewImageUrl} />
                          <figcaption>{selectedFile ? 'Imagen nueva seleccionada' : 'Imagen actual del producto'}</figcaption>
                          {existingImageUrl && !selectedFile ? (
                            <button className="brand-file-button" type="button" onClick={() => void reframeImage({ kind: 'main' }, existingImageUrl)}>Ajustar encuadre</button>
                          ) : null}
                        </figure>
                      ) : null}
                      <div className={`brand-upload-zone${dragging ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                        <input ref={fileInput} accept="image/png,image/jpeg,image/webp,.jpg,.jpeg" onChange={onFileChange} type="file" />
                        <span className="brand-upload-icon"><CloudUpload size={23} /></span>
                        <div><p>Arrastra y suelta una imagen aqui o <button type="button" onClick={() => fileInput.current?.click()}>selecciona un archivo</button></p><small>{selectedFile ? selectedFile.name : existingImageUrl ? 'Imagen actual cargada - selecciona otra para reemplazarla' : 'PNG, JPG o WEBP - maximo 10 MB'}</small></div>
                        <button className="brand-file-button" type="button" onClick={() => fileInput.current?.click()}>Seleccionar archivo</button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {canSave ? (
                <footer className="brand-form-actions">
                  <button className="primary" disabled={submitting || !form.brandId || !form.name.trim() || !form.price} type="submit"><Save size={17} />{submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}</button>
                </footer>
              ) : null}
            </form>
          </>
        )}
      </div>
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          title={cropTarget?.kind === 'variant' ? 'Ajusta la imagen de la variante' : 'Ajusta la imagen del producto'}
          onCancel={() => { setCropFile(null); setCropTarget(null); }}
          onCropped={onCropConfirm}
        />
      ) : null}
    </AdminRoutedShell>
  );
}
