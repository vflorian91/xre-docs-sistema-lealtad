'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';

type Props = {
  file: File;
  onCancel: () => void;
  onCropped: (file: File) => void;
  outputSize?: number; // ancho de la imagen de salida (px); el alto sale de aspect
  aspect?: number; // relación ancho/alto del recorte (1 = cuadrado)
  title?: string;
};

const VIEW_W = 300;

// Recorte con relación de aspecto fija, arrastrar para reposicionar + zoom. Devuelve un File PNG.
export default function ImageCropModal({ file, onCancel, onCropped, outputSize = 900, aspect = 1, title = 'Ajusta la imagen' }: Props) {
  const VIEW_H = Math.round(VIEW_W / aspect);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const image = new Image();
    image.onload = () => {
      const cover = Math.max(VIEW_W / image.naturalWidth, VIEW_H / image.naturalHeight);
      setImg(image);
      setBaseScale(cover);
      setZoom(1);
      // Centrar
      const dispW = image.naturalWidth * cover;
      const dispH = image.naturalHeight * cover;
      setOffset({ x: (VIEW_W - dispW) / 2, y: (VIEW_H - dispH) / 2 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const effectiveScale = baseScale * zoom;
  const dispW = (img?.naturalWidth ?? 0) * effectiveScale;
  const dispH = (img?.naturalHeight ?? 0) * effectiveScale;

  function clamp(x: number, y: number) {
    const minX = Math.min(0, VIEW_W - dispW);
    const minY = Math.min(0, VIEW_H - dispH);
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };
  }

  useEffect(() => {
    setOffset((current) => clamp(current.x, current.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, img]);

  function onPointerDown(event: React.PointerEvent) {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setOffset(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function confirm() {
    if (!img) return;
    setSaving(true);
    try {
      const outW = outputSize;
      const outH = Math.round(outputSize / aspect);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      // Región fuente del original que cae dentro del viewport.
      const srcX = -offset.x / effectiveScale;
      const srcY = -offset.y / effectiveScale;
      const srcW = VIEW_W / effectiveScale;
      const srcH = VIEW_H / effectiveScale;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
      if (!blob) throw new Error('blob');
      const baseName = file.name.replace(/\.[^.]+$/, '');
      onCropped(new File([blob], `${baseName}.png`, { type: 'image/png' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card image-crop-card">
        <header className="modal-header"><div><h2>{title}</h2><p>Arrastra para encuadrar y usa el zoom. Se recorta en cuadrado.</p></div></header>
        <div
          className="image-crop-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ width: VIEW_W, height: VIEW_H }}
        >
          {imgUrl ? (
            <img
              alt="Recorte"
              draggable={false}
              src={imgUrl}
              style={{ position: 'absolute', left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: 'none', userSelect: 'none' }}
            />
          ) : null}
          <span className="image-crop-frame" />
        </div>
        <label className="image-crop-zoom"><ZoomIn size={16} />
          <input max={3} min={1} step={0.01} type="range" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <footer className="modal-actions">
          <button className="admin-secondary" onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={saving || !img} onClick={confirm} type="button">{saving ? 'Procesando...' : 'Usar imagen'}</button>
        </footer>
      </div>
    </div>
  );
}
