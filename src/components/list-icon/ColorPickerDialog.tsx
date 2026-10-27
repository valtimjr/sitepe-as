import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Grid, Palette, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  GradientStop, GradientValue, gradientToCss, isGradient, parseCssGradient, randomId,
} from '@/lib/gradient';
import { isHexColor, readThemeRgb, rgbToHex } from '@/lib/themeColor';

// 12 tons do Tailwind × 10 níveis (50 a 900)
const HUES = [
  ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314'],
  ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
  ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
  ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
  ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
  ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
  ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'],
];

const COLORS: string[] = [];
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < HUES.length; col++) COLORS.push(HUES[col][row]);
}

const CHECKER =
  'bg-[linear-gradient(45deg,#bbb_25%,transparent_25%),linear-gradient(-45deg,#bbb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#bbb_75%),linear-gradient(-45deg,transparent_75%,#bbb_75%)] bg-[size:6px_6px] bg-[position:0_0,0_3px,3px_-3px,-3px_0] bg-white';

const TransparentMark: React.FC = () => (
  <>
    <div className={cn('absolute inset-0 opacity-60 pointer-events-none', CHECKER)} />
    <div className="w-[140%] h-[1.5px] bg-destructive rotate-45 absolute top-1/2 left-1/2 -ml-[70%] -mt-[0.75px] pointer-events-none" />
  </>
);

export const colorLabel = (value?: string) => {
  if (!value) return 'Padrão';
  if (value === 'transparent') return 'Transparente';
  if (isGradient(value)) return 'Degradê';
  return value.toUpperCase();
};

const darken = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.round(v * (1 - amount))));
  return rgbToHex(ch as [number, number, number]);
};

const buildPresets = (primary: string): GradientValue[] => {
  const mk = (type: GradientValue['type'], angle: number, colors: string[]): GradientValue => ({
    type,
    angle,
    stops: colors.map((color, i) => ({
      id: randomId(),
      color,
      position: colors.length > 1 ? Math.round((i / (colors.length - 1)) * 100) : 0,
    })),
  });
  return [
    mk('linear', 135, [primary, darken(primary, 0.45)]),
    mk('linear', 90, [primary, '#A855F7']),
    mk('radial', 90, [primary, '#0F172A']),
    mk('linear', 90, ['#38BDF8', '#22C55E']),
    mk('linear', 135, ['#EA580C', '#EAB308']),
    mk('linear', 180, ['#EF4444', '#3B82F6']),
    mk('linear', 180, ['#F8FAFC', '#94A3B8']),
    mk('linear', 180, ['#334155', '#0F172A']),
  ];
};

interface ColorPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string;
  onChange: (color: string) => void;
  title?: string;
  allowTransparent?: boolean;
}

