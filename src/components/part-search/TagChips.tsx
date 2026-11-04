import React from 'react';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagChipsProps {
  tags: string[];
  onSearchTag?: (tag: string) => void;
}

/** Tags em chips; tocar num chip busca por ela. */
const TagChips: React.FC<TagChipsProps> = ({ tags, onSearchTag }) => (
  <div className="flex flex-wrap gap-2">
    {tags.map(tag => (
      <button
        key={tag}
        type="button"
        className={cn(badgeVariants({ variant: 'secondary' }), 'min-h-9 rounded-none px-3 text-sm font-medium')}
        onClick={e => {
          e.stopPropagation();
          onSearchTag?.(tag);
        }}
        aria-label={`Buscar pela tag ${tag}`}
        data-testid="part-tag-chip"
      >
        {tag}
      </button>
    ))}
  </div>
);

export default TagChips;
