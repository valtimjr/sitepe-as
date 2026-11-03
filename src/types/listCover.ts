export type ListCoverKind = 'color' | 'gradient' | 'image';
export type ListCoverSource = 'gallery' | 'default' | 'pexels' | 'link' | 'upload-local' | 'upload-b2';

export interface ListCover {
  kind: ListCoverKind;
  /** CSS (cor/gradiente), URL https ou "local:<id>" */
  value: string;
  source: ListCoverSource;
  /** 0–100, padrão 50 */
  posX?: number;
  /** 0–100, padrão 50 */
  posY?: number;
  /** Crédito exigido pelo Pexels */
  credit?: { name: string; url: string };
}

const KINDS: ListCoverKind[] = ['color', 'gradient', 'image'];
const SOURCES: ListCoverSource[] = ['gallery', 'default', 'pexels', 'link', 'upload-local', 'upload-b2'];

const SAFE_CSS = /^[#a-zA-Z0-9\s(),.%-]+$/;

export const LOCAL_COVER_PREFIX = 'local:';

export const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const clampPos = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined);

/** Valida uma capa vinda de fontes externas (nuvem, JSON, banco). */
export const sanitizeListCover = (value: unknown): ListCover | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (!KINDS.includes(v.kind as ListCoverKind) || !SOURCES.includes(v.source as ListCoverSource)) return undefined;
  if (typeof v.value !== 'string' || !v.value) return undefined;
  const kind = v.kind as ListCoverKind;
  const source = v.source as ListCoverSource;
  const raw = v.value.slice(0, 2000);

  if (kind === 'image') {
    if (source === 'upload-local') {
      if (!raw.startsWith(LOCAL_COVER_PREFIX)) return undefined;
    } else if (!isHttpsUrl(raw)) return undefined;
  } else if (!SAFE_CSS.test(raw)) return undefined;

  const cover: ListCover = { kind, source, value: raw };
  const posX = clampPos(v.posX);
  const posY = clampPos(v.posY);
  if (posX !== undefined) cover.posX = posX;
  if (posY !== undefined) cover.posY = posY;
  const credit = v.credit as Record<string, unknown> | undefined;
  if (credit && typeof credit.name === 'string' && typeof credit.url === 'string' && isHttpsUrl(credit.url)) {
    cover.credit = { name: credit.name.slice(0, 120), url: credit.url.slice(0, 500) };
  }
  return cover;
};

/** Capa que pode ir para a nuvem/arquivo (sem upload local). */
export const syncableCover = (cover?: ListCover | null): ListCover | null => {
  const safe = sanitizeListCover(cover);
  return safe && safe.source !== 'upload-local' ? safe : null;
};
