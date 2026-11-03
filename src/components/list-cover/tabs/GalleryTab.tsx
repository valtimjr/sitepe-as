import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ListCover } from '@/types/listCover';
import { AUTOMOTIVE_PRESETS, COLOR_PRESETS, GRADIENT_PRESETS, pexelsThumb } from '@/lib/coverPresets';
import { fetchDefaultCovers, type DefaultCoverCategory } from '@/services/coverService';

interface GalleryTabProps {
  current?: ListCover | null;
  onSelect: (cover: ListCover) => void;
}

// Cache da sessão: evita buscar as capas padrão toda vez que o seletor abre
let defaultsCache: DefaultCoverCategory[] | null = null;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1.5">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{children}</div>
  </section>
);

const Thumb: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  img?: string;
  testId?: string;
}> = ({ label, selected, onClick, style, img, testId }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={selected}
    data-testid={testId}
    className={cn(
      'relative aspect-video w-full overflow-hidden rounded-none border border-border bg-muted transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
    )}
    style={style}
  >
    {img && <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />}
    {selected && (
      <span className="absolute right-1 top-1 bg-primary p-0.5 text-primary-foreground">
        <Check className="h-3 w-3" />
      </span>
    )}
  </button>
);

const GalleryTab: React.FC<GalleryTabProps> = ({ current, onSelect }) => {
  const [categories, setCategories] = useState<DefaultCoverCategory[] | null>(defaultsCache);

  useEffect(() => {
    if (defaultsCache) return;
    let cancelled = false;
    fetchDefaultCovers()
      .then((cats) => {
        defaultsCache = cats;
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isSelected = (value: string) => current?.value === value;

  return (
    <div className="space-y-4" data-testid="cover-gallery">
      <Section title="Cores">
        {COLOR_PRESETS.map((p) => (
          <Thumb
            key={p.cover.value}
            label={p.label}
            selected={isSelected(p.cover.value)}
            onClick={() => onSelect(p.cover)}
            style={{ background: p.cover.value }}
            testId="cover-preset-color"
          />
        ))}
      </Section>
      <Section title="Gradientes">
        {GRADIENT_PRESETS.map((p) => (
          <Thumb
            key={p.cover.value}
            label={p.label}
            selected={isSelected(p.cover.value)}
            onClick={() => onSelect(p.cover)}
            style={{ background: p.cover.value }}
            testId="cover-preset-gradient"
          />
        ))}
      </Section>

      {categories === null ? (
        <section className="space-y-1.5">
          <Skeleton className="h-3 w-24 rounded-none" />
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-none" />
            ))}
          </div>
        </section>
      ) : categories.length > 0 ? (
        categories.map((cat) => (
          <Section key={cat.name} title={cat.name}>
            {cat.images.map((img) => (
              <Thumb
                key={img.url}
                label={img.name}
                img={img.url}
                selected={isSelected(img.url)}
                onClick={() => onSelect({ kind: 'image', source: 'default', value: img.url })}
                testId="cover-preset-default"
              />
            ))}
          </Section>
        ))
      ) : (
        <Section title="Coleção automotiva">
          {AUTOMOTIVE_PRESETS.map((p) => (
            <Thumb
              key={p.cover.value}
              label={p.label}
              img={pexelsThumb(p.cover.value)}
              selected={isSelected(p.cover.value)}
              onClick={() => onSelect(p.cover)}
              testId="cover-preset-automotive"
            />
          ))}
        </Section>
      )}
    </div>
  );
};

export default GalleryTab;
