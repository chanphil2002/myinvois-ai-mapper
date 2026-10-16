import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Slider, Space, Typography, message } from 'antd';
import { MinusOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useTheme } from '../theme/ThemeContext';

const VIEW = 260; // on-screen crop circle (px)
const OUT = 256; // saved image size (px)

interface Props {
  open: boolean;
  onCancel: () => void;
  /** Receives the cropped square image as a JPEG data URL. */
  onConfirm: (dataUrl: string) => void;
  saving?: boolean;
}

/**
 * Pick a photo, then drag to position it and zoom to frame it inside the circle. The saved image is
 * a 256×256 square (shown as a circle everywhere), so it stays small (~20–40 KB).
 */
export default function AvatarCropper({ open, onCancel, onConfirm, saving }: Props) {
  const { palette: p } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setImg(null);
      setZoom(1);
    }
  }, [open]);

  const baseScale = img ? Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight) : 1; // "cover"
  const scale = baseScale * zoom;
  const w = img ? img.naturalWidth * scale : 0;
  const h = img ? img.naturalHeight * scale : 0;
  // Keep the circle fully covered by the photo.
  const clamp = (o: { x: number; y: number }, ww = w, hh = h) => ({
    x: Math.min(0, Math.max(VIEW - ww, o.x)),
    y: Math.min(0, Math.max(VIEW - hh, o.y)),
  });

  const pick = (file: File) => {
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.type)) {
      message.error('Choose a JPEG, PNG or WebP image');
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const s = Math.max(VIEW / image.naturalWidth, VIEW / image.naturalHeight);
      setImg(image);
      setZoom(1);
      setOffset({ x: (VIEW - image.naturalWidth * s) / 2, y: (VIEW - image.naturalHeight * s) / 2 });
    };
    image.onerror = () => message.error("That image couldn't be opened");
    image.src = url;
  };

  /** Zoom around the centre of the circle so the framed area doesn't jump. */
  const setZoomCentered = (next: number) => {
    if (!img) return;
    const z = Math.min(4, Math.max(1, next));
    const cx = (VIEW / 2 - offset.x) / scale; // centre in image pixels
    const cy = (VIEW / 2 - offset.y) / scale;
    const s = baseScale * z;
    setZoom(z);
    setOffset(clamp({ x: VIEW / 2 - cx * s, y: VIEW / 2 - cy * s }, img.naturalWidth * s, img.naturalHeight * s));
  };

  const confirm = () => {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -offset.x / scale, -offset.y / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL('image/jpeg', 0.88));
  };

  return (
    <Modal
      open={open}
      title="Profile photo"
      okText="Save photo"
      okButtonProps={{ disabled: !img }}
      confirmLoading={saving}
      onOk={confirm}
      onCancel={onCancel}
      width={380}
      destroyOnClose
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = '';
        }}
      />
      <Space direction="vertical" size="middle" style={{ width: '100%', alignItems: 'center' }}>
        <div
          onPointerDown={(e) => {
            if (!img) return;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => img && setZoomCentered(zoom - e.deltaY * 0.0015)}
          onClick={() => !img && fileRef.current?.click()}
          style={{
            width: VIEW,
            height: VIEW,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
            cursor: img ? 'grab' : 'pointer',
            touchAction: 'none',
            background: p.subtle,
            boxShadow: `0 0 0 4px ${p.card}, 0 0 0 6px ${p.primary}`,
            userSelect: 'none',
          }}
        >
          {img ? (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{ position: 'absolute', left: offset.x, top: offset.y, width: w, height: h, maxWidth: 'none', pointerEvents: 'none' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: p.textSecondary }}>
              <UploadOutlined style={{ fontSize: 28 }} />
              <span>Choose a photo</span>
            </div>
          )}
        </div>
        {img && (
          <>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Drag to position · zoom to frame
            </Typography.Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: VIEW }}>
              <Button type="text" icon={<MinusOutlined />} aria-label="Zoom out" onClick={() => setZoomCentered(zoom - 0.25)} />
              <Slider style={{ flex: 1 }} min={1} max={4} step={0.01} value={zoom} onChange={setZoomCentered} tooltip={{ open: false }} />
              <Button type="text" icon={<PlusOutlined />} aria-label="Zoom in" onClick={() => setZoomCentered(zoom + 0.25)} />
            </div>
            <Button type="link" onClick={() => fileRef.current?.click()}>
              Choose a different photo
            </Button>
          </>
        )}
      </Space>
    </Modal>
  );
}
