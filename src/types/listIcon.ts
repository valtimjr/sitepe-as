export type ListIconSource = 'emoji' | 'lucide' | 'heroicons-outline' | 'heroicons-solid';

export interface ListIcon {
  source: ListIconSource;
  /** Emoji nativo ("🚚"), nome Lucide ("Truck") ou nome Heroicons ("TruckIcon") */
  value: string;
  /** HEX, "transparent" ou "linear-gradient(...)" / "radial-gradient(...)" */
  color?: string;
  /** Idem */
  background?: string;
}

const SOURCES: ListIconSource[] = ['emoji', 'lucide', 'heroicons-outline', 'heroicons-solid'];

/** Valida um ícone vindo de fontes externas (nuvem, JSON). */
export const sanitizeListIcon = (value: unknown): ListIcon | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (!SOURCES.includes(v.source as ListIconSource) || typeof v.value !== 'string' || !v.value) return undefined;
  const icon: ListIcon = { source: v.source as ListIconSource, value: v.value.slice(0, 64) };
  if (typeof v.color === 'string' && v.color) icon.color = v.color.slice(0, 500);
  if (typeof v.background === 'string' && v.background) icon.background = v.background.slice(0, 500);
  return icon;
};
