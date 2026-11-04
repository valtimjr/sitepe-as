import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Cards de carregamento da busca. */
const PartSearchSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <ul className="space-y-2" aria-hidden="true" data-testid="part-search-skeleton">
    {Array.from({ length: count }, (_, i) => (
      <li key={i} className="flex items-start gap-2 rounded-none border bg-card p-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 rounded-none" />
          <Skeleton className="h-3 w-full rounded-none" />
          <Skeleton className="h-3 w-1/3 rounded-none" />
        </div>
        <Skeleton className="h-11 w-11 rounded-none" />
      </li>
    ))}
  </ul>
);

export default PartSearchSkeleton;
