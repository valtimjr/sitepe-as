import React, { useEffect, useMemo, useState } from 'react';
import { Folder, List as ListLucide, PlusCircle, Save, Tag, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PartSearchInput from '@/components/PartSearchInput';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import ListIcon from '@/components/list-icon/ListIcon';
import ListIconEditor from '@/components/list-icon/ListIconEditor';
import LinkedListIconPreview from './LinkedListIconPreview';
import { useIsCompact } from '@/hooks/use-compact';
import { useCompany } from '@/context/CompanyContext';
import { searchParts } from '@/services/partListService';
import { buildParentOptions } from '@/lib/menuTree';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import type { CustomList, MenuItem, Part, RelatedPart } from '@/types/supabase';
import type { ListIcon as ListIconData } from '@/types/listIcon';

export interface MenuItemFormValues {
  title: string;
  parent_id: string | null;
  list_id: string | null;
  itens_relacionados: RelatedPart[];
  icon: ListIconData | null;
}

interface MenuItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: MenuItem | null;
  /** Pai pré-selecionado ao abrir por "+ Submenu". */
  initialParentId: string | null;
  flatItems: MenuItem[];
  customLists: CustomList[];
  onSave: (values: MenuItemFormValues) => Promise<void>;
  onEditList: (listId: string) => void;
}

const formatRelated = (part: Part): RelatedPart => {
  const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
  const subText = part.name && part.name.trim() !== '' && part.descricao !== mainText ? part.descricao : '';
  return { codigo: part.codigo, name: mainText, desc: subText };
};

const listItemCount = (list: CustomList) => (list.items_data ?? []).filter(i => i.type !== 'subtitle' && i.type !== 'separator').length;

