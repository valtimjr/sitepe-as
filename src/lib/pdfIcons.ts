import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cssGradientToSvgStops, isGradient } from '@/lib/gradient';
import { loadIconRegistry } from '@/lib/listIconLoader';
import { getAutoListIcon } from '@/components/list-icon/ListIcon';
import type { AnyIconComponent } from '@/lib/listIconRegistry';
import type { ListIcon } from '@/types/listIcon';

/** Cinza claro equivalente ao `bg-muted/80` do app. */
const MUTED_BG = '#EEF1F5';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const VIEWBOX = 24;

const cache = new Map<string, Promise<string | null>>();

const roundedRectPath = (ctx: CanvasRenderingContext2D, size: number, radius: number) => {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(size, 0, size, size, radius);
  ctx.arcTo(size, size, 0, size, radius);
  ctx.arcTo(0, size, 0, 0, radius);
  ctx.arcTo(0, 0, size, 0, radius);
  ctx.closePath();
};

const backgroundFill = (ctx: CanvasRenderingContext2D, background: string | undefined, px: number) => {
  if (!background) return MUTED_BG;
  if (!isGradient(background)) return background;
  const svg = cssGradientToSvgStops(background);
  if (!svg) return MUTED_BG;
  const gradient = svg.type === 'radial'
    ? ctx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2)
    : ctx.createLinearGradient(svg.coords.x1 * px, svg.coords.y1 * px, svg.coords.x2 * px, svg.coords.y2 * px);
  svg.stops.forEach(stop => gradient.addColorStop(Math.min(1, Math.max(0, parseFloat(stop.offset) / 100)), stop.color));
  return gradient;
};

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Gera o SVG do ícone com a cor (sólida ou degradê) aplicada. */
const buildSvgMarkup = (Comp: AnyIconComponent, color: string | undefined, paint: 'stroke' | 'fill', size: number) => {
  const gradientId = 'pdf-icon-gradient';
  const svgStops = color && isGradient(color) ? cssGradientToSvgStops(color) : null;
  const props: Record<string, unknown> = { width: size, height: size };
  if (svgStops) {
    props[paint] = `url(#${gradientId})`;
  } else {
    props.style = { color: color || '#0F172A' };
  }

  let markup = renderToStaticMarkup(createElement(Comp, props));
  if (!/xmlns=/.test(markup)) markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

  if (svgStops) {
    const stops = svgStops.stops
      .map(s => `<stop offset="${escapeAttr(s.offset)}" stop-color="${escapeAttr(s.color)}"/>`)
      .join('');
    const def = svgStops.type === 'radial'
      ? `<radialGradient id="${gradientId}" gradientUnits="userSpaceOnUse" cx="${VIEWBOX / 2}" cy="${VIEWBOX / 2}" r="${VIEWBOX / 2}">${stops}</radialGradient>`
      : `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${svgStops.coords.x1 * VIEWBOX}" y1="${svgStops.coords.y1 * VIEWBOX}" x2="${svgStops.coords.x2 * VIEWBOX}" y2="${svgStops.coords.y2 * VIEWBOX}">${stops}</linearGradient>`;
    markup = markup.replace(/<svg[^>]*>/, open => `${open}<defs>${def}</defs>`);
  }
  return markup;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = src;
  });

const drawSvg = async (ctx: CanvasRenderingContext2D, markup: string, px: number, size: number) => {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const offset = (px - size) / 2;
    ctx.drawImage(img, offset, offset, size, size);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const renderIcon = async (icon: ListIcon | null, name: string, px: number): Promise<string | null> => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    roundedRectPath(ctx, px, px * 0.18);
    ctx.fillStyle = backgroundFill(ctx, icon?.background, px);
    ctx.fill();
    ctx.restore();

    const glyphSize = Math.round(px * 0.6);

    if (icon?.source === 'emoji') {
      ctx.font = `${glyphSize}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon.value, px / 2, px / 2 + px * 0.04);
      return canvas.toDataURL('image/png');
    }

    let Comp: AnyIconComponent | undefined;
    if (icon) {
      const registry = await loadIconRegistry();
      Comp = icon.source === 'lucide'
        ? registry.lucide[icon.value]
        : icon.source === 'heroicons-solid'
          ? registry.heroSolid[icon.value]
          : registry.heroOutline[icon.value];
    }

    if (icon && Comp) {
      const paint = icon.source === 'heroicons-solid' ? 'fill' : 'stroke';
      await drawSvg(ctx, buildSvgMarkup(Comp, icon.color, paint, glyphSize), px, glyphSize);
    } else {
      const auto = getAutoListIcon(name);
      await drawSvg(ctx, buildSvgMarkup(auto.Icon as AnyIconComponent, auto.colorHex, 'stroke', glyphSize), px, glyphSize);
    }
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('Não foi possível gerar o ícone para o PDF:', error);
    return null;
  }
};

/** Desenha o ícone de uma lista (igual ao app) num PNG quadrado e devolve o data URL, ou null se falhar. */
export const renderListIconToPng = (icon: ListIcon | null | undefined, name: string, px = 96): Promise<string | null> => {
  const key = JSON.stringify({ icon: icon ?? null, autoName: icon ? null : name, px });
  let result = cache.get(key);
  if (!result) {
    result = renderIcon(icon ?? null, name, px);
    cache.set(key, result);
    result.then(value => {
      if (!value) cache.delete(key);
    });
  }
  return result;
};

export interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

/** Carrega uma imagem (ex.: logo da empresa) como PNG em data URL, com as dimensões originais. */
export const loadImageAsDataUrl = async (url: string): Promise<LoadedImage | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const sourceUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const img = await loadImage(sourceUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return null;

    // Normaliza para PNG (aceita webp, svg etc. que o jsPDF não lê) e reduz logos grandes.
    const scale = Math.min(1, 360 / height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } catch (error) {
    console.warn('Não foi possível carregar a imagem para o PDF:', error);
    return null;
  }
};
