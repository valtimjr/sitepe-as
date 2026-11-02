"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderTree } from 'lucide-react';
import { useAppRefresh } from '@/hooks/useAppRefresh';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { getMenuStructure } from '@/services/customListService';
import { MenuItem } from '@/types/supabase';
import { showError } from '@/utils/toast';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import { Skeleton } from '@/components/ui/skeleton';
import { collectExpandableIds, countLists } from '@/lib/menuTree';
import { cn } from '@/lib/utils';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CatalogCategoryCard from '@/components/catalog/CatalogCategoryCard';

const CustomMenuOverview: React.FC = () => {
  const { company, branding } = useCompany();
  const isCompact = useIsCompact();
  const [menuHierarchy, setMenuHierarchy] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = `Catálogo de Peças - AutoBoard (${branding.name})`;
  }, [branding.name]);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const structure = await getMenuStructure(company);
      setMenuHierarchy(structure);
      // Categorias de topo começam abertas
      setExpandedIds(new Set(structure.map(item => item.id)));
    } catch (error) {
      console.error('Erro ao carregar o catálogo de peças:', error);
      showError('Erro ao carregar o catálogo de peças.');
      setMenuHierarchy([]);
    } finally {
      setIsLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useAppRefresh(loadMenu);

  const expandableIds = useMemo(() => collectExpandableIds(menuHierarchy), [menuHierarchy]);
  const listsCount = useMemo(() => countLists(menuHierarchy), [menuHierarchy]);
  const allExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id));

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = () => setExpandedIds(allExpanded ? new Set() : new Set(expandableIds));

  return (
    <div
      className={cn(
        'min-h-screen p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background',
        isCompact ? 'pb-28' : 'flex flex-col items-center',
      )}
    >
      <div className={cn('w-full', !isCompact && 'max-w-4xl')}>
        <CatalogHeader
          compact={isCompact}
          company={company}
          brandingName={branding.name}
          categoriesCount={menuHierarchy.length}
          listsCount={listsCount}
          allExpanded={allExpanded}
          canToggle={expandableIds.length > 0}
          onToggleAll={handleToggleAll}
        />

        {isLoading ? (
          <div className={cn(isCompact ? 'space-y-2.5' : 'grid gap-3 md:grid-cols-2')} data-testid="catalog-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : menuHierarchy.length === 0 ? (
          <div className="flex flex-col items-center text-center text-muted-foreground py-16 px-6 border border-dashed rounded-lg">
            <FolderTree className="h-12 w-12 mb-3 opacity-20" />
            <p>Nenhuma lista ou categoria configurada para esta empresa.</p>
          </div>
        ) : (
          <div className={cn(isCompact ? 'space-y-2.5' : 'grid gap-3 md:grid-cols-2 items-start')}>
            {menuHierarchy.map(item => (
              <CatalogCategoryCard
                key={item.id}
                item={item}
                company={company}
                compact={isCompact}
                expandedIds={expandedIds}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
      {!isCompact && (
        <div className="mt-8">
          <MadeWithDyad />
        </div>
      )}
    </div>
  );
};

export default CustomMenuOverview;
