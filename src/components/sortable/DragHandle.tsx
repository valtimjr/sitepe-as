import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortableHandle } from './SortableList';

interface DragHandleProps {
  className?: string;
  label?: string;
}

/** Alça de 40px: único ponto de arraste da linha (no toque, segure para arrastar). */
const DragHandle: React.FC<DragHandleProps> = ({ className, label = 'Arrastar para reordenar' }) => {
  const handle = useSortableHandle();
  const base = cn(
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground touch-none select-none',
    className,
  );
  if (!handle) {
    return (
      <span className={base} aria-hidden="true">
        <GripVertical className="h-4 w-4" />
      </span>
    );
  }
  return (
    <button
      type="button"
      ref={handle.setActivatorNodeRef}
      className={cn(base, 'cursor-grab active:cursor-grabbing hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      {...handle.attributes}
      {...handle.listeners}
      aria-label={label}
      data-testid="drag-handle"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
};

export default DragHandle;
