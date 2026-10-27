import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { readThemeRgb } from '@/lib/themeColor';

type PickerModule = {
  Picker: React.ComponentType<Record<string, unknown>>;
  data: unknown;
  i18n: unknown;
};

let pickerPromise: Promise<PickerModule> | null = null;

const loadPicker = () => {
  if (!pickerPromise) {
    pickerPromise = Promise.all([
      import('@emoji-mart/react'),
      import('@emoji-mart/data'),
      import('@emoji-mart/data/i18n/pt.json'),
    ]).then(([picker, data, i18n]) => ({
      Picker: picker.default as React.ComponentType<Record<string, unknown>>,
      data: (data as { default?: unknown }).default ?? data,
      i18n: (i18n as { default?: unknown }).default ?? i18n,
    }));
    pickerPromise.catch(() => {
      pickerPromise = null;
    });
  }
  return pickerPromise;
};

interface EmojiTabProps {
  onSelect: (native: string) => void;
}

const EmojiTab: React.FC<EmojiTabProps> = ({ onSelect }) => {
  const [mod, setMod] = useState<PickerModule | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    let cancelled = false;
    loadPicker()
      .then(m => !cancelled && setMod(m))
      .catch(err => console.error('Erro ao carregar emojis:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // As variáveis do emoji-mart são definidas em :host, então precisam ir inline no próprio elemento
  useEffect(() => {
    if (!mod || !wrapperRef.current) return;
    const apply = () => {
      const el = wrapperRef.current?.querySelector('em-emoji-picker') as HTMLElement | null;
      if (!el) return false;
      el.style.setProperty('--rgb-accent', readThemeRgb('--primary').join(', '));
      el.style.setProperty('--rgb-background', readThemeRgb('--popover', isDark ? [15, 23, 42] : [255, 255, 255]).join(', '));
      el.style.setProperty('--rgb-color', readThemeRgb('--popover-foreground', isDark ? [248, 250, 252] : [15, 23, 42]).join(', '));
      el.style.setProperty('--shadow', 'none');
      el.style.width = '100%';
      el.style.height = '340px';
      return true;
    };
    if (apply()) return;
    const raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, [mod, isDark]);

  if (!mod) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const { Picker } = mod;

  return (
    <div ref={wrapperRef} className="flex justify-center" data-testid="emoji-picker">
      <Picker
        data={mod.data}
        i18n={mod.i18n}
        locale="pt"
        theme={isDark ? 'dark' : 'light'}
        onEmojiSelect={(e: { native?: string }) => e.native && onSelect(e.native)}
        previewPosition="none"
        skinTonePosition="search"
        dynamicWidth
        autoFocus
      />
    </div>
  );
};

export default EmojiTab;
