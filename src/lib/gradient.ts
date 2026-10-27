export type GradientType = 'linear' | 'radial';

export type GradientStop = {
  id: string;
  color: string;
  position: number;
};

export type GradientValue = {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
};

export const randomId = () => Math.random().toString(36).slice(2, 10);

export const isGradient = (value?: string | null): boolean =>
  !!value && /^(linear|radial)-gradient\(/.test(value);

export function parseCssGradient(css?: string | null): GradientValue | null {
  if (!css || typeof css !== 'string') return null;
  const match = css.trim().match(/^(linear|radial)-gradient\((.*)\)$/);
  if (!match) return null;
  const type = match[1] as GradientType;
  const parts = match[2].split(/,(?![^(]*\))/).map(s => s.trim());
  let angle = 90;
  let stopStartIndex = 0;

  if (type === 'linear') {
    const angleMatch = parts[0].match(/^([0-9.-]+)deg$/);
    const keywords: Record<string, number> = { 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top': 0 };
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]);
      stopStartIndex = 1;
    } else if (parts[0] in keywords) {
      angle = keywords[parts[0]];
      stopStartIndex = 1;
    }
  } else if (parts[0] === 'circle' || parts[0].startsWith('circle at') || parts[0] === 'ellipse') {
    stopStartIndex = 1;
  }

  const stops: GradientStop[] = [];
  const count = parts.length - stopStartIndex;
  for (let i = stopStartIndex; i < parts.length; i++) {
    const part = parts[i];
    const posMatch = part.match(/(.*)\s+([0-9.-]+)%$/);
    let color = part;
    let position: number;
    if (posMatch) {
      color = posMatch[1].trim();
      position = parseFloat(posMatch[2]);
    } else {
      position = count > 1 ? ((i - stopStartIndex) / (count - 1)) * 100 : 0;
    }
    stops.push({ id: `stop-${i}-${randomId()}`, color, position: Math.round(position) });
  }

  if (stops.length === 0) return null;
  return { type, angle, stops };
}

export function gradientToCss(gradient: GradientValue): string {
  const stopsStr = [...gradient.stops]
    .sort((a, b) => a.position - b.position)
    .map(stop => `${stop.color} ${stop.position}%`)
    .join(', ');
  if (gradient.type === 'radial') return `radial-gradient(circle, ${stopsStr})`;
  return `linear-gradient(${gradient.angle}deg, ${stopsStr})`;
}

/** Converte um ângulo CSS em coordenadas (0–1) para <linearGradient> SVG. */
export function cssAngleToSvgCoords(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad) / 2;
  const dy = -Math.cos(rad) / 2;
  return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
}

export function cssGradientToSvgStops(css: string) {
  const parsed = parseCssGradient(css);
  if (!parsed) return null;
  return {
    type: parsed.type,
    coords: cssAngleToSvgCoords(parsed.angle),
    stops: [...parsed.stops]
      .sort((a, b) => a.position - b.position)
      .map(s => ({ offset: `${s.position}%`, color: s.color })),
  };
}
