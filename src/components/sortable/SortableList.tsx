import React, { createContext, useContext, useState } from 'react';
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);
  const activeIndex = activeId ? ids.indexOf(activeId) : -1;

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
        <div className={className}>
          {items.map((item, index) => (
            <SortableRow key={ids[index]} id={ids[index]} className={itemClassName}>
              {renderItem(item, index)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeIndex >= 0 ? (
          <div className="rounded-md bg-background shadow-lg ring-2 ring-primary/60 pointer-events-none">
            {/* Sem alça ativa na cópia flutuante (evita herdar a alça de uma lista externa) */}
            <HandleContext.Provider value={null}>
              {renderOverlay ? renderOverlay(items[activeIndex]) : renderItem(items[activeIndex], activeIndex)}
            </HandleContext.Provider>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default SortableList;