export function ColorPickerDialog({
  open, onOpenChange, value, onChange, title = 'Seletor de Cores', allowTransparent = true,
}: ColorPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>('solid');
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [solid, setSolid] = useState('#3B82F6');
  const [hexInput, setHexInput] = useState('#3B82F6');
  const barRef = useRef<HTMLDivElement>(null);

  const primaryHex = useMemo(() => rgbToHex(readThemeRgb('--primary')), [open]);
  const presets = useMemo(() => buildPresets(primaryHex), [primaryHex]);

  const [gradient, setGradient] = useState<GradientValue>(() => buildPresets('#0073E6')[0]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);

  // Sincroniza o estado ao abrir
  useEffect(() => {
    if (!open) return;
    setIsAdvanced(false);
    if (isGradient(value)) {
      setActiveTab('gradient');
      const parsed = parseCssGradient(value);
      if (parsed) {
        setGradient(parsed);
        setSelectedStopId(parsed.stops[0]?.id ?? null);
      }
      setSolid(primaryHex);
      setHexInput(primaryHex);
    } else {
      setActiveTab('solid');
      const base = value || primaryHex;
      setSolid(base);
      setHexInput(base === 'transparent' ? 'TRANSPARENTE' : base.toUpperCase());
      const g = buildPresets(primaryHex)[0];
      setGradient(g);
      setSelectedStopId(g.stops[0].id);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrastar paradas
  useEffect(() => {
    if (!draggingStopId) return;
    const update = (clientX: number) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const percent = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
      setGradient(prev => ({
        ...prev,
        stops: prev.stops.map(s => (s.id === draggingStopId ? { ...s, position: percent } : s)),
      }));
    };
    const onMove = (e: PointerEvent) => update(e.clientX);
    const onUp = () => setDraggingStopId(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingStopId]);

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || (e.target as HTMLElement).closest('.stop-handle')) return;
    const rect = barRef.current.getBoundingClientRect();
    const percent = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const ref = gradient.stops.find(s => s.id === selectedStopId) || gradient.stops[0];
    const newStop: GradientStop = { id: randomId(), color: ref?.color ?? primaryHex, position: percent };
    setGradient(prev => ({ ...prev, stops: [...prev.stops, newStop] }));
    setSelectedStopId(newStop.id);
  };

  const handleAngleDialDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dial = e.currentTarget;
    const move = (ev: PointerEvent) => {
      const rect = dial.getBoundingClientRect();
      const dx = ev.clientX - (rect.left + rect.width / 2);
      const dy = ev.clientY - (rect.top + rect.height / 2);
      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI) + 90;
      if (deg < 0) deg += 360;
      setGradient(prev => ({ ...prev, angle: deg % 360 }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pickAndClose = (color: string) => {
    onChange(color);
    onOpenChange(false);
  };

  const handleApply = () => {
    if (activeTab === 'gradient') onChange(gradientToCss(gradient));
    else if (solid === 'transparent' && allowTransparent) onChange('transparent');
    else if (isHexColor(solid)) onChange(solid.toUpperCase());
    onOpenChange(false);
  };

  const activeStop = gradient.stops.find(s => s.id === selectedStopId);
  const safeSolid = isHexColor(solid) ? solid : '#FFFFFF';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm w-[calc(100vw-2rem)] p-0 gap-0 flex flex-col max-h-[92vh] overflow-hidden"
        data-testid="color-picker-dialog"
      >
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm font-bold uppercase tracking-widest text-primary">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'solid' | 'gradient')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger
                value="solid"
                className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Sólido
              </TabsTrigger>
              <TabsTrigger
                value="gradient"
                className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Degradê
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-y-auto px-4 pb-4 flex-1">
          {activeTab === 'solid' ? (
            isAdvanced ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsAdvanced(false)} title="Voltar para paleta">
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
                <HexColorPicker
                  color={safeSolid}
                  onChange={c => {
                    setSolid(c);
                    setHexInput(c.toUpperCase());
                  }}
                  style={{ width: '100%' }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">HEX</span>
                  <Input
                    value={hexInput}
                    onChange={e => {
                      setHexInput(e.target.value);
                      setSolid(e.target.value.trim());
                    }}
                    className="h-8 w-28 font-mono text-xs font-bold"
                    spellCheck={false}
                  />
                  <div className="h-8 w-8 rounded-md border border-border" style={{ background: safeSolid }} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-12 border border-border rounded-lg overflow-hidden">
                  {COLORS.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      type="button"
                      className={cn(
                        'aspect-square w-full hover:scale-125 transition-transform hover:z-10 focus-visible:z-10 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        solid.toLowerCase() === c && 'ring-2 ring-primary z-10'
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => pickAndClose(c.toUpperCase())}
                      title={c.toUpperCase()}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 bg-muted/50 p-2.5 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground">HEX</span>
                    <Input
                      value={hexInput}
                      onChange={e => {
                        setHexInput(e.target.value);
                        setSolid(e.target.value.trim());
                      }}
                      className="h-8 w-28 font-mono text-xs font-bold"
                      spellCheck={false}
                      aria-label="Cor HEX"
                    />
                    {allowTransparent && (
                      <button
                        type="button"
                        onClick={() => pickAndClose('transparent')}
                        className={cn(
                          'w-8 h-8 rounded-md border relative overflow-hidden shrink-0',
                          value === 'transparent' ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground'
                        )}
                        title="Sem cor (transparente)"
                        aria-label="Transparente"
                      >
                        <TransparentMark />
                      </button>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsAdvanced(true)} title="Cores avançadas">
                    <Palette className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                  {(['linear', 'radial'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setGradient(prev => ({ ...prev, type }))}
                      className={cn(
                        'px-3 py-1 text-[10px] rounded font-bold uppercase tracking-wider transition-colors',
                        gradient.type === type ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {type === 'linear' ? 'Linear' : 'Radial'}
                    </button>
                  ))}
                </div>

                {gradient.type === 'linear' && (
                  <div className="flex items-center gap-2">
                    <div
                      className="relative w-8 h-8 rounded-full border border-border bg-muted flex items-center justify-center cursor-pointer select-none touch-none"
                      onPointerDown={handleAngleDialDown}
                      title="Arraste para girar"
                    >
                      <div className="absolute w-0.5 h-3 bg-primary origin-bottom" style={{ transform: `rotate(${gradient.angle}deg)`, bottom: '50%' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/70 z-10" />
                    </div>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        value={gradient.angle}
                        onChange={e => {
                          const val = Math.max(0, Math.min(360, parseInt(e.target.value) || 0));
                          setGradient(prev => ({ ...prev, angle: val }));
                        }}
                        className="h-8 w-16 text-xs font-mono font-bold text-center px-1"
                        aria-label="Ângulo"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold ml-0.5">°</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Paradas de cor</span>
                <div
                  ref={barRef}
                  onClick={handleBarClick}
                  className="relative h-7 rounded-md border border-border cursor-crosshair select-none touch-none"
                  style={{ background: gradientToCss({ ...gradient, type: 'linear', angle: 90 }) }}
                >
                  {gradient.stops.map(stop => {
                    const selected = selectedStopId === stop.id;
                    return (
                      <div
                        key={stop.id}
                        className={cn(
                          'stop-handle absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 rounded-full border-2 bg-card cursor-pointer flex items-center justify-center shadow',
                          selected ? 'border-primary z-30' : 'border-white z-20'
                        )}
                        style={{ left: `${stop.position}%` }}
                        onPointerDown={e => {
                          e.stopPropagation();
                          setSelectedStopId(stop.id);
                          setDraggingStopId(stop.id);
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stop.color }} />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground italic">Clique na barra para inserir uma parada e arraste para mudar a posição.</p>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {gradient.stops.map(stop => {
                  const selected = selectedStopId === stop.id;
                  return (
                    <div
                      key={stop.id}
                      onClick={() => setSelectedStopId(stop.id)}
                      className={cn(
                        'flex items-center justify-between p-1.5 rounded-md cursor-pointer border transition-colors',
                        selected ? 'bg-primary/10 border-primary/60' : 'bg-muted/40 border-border hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: stop.color }} />
                        <span className="text-xs uppercase font-mono font-bold">{stop.color}</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input
                          type="number"
                          value={stop.position}
                          onChange={e => {
                            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                            setGradient(prev => ({
                              ...prev,
                              stops: prev.stops.map(s => (s.id === stop.id ? { ...s, position: val } : s)),
                            }));
                          }}
                          className="h-6 w-14 text-[11px] font-mono font-bold text-center px-1"
                          aria-label="Posição"
                        />
                        <span className="text-[10px] text-muted-foreground font-bold">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          disabled={gradient.stops.length <= 2}
                          onClick={() => {
                            setGradient(prev => ({ ...prev, stops: prev.stops.filter(s => s.id !== stop.id) }));
                            if (selectedStopId === stop.id) setSelectedStopId(null);
                          }}
                          title="Remover parada"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeStop && (
                <div className="border border-border rounded-lg p-2 bg-muted/30">
                  <HexColorPicker
                    color={isHexColor(activeStop.color) ? activeStop.color : '#FFFFFF'}
                    onChange={c =>
                      setGradient(prev => ({
                        ...prev,
                        stops: prev.stops.map(s => (s.id === activeStop.id ? { ...s, color: c.toUpperCase() } : s)),
                      }))
                    }
                    style={{ width: '100%', height: 150 }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Predefinições</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const stops = preset.stops.map(s => ({ ...s, id: randomId() }));
                        setGradient({ ...preset, stops });
                        setSelectedStopId(stops[0]?.id ?? null);
                      }}
                      className="w-8 h-8 rounded-md border border-border flex-shrink-0 hover:border-primary active:scale-95 transition-transform"
                      style={{ background: gradientToCss(preset) }}
                      aria-label={`Degradê predefinido ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 p-3 border-t border-border bg-muted/30 sm:space-x-0">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" className="flex-1" onClick={handleApply} data-testid="color-picker-apply">
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ColorSwatchButtonProps {
  label: string;
  value?: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  'data-testid'?: string;
}

/** Botão de amostra que mostra a cor atual e abre o ColorPickerDialog. */
export const ColorSwatchButton: React.FC<ColorSwatchButtonProps> = ({ label, value, onClick, disabled, title, ...rest }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title ?? colorLabel(value)}
    data-testid={rest['data-testid']}
    className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-input bg-background text-xs hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    <span className="text-muted-foreground">{label}</span>
    <span
      className={cn('relative h-5 w-5 rounded border border-border overflow-hidden shrink-0', !value && 'bg-muted')}
      style={value && value !== 'transparent' ? { background: value } : undefined}
    >
      {value === 'transparent' && <TransparentMark />}
    </span>
  </button>
);

export default ColorPickerDialog;
