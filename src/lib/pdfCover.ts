import type { ListCover } from '@/types/listCover';
import { parseCssGradient } from '@/lib/gradient';
import { getLocalCoverBlob } from '@/services/coverService';

const IMAGE_TIMEOUT_MS = 8000;

/** Resolve cores com `var(--x)` (ex.: hsl(var(--primary))) para algo que o canvas entende. */
const resolveColor = (color: string): string => {
  if (!color.includes('var(')) return color;
  const el = document.createElement('span');
  el.style.color = color;
  el.style.display = 'none';
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  el.remove();
  return resolved || '#888888';
};

const paintGradient = (ctx: CanvasRenderingContext2D, css: string, w: number, h: number): boolean => {
  const parsed = parseCssGradient(css);
  if (!parsed) return false;
  let grad: CanvasGradient;
  if (parsed.type === 'radial') {
    // "circle" com farthest-corner, como no CSS
    grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w / 2, h / 2));
  } else {
    // Comprimento da linha do degradê CSS num retângulo w × h
    const rad = (parsed.angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    grad = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
  }
  [...parsed.stops]
    .sort((a, b) => a.position - b.position)
    .forEach((s) => grad.addColorStop(Math.min(1, Math.max(0, s.position / 100)), resolveColor(s.color)));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return true;
};

const fetchCoverBlob = async (cover: ListCover): Promise<Blob | undefined> => {
  if (cover.source === 'upload-local') return getLocalCoverBlob(cover.value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(cover.value, { mode: 'cors', referrerPolicy: 'no-referrer', signal: controller.signal });
    return res.ok ? await res.blob() : undefined;
  } finally {
    clearTimeout(timer);
  }
};

const loadImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem da capa inválida'));
    };
    img.src = url;
  });

/** Corte igual ao `object-cover` + `object-position: posX% posY%`. */
const paintImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, posX: number, posY: number) => {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, ((w - dw) * posX) / 100, ((h - dh) * posY) / 100, dw, dh);
};

/**
 * Desenha a capa (cor, degradê ou imagem) num retângulo e devolve um data URL JPEG.
 * Devolve `null` se não der para desenhar (imagem fora do ar, CORS etc.).
 */
export const renderCoverToPng = async (cover: ListCover | null | undefined, widthPx = 1600, heightPx = 305): Promise<string | null> => {
  if (!cover) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (cover.kind === 'color') {
      ctx.fillStyle = resolveColor(cover.value);
      ctx.fillRect(0, 0, widthPx, heightPx);
    } else if (cover.kind === 'gradient') {
      if (!paintGradient(ctx, cover.value, widthPx, heightPx)) return null;
    } else {
      const blob = await fetchCoverBlob(cover);
      if (!blob) return null;
      const img = await loadImage(blob);
      paintImage(ctx, img, widthPx, heightPx, cover.posX ?? 50, cover.posY ?? 50);
    }

    // Sombra na base, como no app, para o ícone sobreposto continuar legível
    const shade = ctx.createLinearGradient(0, heightPx, 0, heightPx * 0.55);
    shade.addColorStop(0, 'rgba(0,0,0,0.25)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, widthPx, heightPx);

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.warn('Não foi possível desenhar a capa no PDF:', error);
    return null;
  }
};
