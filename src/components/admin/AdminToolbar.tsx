import React from 'react';
import { Download, MoreHorizontal, PlusCircle, Search, Tag, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminToolbarProps {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  addLabel: string;
  onAdd: () => void;
  onImport: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  /** Itens extras do menu "Ações". */
  extraActions?: React.ReactNode;
  selectedCount: number;
  /** Estado do "selecionar todos" (usado nos cards do celular). */
  selectAllState?: boolean | 'indeterminate';
  onSelectAll?: (checked: boolean) => void;
  onBulkDelete: () => void;
  bulkDeleteDescription?: string;
  onBulkClearTags?: () => void;
  clearTagsDisabled?: boolean;
}

const ConfirmButton: React.FC<{
  label: React.ReactNode;
  confirmLabel: string;
  description?: string;
  variant: 'destructive' | 'outline';
  disabled?: boolean;
  onConfirm: () => void;
}> = ({ label, confirmLabel, description, variant, disabled, onConfirm }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant={variant} size="sm" className="flex items-center gap-2" disabled={disabled}>
        {label}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/** Barra comum de Peças e AFs: título, Ações (importar/exportar), Adicionar, busca e seleção em massa. */
const AdminToolbar: React.FC<AdminToolbarProps> = ({
  title,
  search,
  onSearchChange,
  searchPlaceholder,
  addLabel,
  onAdd,
  onImport,
  onExportCsv,
  onExportJson,
  extraActions,
  selectedCount,
  selectAllState,
  onSelectAll,
  onBulkDelete,
  bulkDeleteDescription,
  onBulkClearTags,
  clearTagsDisabled,
}) => (
  <div className="mb-4 space-y-3">
    <div className="flex items-center gap-2">
      <h2 className="hidden flex-1 text-2xl font-bold lg:block">{title}</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4" /> Ações
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onImport}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Download className="mr-2 h-4 w-4" /> Exportar
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={onExportCsv}>Exportar CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={onExportJson}>Exportar JSON</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {extraActions}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={onAdd} className="ml-auto flex items-center gap-2 lg:ml-0">
        <PlusCircle className="h-4 w-4" /> {addLabel}
      </Button>
    </div>

    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" placeholder={searchPlaceholder} value={search} onChange={e => onSearchChange(e.target.value)} className="pl-9" />
    </div>

    {(selectedCount > 0 || onSelectAll) && (
      <div className={selectedCount > 0 ? 'flex flex-wrap items-center gap-2' : 'flex items-center lg:hidden'}>
        {onSelectAll && (
          <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground lg:hidden">
            <Checkbox checked={selectAllState ?? false} onCheckedChange={c => onSelectAll(c === true)} />
            Selecionar todos
          </label>
        )}
        {selectedCount > 0 && (
          <>
            <ConfirmButton
              variant="destructive"
              label={<><Trash2 className="h-4 w-4" /> Excluir ({selectedCount})</>}
              confirmLabel="Excluir"
              description={bulkDeleteDescription}
              onConfirm={onBulkDelete}
            />
            {onBulkClearTags && (
              <ConfirmButton
                variant="outline"
                label={<><Tag className="h-4 w-4" /> Limpar tags ({selectedCount})</>}
                confirmLabel="Limpar Tags"
                disabled={clearTagsDisabled}
                onConfirm={onBulkClearTags}
              />
            )}
          </>
        )}
      </div>
    )}
  </div>
);

export default AdminToolbar;
