import React from 'react';
import {
  Archive, Calendar, Droplet, Package, ShoppingCart, Truck, Wrench, Zap, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isGradient } from '@/lib/gradient';
import { useIconRegistry } from '@/lib/listIconLoader';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import GradientSvgIcon from './GradientSvgIcon';

export interface AutoListIcon {
  Icon: LucideIcon;
  name: string;
  colorClass: string;
  colorHex: string;
}

const AUTO_RULES: { keywords: string[]; icon: AutoListIcon }[] = [
  { keywords: ['caminhão', 'caminhao', 'truck', 'veículo', 'veiculo'], icon: { Icon: Truck, name: 'Truck', colorClass: 'text-amber-500', colorHex: '#F59E0B' } },
  { keywords: ['elétrica', 'eletrica', 'zap', 'energia'], icon: { Icon: Zap, name: 'Zap', colorClass: 'text-yellow-500', colorHex: '#EAB308' } },
  { keywords: ['hidráulica', 'hidraulica', 'água', 'agua', 'óleo', 'oleo'], icon: { Icon: Droplet, name: 'Droplet', colorClass: 'text-blue-500', colorHex: '#3B82F6' } },
  { keywords: ['oficina', 'ferramenta', 'tool', 'manutenção', 'manutencao'], icon: { Icon: Wrench, name: 'Wrench', colorClass: 'text-orange-500', colorHex: '#F97316' } },
  { keywords: ['estoque', 'almoxarifado', 'box', 'armário', 'armario'], icon: { Icon: Archive, name: 'Archive', colorClass: 'text-emerald-500', colorHex: '#10B981' } },
  { keywords: ['compra', 'mercado', 'cart', 'adquirir'], icon: { Icon: ShoppingCart, name: 'ShoppingCart', colorClass: 'text-purple-500', colorHex: '#A855F7' } },
  { keywords: ['preventiva', 'revisão', 'revisao', 'calendário', 'calendario'], icon: { Icon: Calendar, name: 'Calendar', colorClass: 'text-rose-500', colorHex: '#F43F5E' } },
];

const DEFAULT_AUTO: AutoListIcon = { Icon: Package, name: 'Package', colorClass: 'text-slate-500', colorHex: '#64748B' };

/** Ícone automático escolhido pelo nome da lista. */
export const getAutoListIcon = (name: string): AutoListIcon => {
  const lower = (name || '').toLowerCase();
  return AUTO_RULES.find(rule => rule.keywords.some(k => lower.includes(k)))?.icon ?? DEFAULT_AUTO;
};

/** Ícones sugeridos nas abas Lucide/Heroicons (os mesmos do automático). */
export const SUGGESTED_LUCIDE = ['Truck', 'Wrench', 'Zap', 'Droplet', 'Package', 'Archive', 'ShoppingCart', 'Calendar'];
export const SUGGESTED_HERO = ['TruckIcon', 'WrenchIcon', 'BoltIcon', 'BeakerIcon', 'CubeIcon', 'ArchiveBoxIcon', 'ShoppingCartIcon', 'CalendarIcon'];

const SIZES = {
  xs: { box: 'p-0.5', icon: 'h-3.5 w-3.5', emoji: 'text-sm leading-[14px] h-3.5 w-3.5' },
  sm: { box: 'p-1', icon: 'h-4 w-4', emoji: 'text-base leading-4 h-4 w-4' },
  md: { box: 'p-1.5', icon: 'h-5 w-5', emoji: 'text-lg leading-5 h-5 w-5' },
  lg: { box: 'h-16 w-16', icon: 'h-8 w-8', emoji: 'text-4xl leading-none' },
} as const;

export type ListIconSize = keyof typeof SIZES;

interface ListIconProps {
  name: string;
  icon?: ListIconData | null;
  size?: ListIconSize;
  className?: string;
}

/** Ícone de uma lista (personalizado ou automático) com fundo e cor. */
export const ListIcon: React.FC<ListIconProps> = ({ name, icon, size = 'sm', className }) => {
  const s = SIZES[size];
  const needsRegistry = !!icon && icon.source !== 'emoji';
  const registry = useIconRegistry(needsRegistry);
  const auto = getAutoListIcon(name);

  const background = icon?.background;
  const boxStyle: React.CSSProperties | undefined = background ? { background } : undefined;

  let content: React.ReactNode;
  let renderedSource = 'auto';
  let renderedValue = auto.name;

  if (icon?.source === 'emoji') {
    renderedSource = 'emoji';
    renderedValue = icon.value;
    content = (
      <span className={cn('flex items-center justify-center select-none', s.emoji)} role="img" aria-hidden="true">
        {icon.value}
      </span>
    );
  } else {
    const Comp = icon && registry
      ? icon.source === 'lucide'
        ? registry.lucide[icon.value]
        : icon.source === 'heroicons-solid'
          ? registry.heroSolid[icon.value]
          : registry.heroOutline[icon.value]
      : undefined;

    if (icon && Comp) {
      renderedSource = icon.source;
      renderedValue = icon.value;
      const color = icon.color;
      if (color && isGradient(color)) {
        content = (
          <GradientSvgIcon
            Icon={Comp}
            gradient={color}
            paint={icon.source === 'heroicons-solid' ? 'fill' : 'stroke'}
            className={s.icon}
          />
        );
      } else {
        content = (
          <Comp
            className={cn(s.icon, !color && 'text-foreground')}
            style={color ? { color } : undefined}
            aria-hidden="true"
          />
        );
      }
    } else {
      const AutoIcon = auto.Icon;
      content = <AutoIcon className={cn(s.icon, auto.colorClass)} aria-hidden="true" />;
    }
  }

  return (
    <div
      data-testid="list-icon"
      data-icon-source={renderedSource}
      data-icon-value={renderedValue}
      className={cn(
        'shrink-0 flex items-center justify-center overflow-hidden',
        s.box,
        !background && 'bg-muted/80',
        className
      )}
      style={boxStyle}
    >
      {content}
    </div>
  );
};

export default ListIcon;
