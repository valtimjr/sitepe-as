import React from 'react';
import { GripVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableBody } from '@/components/sortable/SortableList';
import type { SimplePartItem } from '@/services/partListService';
import type { RelatedPart } from '@/types/supabase';
import PartsListMobileRow from './PartsListMobileRow';

interface PartsListTableProps {
  items: SimplePartItem[];
  /** Grupos por AF (quando "Agrupar por AF" está ligado; o arrastar fica desligado). */
  groups: [string, SimplePartItem[]][] | null;
  visibleCount: number;
  flashIds: Set<string>;
  nameOf: (item: SimplePartItem) => string | undefined;
  relatedOf: (item: SimplePartItem) => RelatedPart[];
  onReorder: (ids: string[]) => void;
  onRequestRemove: (id: string) => void;
  onEdit: (item: SimplePartItem) => void;
}

/** Tabela da Minha Lista no celular: linhas separadas por traço, alça | peça | Qtd | lixeira. */
const PartsListTable: React.FC<PartsListTableProps> = ({
  items,
  groups,
  visibleCount,
  flashIds,
  nameOf,
  relatedOf,
  onReorder,
  onRequestRemove,
  onEdit,
}) => {
  const dragEnabled = !groups;

  const renderRow = (item: SimplePartItem) => (
    <PartsListMobileRow
      key={item.id}
      item={item}
      name={nameOf(item)}
      related={relatedOf(item)}
      dragEnabled={dragEnabled}
      flash={flashIds.has(item.id)}
      onRequestRemove={onRequestRemove}
      onEdit={onEdit}
    />
  );

  const renderOverlay = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return null;
    const name = nameOf(item);
    return (
      <div className="flex items-center gap-1 py-1.5 pr-2">
        <span className="flex h-11 w-9 shrink-0 items-center justify-center text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-blue-600 dark:text-blue-400 truncate">
            {item.codigo_peca || 'S/ Cód'}
            {name && ` · ${name}`}
          </span>
          <span className="block text-xs text-muted-foreground uppercase truncate">{item.descricao || 'S/ Desc'}</span>
        </div>
        <span className="w-11 text-center text-base font-bold tabular-nums">{item.quantidade ?? 1}</span>
      </div>
    );
  };

  const renderGroups = () => {
    let shown = 0;
    return groups!.map(([af, groupItems]) => {
      if (shown >= visibleCount) return null;
      const slice = groupItems.slice(0, visibleCount - shown);
      shown += slice.length;
      return (
        <React.Fragment key={af || '__none'}>
          <TableRow className="border-b bg-muted/40 hover:bg-muted/40" data-testid="parts-list-af-group">
            <TableCell colSpan={4} className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {af ? `AF ${af}` : 'Sem AF'} ({groupItems.length})
            </TableCell>
          </TableRow>
          {slice.map(renderRow)}
        </React.Fragment>
      );
    });
  };

  return (
    <Table className="table-fixed" data-testid="parts-list-table">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-9 h-8 p-0">
            <span className="sr-only">Arrastar</span>
          </TableHead>
          <TableHead className="h-8 pl-0 pr-2 text-xs font-bold">Código / Descrição</TableHead>
          <TableHead className="w-11 h-8 px-1 text-center text-xs font-bold">Qtd</TableHead>
          <TableHead className="w-10 h-8 p-0">
            <span className="sr-only">Remover</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      {dragEnabled ? (
        <SortableTableBody ids={items.map((i) => i.id)} onReorder={onReorder} renderOverlay={renderOverlay}>
          {items.map(renderRow)}
        </SortableTableBody>
      ) : (
        <TableBody>{renderGroups()}</TableBody>
      )}
    </Table>
  );
};

export default PartsListTable;
