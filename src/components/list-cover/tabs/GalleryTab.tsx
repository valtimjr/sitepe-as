import React, { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ListCover } from '@/types/listCover';
import { AUTOMOTIVE_PRESETS, COLOR_PRESETS, GRADIENT_PRESETS, pexelsThumb } from '@/lib/coverPresets';
import { isGradient } from '@/lib/gradient';
import { fetchDefaultCovers, type DefaultCoverCategory } from '@/services/coverService';
import ColorPickerDialog from '@/components/list-icon/ColorPickerDialog';

interface GalleryTabProps {
  current?: ListCover | null;
  onSelect: (cover: ListCover) => void;
  /** Avisa quando o seletor de cor (diálogo por cima) abre ou fecha. */
  onNestedDialogChange?: (open: boolean) => void;
}

// Cache da sessão: evita buscar as capas padrão toda vez que o seletor abre
let defaultsCache: DefaultCoverCategory[] | null = null;

const PRESET_VALUES = new Set([...COLOR_PRESETS, ...GRADIENT_PRESETS].map((p) => p.cover.value));

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
  className?: string;
  children?: React.ReactNode;
}> = ({ label, selected, onClick, style, img, testId, className, children }) => (
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
      className,
    )}
    style={style}
  >
    {img && <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />}
    {children}
    {selected && (
      <span className="absolute right-1 top-1 bg-primary p-0.5 text-primary-foreground">
        <Check className="h-3 w-3" />
      </span>
    )}
  </button>
);

const GalleryTab: React.FC<GalleryTabProps> = ({ current, onSelect, onNestedDialogChange }) => {
  const [categories, setCategories] = useState<DefaultCoverCategory[] | null>(defaultsCache);
  const [picker, setPicker] = useState<'solid' | 'gradient' | null>(null);

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

  const customColor = current?.kind === 'color' && !PRESET_VALUES.has(current.value) ? current.value : undefined;
  const customGradient = current?.kind === 'gradient' && !PRESET_VALUES.has(current.value) ? current.value : undefined;

  const openPicker = (tab: 'solid' | 'gradient' | null) => {
    setPicker(tab);
    onNestedDialogChange?.(tab !== null);
  };

  const applyCustom = (value: string) => {
    if (!value || value === 'transparent') return;
    onSelect({ kind: isGradient(value) ? 'gradient' : 'color', source: 'gallery', value });
  };

  const customThumb = (tab: 'solid' | 'gradient', value: string | undefined, testId: string) => (
    <Thumb
      label="Personalizar"
      selected={!!value}
      onClick={() => openPicker(tab)}
      style={value ? { background: value } : undefined}
      testId={testId}
      className={cn(!value && 'border-dashed border-muted-foreground/50 bg-background')}
    >
      {!value && (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
          <Palette className="h-4 w-4" />
          Personalizar
        </span>
      )}
    </Thumb>
  );

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
        {customThumb('solid', customColor, 'cover-custom-color')}
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
        {customThumb('gradient', customGradient, 'cover-custom-gradient')}
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

      <ColorPickerDialog
        open={picker !== null}
        onOpenChange={(open) => !open && openPicker(null)}
        value={picker === 'gradient' ? customGradient : picker === 'solid' ? customColor : undefined}
        onChange={applyCustom}
        title="Cor da capa"
        allowTransparent={false}
        initialTab={picker ?? 'solid'}
      />
    </div>
  );
};

export default GalleryTab;