/** Formulário do item do menu: folha de baixo no celular, painel lateral na web. */
const MenuItemFormSheet: React.FC<MenuItemFormSheetProps> = ({
  open,
  onOpenChange,
  editingItem,
  initialParentId,
  flatItems,
  customLists,
  onSave,
  onEditList,
}) => {
  const isCompact = useIsCompact();
  const { company } = useCompany();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'folder' | 'list'>('folder');
  const [listId, setListId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState<ListIconData | null>(null);
  const [related, setRelated] = useState<RelatedPart[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Part[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bulk, setBulk] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasChildren = !!editingItem && flatItems.some(i => i.parent_id === editingItem.id && !i.isDynamic);

  useEffect(() => {
    if (!open) return;
    setTitle(editingItem?.title ?? '');
    setKind(editingItem?.list_id ? 'list' : 'folder');
    setListId(editingItem?.list_id ?? null);
    setParentId(editingItem ? editingItem.parent_id : initialParentId);
    setIcon(editingItem && !editingItem.list_id ? editingItem.icon ?? null : null);
    setRelated(editingItem?.itens_relacionados ?? []);
    setQuery('');
    setResults([]);
    setBulk('');
  }, [open, editingItem, initialParentId]);

  useEffect(() => {
    if (query.length <= 1) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      setResults(await searchParts(query, company));
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, company]);

  const parentOptions = useMemo(() => buildParentOptions(flatItems, editingItem?.id), [flatItems, editingItem]);

  const linkedList = useMemo(() => {
    if (!listId) return null;
    const list = customLists.find(l => l.id === listId);
    if (list) return { title: list.title, icon: list.icon ?? null };
    if (editingItem?.list_id === listId) return { title: editingItem.list_title ?? editingItem.title, icon: editingItem.list_icon ?? null };
    return null;
  }, [listId, customLists, editingItem]);

  const addRelated = (part: Part) => {
    const next = formatRelated(part);
    if (related.some(p => p.codigo === next.codigo)) {
      showError(`Peça ${part.codigo} já está na lista de itens relacionados.`);
      return;
    }
    setRelated(prev => [...prev, next]);
    setQuery('');
    setResults([]);
  };

  const addBulk = () => {
    const codes = bulk.split(';').map(c => c.trim()).filter(Boolean);
    const fresh = codes
      .filter((code, idx) => codes.indexOf(code) === idx && !related.some(p => p.codigo === code))
      .map(code => ({ codigo: code, name: code, desc: '' }));
    if (fresh.length === 0) {
      showError('Nenhum novo código para adicionar.');
      return;
    }
    setRelated(prev => [...prev, ...fresh]);
    showSuccess(`${fresh.length} código(s) adicionado(s).`);
    setBulk('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showError('O título é obrigatório.');
      return;
    }
    if (kind === 'list' && !listId) {
      showError('Escolha a lista.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        parent_id: parentId,
        list_id: kind === 'list' ? listId : null,
        itens_relacionados: related,
        // Item ligado a uma lista não guarda ícone próprio: o ícone vem da lista.
        icon: kind === 'list' ? null : icon,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const segment = (value: 'folder' | 'list', label: string, Icon: typeof Folder, disabled?: boolean) => (
    <button
      type="button"
      role="radio"
      aria-checked={kind === value}
      disabled={disabled}
      onClick={() => setKind(value)}
      className={cn(
        'flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40',
        kind === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isCompact ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col gap-0 p-0',
          isCompact ? 'max-h-[92vh] rounded-t-2xl' : 'w-full sm:max-w-md',
        )}
        data-testid="menu-item-form"
      >
        <SheetHeader className="border-b px-4 pb-3 pt-5 text-left">
          <SheetTitle>{editingItem ? 'Editar item' : 'Novo item'}</SheetTitle>
          <SheetDescription className="sr-only">Título, tipo, ícone, item pai e itens relacionados.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="menu-item-title">Título</Label>
              <Input id="menu-item-title" value={title} onChange={e => setTitle(e.target.value)} className="h-11" required />
            </div>

            <div className="space-y-2">
              <Label id="menu-item-kind">Tipo</Label>
              <div role="radiogroup" aria-labelledby="menu-item-kind" className="flex gap-1 rounded-lg bg-muted p-1">
                {segment('folder', 'Pasta', Folder)}
                {segment('list', 'Link para lista', ListLucide, hasChildren)}
              </div>
              {hasChildren && <p className="text-xs text-muted-foreground">Remova os submenus para ligar a uma lista.</p>}
            </div>

            {kind === 'list' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="menu-item-list">Lista</Label>
                  <Select value={listId ?? undefined} onValueChange={setListId}>
                    <SelectTrigger id="menu-item-list" className="h-11">
                      <SelectValue placeholder="Escolha a lista" />
                    </SelectTrigger>
                    <SelectContent>
                      {customLists.map(list => (
                        <SelectItem key={list.id} value={list.id}>
                          <span className="flex items-center gap-2">
                            <ListIcon name={list.title} icon={list.icon} size="xs" className="rounded" />
                            <span className="truncate">{list.title}</span>
                            <span className="text-xs text-muted-foreground">· {listItemCount(list)} itens</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {listId && linkedList && (
                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <LinkedListIconPreview listTitle={linkedList.title} icon={linkedList.icon} onEditList={() => onEditList(listId)} />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>Ícone</Label>
                <ListIconEditor name={title} icon={icon} onChange={setIcon} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="menu-item-parent">Item pai</Label>
              <Select value={parentId ?? 'root'} onValueChange={value => setParentId(value === 'root' ? null : value)}>
                <SelectTrigger id="menu-item-parent" className="h-11">
                  <SelectValue placeholder="Nível raiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Nível raiz</SelectItem>
                  {parentOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Itens relacionados
                </Label>
                <span className="text-xs text-muted-foreground" data-testid="related-count">
                  {related.length} {related.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <PartSearchInput
                onSearch={setQuery}
                searchResults={results}
                onSelectPart={addRelated}
                searchQuery={query}
                isLoading={isSearching}
              />
              <div className="space-y-2">
                <Label htmlFor="menu-bulk-related" className="text-sm text-muted-foreground">
                  Vários códigos (separados por ";")
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Textarea
                    id="menu-bulk-related"
                    value={bulk}
                    onChange={e => setBulk(e.target.value)}
                    placeholder="Ex: COD1; COD2; COD3"
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBulk}
                    disabled={bulk.trim().length === 0}
                    className="h-11 gap-2 sm:h-auto"
                  >
                    <PlusCircle className="h-4 w-4" /> Adicionar códigos
                  </Button>
                </div>
              </div>
              {related.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item relacionado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {related.map(item => (
                    <span
                      key={item.codigo}
                      className="flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pl-3 pr-0.5 text-xs text-muted-foreground"
                    >
                      <span className="min-w-0 break-words">
                        <RelatedPartDisplay item={item} />
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => setRelated(prev => prev.filter(p => p.codigo !== item.codigo))}
                        aria-label={`Remover ${item.codigo}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" className="h-11" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default MenuItemFormSheet;
