import React, { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import ListIcon from '@/components/list-icon/ListIcon';
import type { LocalList } from '@/services/localListStorage';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ListChipsProps {
  lists: LocalList[];
  activeListId: string;
  onSelect: (id: string) => void;
  onOpenOptions: (list: LocalList) => void;
  onCreate: () => void;
}

const LONG_PRESS_MS = 500;

/** Chips roláveis das listas: toque troca, toque na ativa (ou segurar) abre as opções. */
const ListChips: React.FC<ListChipsProps> = ({ lists, activeListId, onSelect, onOpenOptions, onCreate }) => {
  const activeRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>();
  const longPressed = useRef(false);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeListId]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancelPress = () => window.clearTimeout(timer.current);

  return (
    <div
      className="-mx-4 px-4 mt-2 flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Suas listas"
      data-no-ptr
      data-testid="list-chips"
    >
      {lists.map((list) => {
        const isActive = list.id === activeListId;
        return (
          <button
            key={list.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            aria-label={list.name}
            aria-pressed={isActive}
            data-testid="list-chip"
            className={cn(
              'relative snap-start shrink-0 flex items-center gap-1.5 h-10 max-w-[200px] pl-1.5 pr-3 border text-sm select-none transition-colors [-webkit-touch-callout:none]',
              isActive
                ? 'border-primary/60 bg-primary/10 text-primary font-bold'
                : 'border-border bg-card text-muted-foreground font-semibold active:bg-muted',
            )}
            onPointerDown={() => {
              longPressed.current = false;
              cancelPress();
              timer.current = window.setTimeout(() => {
                longPressed.current = true;
                tap();
                onOpenOptions(list);
              }, LONG_PRESS_MS);
            }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (longPressed.current) return;
              tap();
              if (isActive) onOpenOptions(list);
              else onSelect(list.id);
            }}
          >
            <ListIcon name={list.name} icon={list.icon} size="xs" className="p-1" />
            <span className="truncate">{list.name}</span>
            <span className={cn('text-[11px] font-medium', isActive ? 'text-primary/80' : 'text-muted-foreground/80')}>
              {list.items?.length || 0}
            </span>
            {isActive && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary" aria-hidden="true" />}
          </button>
        );
      })}
      <button
        type="button"
        className="snap-start shrink-0 flex items-center gap-1 h-10 px-3 border border-dashed border-primary/40 text-sm font-semibold text-primary active:bg-primary/10"
        onClick={() => {
          tap();
          onCreate();
        }}
        aria-label="Nova lista"
        data-testid="list-chip-new"
      >
        <Plus className="h-4 w-4" /> Nova
      </button>
    </div>
  );
};

export default ListChips;
