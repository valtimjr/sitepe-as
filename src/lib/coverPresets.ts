import type { ListCover } from '@/types/listCover';

export interface CoverPreset {
  label: string;
  cover: ListCover;
}

const color = (label: string, value: string): CoverPreset => ({ label, cover: { kind: 'color', source: 'gallery', value } });
const gradient = (label: string, value: string): CoverPreset => ({ label, cover: { kind: 'gradient', source: 'gallery', value } });

export const COLOR_PRESETS: CoverPreset[] = [
  color('Primária', 'hsl(var(--primary))'),
  color('Laranja', '#f97316'),
  color('Azul petróleo', '#0f766e'),
  color('Grafite', '#374151'),
  color('Azul', '#2563eb'),
  color('Vermelho', '#b91c1c'),
];

export const GRADIENT_PRESETS: CoverPreset[] = [
  gradient('Primária diagonal', 'linear-gradient(135deg, hsl(var(--primary)) 0%, #f97316 100%)'),
  gradient('Pôr do sol', 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)'),
  gradient('Oceano', 'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)'),
  gradient('Grafite', 'linear-gradient(135deg, #111827 0%, #4b5563 100%)'),
  gradient('Campo', 'linear-gradient(135deg, #15803d 0%, #ca8a04 100%)'),
  gradient('Aço', 'linear-gradient(135deg, #64748b 0%, #cbd5e1 100%)'),
];

/** Gradiente mostrado quando uma imagem falha. */
export const FALLBACK_COVER_BG = 'linear-gradient(135deg, hsl(var(--primary) / 0.6) 0%, hsl(var(--muted)) 100%)';

const pexels = (id: number, name: string, url: string): CoverPreset => ({
  label: `Foto: ${name}`,
  cover: {
    kind: 'image',
    source: 'pexels',
    value: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`,
    credit: { name, url },
  },
});

/** Coleção automotiva fixa (reserva caso o bucket esteja vazio). */
export const AUTOMOTIVE_PRESETS: CoverPreset[] = [
  pexels(3807277, 'Andrea Piacquadio', 'https://www.pexels.com/@olly'),
  pexels(4489749, 'cottonbro studio', 'https://www.pexels.com/@cottonbro'),
  pexels(190574, 'Mike Bird', 'https://www.pexels.com/@mikebirdy'),
  pexels(2199293, 'Mike Bird', 'https://www.pexels.com/@mikebirdy'),
  pexels(1267338, 'Pixabay', 'https://www.pexels.com/@pixabay'),
  pexels(2252584, 'Pixabay', 'https://www.pexels.com/@pixabay'),
  pexels(2933243, 'Tom Fisk', 'https://www.pexels.com/@tomfisk'),
  pexels(440731, 'Pixabay', 'https://www.pexels.com/@pixabay'),
];

export const pexelsThumb = (url: string) => url.replace(/w=\d+/, 'w=400');
