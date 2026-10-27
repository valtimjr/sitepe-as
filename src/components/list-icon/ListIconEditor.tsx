import React, { useState } from 'react';
import { ChevronDown, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ListIcon as ListIconData, ListIconSource } from '@/types/listIcon';
import ListIcon, { getAutoListIcon } from './ListIcon';
import IconPickerPopover from './IconPickerPopover';
import { ColorPickerDialog, ColorSwatchButton } from './ColorPickerDialog';

interface ListIconEditorProps {
  name: string;
  icon: ListIconData | null;
  onChange: (icon: ListIconData | null) => void;
}

/** Bloco de pré-visualização + "Editar ícone" + cores + "Automático". */
const ListIconEditor: React.FC<ListIconEditorProps> = ({ name, icon, onChange }) => {
  const [colorTarget, setColorTarget] = useState<'color' | 'background' | null>(null);
  const isEmoji = icon?.source === 'emoji';

  // Ao personalizar a partir do automático, parte do ícone e da cor atuais
  const base = (): ListIconData => {
    if (icon) return icon;
    const auto = getAutoListIcon(name);
    return { source: 'lucide', value: auto.name, color: auto.colorHex };
  };

  const handleSelect = (source: ListIconSource, value: string) => {
    const next: ListIconData = { ...base(), source, value };
    if (source === 'emoji') delete next.color;
    onChange(next);
  };

  const handleColor = (value: string) => {
    if (!colorTarget) return;
    onChange({ ...base(), [colorTarget]: value });
  };

  const iconColorButton = (
    <ColorSwatchButton
      label="Cor do ícone"
      value={isEmoji ? undefined : icon?.color ?? getAutoListIcon(name).colorHex}
      onClick={() => setColorTarget('color')}
      disabled={isEmoji}
      title={isEmoji ? 'Emojis usam as próprias cores' : undefined}
      data-testid="list-icon-color"
    />
  );

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-3" data-testid="list-icon-editor">
      <ListIcon name={name} icon={icon} size="lg" className="border border-border shadow-sm" />

      <IconPickerPopover icon={icon} onSelect={handleSelect}>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" data-testid="edit-list-icon">
          <Pencil className="h-3.5 w-3.5" />
          Editar ícone
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </IconPickerPopover>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isEmoji ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{iconColorButton}</span>
              </TooltipTrigger>
              <TooltipContent>Emojis usam as próprias cores</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          iconColorButton
        )}
        <ColorSwatchButton
          label="Fundo"
          value={icon?.background}
          onClick={() => setColorTarget('background')}
          data-testid="list-icon-background"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => onChange(null)}
          disabled={!icon}
          data-testid="list-icon-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Automático
        </Button>
      </div>

      <ColorPickerDialog
        open={colorTarget !== null}
        onOpenChange={open => !open && setColorTarget(null)}
        value={colorTarget === 'background' ? icon?.background : icon?.color ?? getAutoListIcon(name).colorHex}
        onChange={handleColor}
        title={colorTarget === 'background' ? 'Cor do fundo' : 'Cor do ícone'}
        allowTransparent={colorTarget === 'background'}
      />
    </div>
  );
};

export default ListIconEditor;
