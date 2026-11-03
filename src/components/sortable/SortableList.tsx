import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxisModifier } from './modifiers';
import { CSS } from '@dnd-kit/utilities';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface HandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
}

const HandleContext = createContext<HandleProps | null>(null);

/** Props da alça do item sortable atual (usado por DragHandle). */
export const useSortableHandle = () => useContext(HandleContext);

const overlayClass = 'rounded-md bg-background shadow-lg ring-2 ring-primary/60 pointer-events-none';

interface SortableProviderProps {
  ids: string[];
  onReorder: (ids: string[]) => void;
  /** Cópia flutuante do item arrastado. */
  renderOverlay: (id: string) => React.ReactNode;
  /** Desenha a cópia flutuante no body (necessário dentro de <table>). */
  portalOverlay?: boolean;
  children: React.ReactNode;
}

/** Sensores (mouse, toque com long-press de 200ms e teclado), handlers e cópia flutuante. */
const SortableProvider: React.FC<SortableProviderProps> = ({ ids, onReorder, renderOverlay, portalOverlay, children }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleStart = (e: DragStartEvent) => {
    tap();
    setActiveId(String(e.active.id));
  };

  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    tap();
    onReorder(arrayMove(ids, from, to));
  };

  const overlay = (
    <DragOverlay>
      {activeId && ids.includes(activeId) ? (
        <div className={overlayClass}>
          {/* Sem alça ativa na cópia flutuante (evita herdar a alça de uma lista externa) */}
          <HandleContext.Provider value={null}>{renderOverlay(activeId)}</HandleContext.Provider>
        </div>
      ) : null}
    </DragOverlay>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxisModifier]}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Pressione espaço para pegar o item, use as setas para mover e espaço para soltar.',
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {portalOverlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay}
    </DndContext>
  );
};

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Conteúdo flutuante enquanto arrasta (padrão: renderItem). */
  renderOverlay?: (item: T) => React.ReactNode;
  /** Chamado com os ids na nova ordem. */
  onReorder: (ids: string[]) => void;
  className?: string;
  itemClassName?: string;
}

const SortableRow: React.FC<{ id: string; className?: string; children: React.ReactNode }> = ({ id, className, children }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // O espaço do item arrastado fica tracejado: é onde ele vai cair
      className={cn('relative', isDragging && 'z-10 rounded-md opacity-50 outline-dashed outline-2 outline-primary', className)}
      data-sortable-id={id}
    >
      <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>{children}</HandleContext.Provider>
    </div>
  );
};

/** Lista vertical reordenável (mouse, toque com long-press de 200ms e teclado). */
function SortableList<T>({ items, getId, renderItem, renderOverlay, onReorder, className, itemClassName }: SortableListProps<T>) {
  const ids = items.map(getId);
  const overlayFor = (id: string) => {
    const index = ids.indexOf(id);
    if (index < 0) return null;
    return renderOverlay ? renderOverlay(items[index]) : renderItem(items[index], index);
  };

  return (
    <SortableProvider ids={ids} onReorder={onReorder} renderOverlay={overlayFor}>
      <div className={className}>
        {items.map((item, index) => (
          <SortableRow key={ids[index]} id={ids[index]} className={itemClassName}>
            {renderItem(item, index)}
          </SortableRow>
        ))}
      </div>
    </SortableProvider>
  );
}

type SortableTableRowProps = React.HTMLAttributes<HTMLTableRowElement> & { id: string };

/** Linha <tr> reordenável; a alça (DragHandle) fica em qualquer célula dela. */
export const SortableTableRow: React.FC<SortableTableRowProps> = ({ id, className, style, children, ...rest }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <tr
      ref={setNodeRef}
      {...rest}
      style={{ ...style, transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative border-b transition-colors hover:bg-muted/50',
        // O espaço da linha arrastada fica tracejado: é onde ela vai cair
        isDragging && 'z-10 opacity-50 outline-dashed outline-2 -outline-offset-2 outline-primary',
        className,
      )}
      data-sortable-id={id}
    >
      <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>{children}</HandleContext.Provider>
    </tr>
  );
};

interface SortableTableBodyProps {
  ids: string[];
  onReorder: (ids: string[]) => void;
  /** Cópia flutuante (um <div> com a aparência da linha, nunca um <tr>). */
  renderOverlay: (id: string) => React.ReactNode;
  className?: string;
  /** Linhas SortableTableRow (e outras linhas fixas no fim, se preciso). */
  children: React.ReactNode;
}

/** <tbody> reordenável: use SortableTableRow para cada linha. */
export const SortableTableBody: React.FC<SortableTableBodyProps> = ({ ids, onReorder, renderOverlay, className, children }) => (
  <SortableProvider ids={ids} onReorder={onReorder} renderOverlay={renderOverlay} portalOverlay>
    <tbody className={cn('[&_tr:last-child]:border-0', className)}>{children}</tbody>
  </SortableProvider>
);

export default SortableList;
