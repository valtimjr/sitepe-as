/** Lê uma variável CSS de cor no formato shadcn ("H S% L%") e devolve [r, g, b]. */
export const readThemeRgb = (varName: string, fallback: [number, number, number] = [0, 115, 230]): [number, number, number] => {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const m = raw.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return fallback;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map(v => Math.round(v * 255)) as [number, number, number];
};

export const rgbToHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

export const isHexColor = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
