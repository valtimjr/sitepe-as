import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, ListPlus, Pencil, PlusCircle, Save, Search, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { showError, showSuccess } from '@/utils/toast';
import type { CustomList, Part } from '@/types/supabase';
import { createCustomList, deleteCustomList, getCustomLists, updateCustomList } from '@/services/customListService';
import { getParts } from '@/services/partListService';
import { useSession } from './SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import { cn } from '@/lib/utils';
import CustomListEditor from './CustomListEditor';
import ListIcon from '@/components/list-icon/ListIcon';
import ListIconEditor from '@/components/list-icon/ListIconEditor';
import ActionMenu from '@/components/admin/ActionMenu';
import type { ListIcon as ListIconData } from '@/types/listIcon';

interface CustomListManagerProps {
  /** Lista a abrir direto em "Editar nome e ícone" (vindo da Estrutura). */
  editListId?: string | null;
  onEditListHandled?: () => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const listSummary = (list: CustomList) => {
  const items = list.items_data ?? [];
  const count = items.filter(i => i.type !== 'subtitle' && i.type !== 'separator').length;
  const subtitles = items.filter(i => i.type === 'subtitle').length;
  const parts = [plural(count, 'item', 'itens')];
  if (subtitles > 0) parts.push(plural(subtitles, 'subtítulo', 'subtítulos'));
  return parts.join(' · ');
};

const CustomListManager: React.FC<CustomListManagerProps> = ({ editListId, onEditListHandled }) => {
  const { user } = useSession();
  const { company } = useCompany();
  const isCompact = useIsCompact();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentList, setCurrentList] = useState<CustomList | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formIcon, setFormIcon] = useState<ListIconData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorList, setEditorList] = useState<CustomList | null>(null);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);

  const loadLists = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setLists(await getCustomLists(user.id, company));
    } catch {
      showError('Erro ao carregar listas personalizadas.');
    } finally {
      setIsLoading(false);
    }
  }, [user, company]);

  useEffect(() => {
    loadLists();
    getParts(company)
      .then(setAllAvailableParts)
      .catch(error => console.error('Erro ao carregar peças para o editor:', error));
  }, [loadLists, company]);

  const openForm = (list: CustomList | null) => {
    setCurrentList(list);
    setFormTitle(list?.title ?? '');
    setFormIcon(list?.icon ?? null);
    setIsFormOpen(true);
  };

  // "Editar na lista" vindo da Estrutura do Menu
  useEffect(() => {
    if (!editListId || isLoading) return;
    const list = lists.find(l => l.id === editListId);
    if (list) openForm(list);
    else showError('Lista não encontrada.');
    onEditListHandled?.();
  }, [editListId, isLoading, lists, onEditListHandled]);

  const handleDelete = async (list: CustomList) => {
    try {
      await deleteCustomList(list.id);
      showSuccess('Lista excluída!');
      loadLists();
    } catch {
      showError('Erro ao excluir lista.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !user) {
      showError('O título da lista é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      if (currentList) {
        await updateCustomList({ ...currentList, title: formTitle.trim(), icon: formIcon });
        showSuccess('Lista atualizada!');
      } else {
        await createCustomList(formTitle.trim(), user.id, company, formIcon);
        showSuccess('Lista criada!');
      }
      setIsFormOpen(false);
      loadLists();
    } catch {
      showError('Erro ao salvar lista.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeEditor = () => {
    setEditorList(null);
    loadLists();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? lists.filter(l => l.title.toLowerCase().includes(q)) : lists;
  }, [lists, search]);

  return (
    <Card className="w-full" data-testid="custom-list-manager">
      <CardHeader className="flex flex-col gap-3 space-y-0 p-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pb-3">
        <div className="min-w-0">
          <CardTitle className="text-xl font-bold sm:text-2xl">Listas Personalizadas</CardTitle>
          {!isLoading && <p className="text-sm text-muted-foreground">{plural(lists.length, 'lista', 'listas')}</p>}
        </div>
        <Button onClick={() => openForm(null)} className="h-11 w-full gap-2 sm:h-10 sm:w-auto" data-testid="new-list">
          <PlusCircle className="h-4 w-4" /> Criar lista
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-2 pt-0 sm:p-6 sm:pt-0">
        {lists.length > 8 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar lista por nome"
              aria-label="Buscar lista por nome"
              className="h-11 pl-9"
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2" data-testid="lists-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center">
            <ListPlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma lista criada para esta empresa.</p>
            <Button onClick={() => openForm(null)} className="h-11 gap-2">
              <PlusCircle className="h-4 w-4" /> Criar lista
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma lista com esse nome.</p>
        ) : (
          <ul className="divide-y rounded-lg border" data-testid="custom-lists">
            {filtered.map(list => (
              <li key={list.id} className="group flex items-center gap-1 pr-1" data-testid="custom-list-row">
                <button
                  type="button"
                  onClick={() => setEditorList(list)}
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ListIcon name={list.title} icon={list.icon} size="sm" className="h-9 w-9 rounded-md" />
                  <span className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 break-words text-sm font-medium">{list.title}</span>
                    <span className="text-xs text-muted-foreground">{listSummary(list)}</span>
                  </span>
                </button>
                {!isCompact && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => setEditorList(list)}>
                      <FileText className="h-4 w-4" /> Itens
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => openForm(list)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  </div>
                )}
                <ActionMenu
                  title={list.title}
                  actions={[
                    { label: 'Editar itens', icon: FileText, onSelect: () => setEditorList(list) },
                    { label: 'Editar nome e ícone', icon: Pencil, onSelect: () => openForm(list) },
                    {
                      label: 'Excluir',
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => handleDelete(list),
                      confirm: {
                        title: 'Excluir lista?',
                        description: `A lista "${list.title}" e todos os itens dela serão removidos. Esta ação não pode ser desfeita.`,
                      },
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Nome e ícone da lista */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent
          side={isCompact ? 'bottom' : 'right'}
          className={cn('flex flex-col gap-0 p-0', isCompact ? 'max-h-[92vh] rounded-t-2xl' : 'w-full sm:max-w-md')}
          data-testid="list-form"
        >
          <SheetHeader className="border-b px-4 pb-3 pt-5 text-left">
            <SheetTitle>{currentList ? 'Editar nome e ícone' : 'Criar lista'}</SheetTitle>
            <SheetDescription className="sr-only">Nome e ícone da lista.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="list-title">Título</Label>
                <Input id="list-title" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="h-11" required />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <ListIconEditor name={formTitle} icon={formIcon} onChange={setFormIcon} />
                <p className="text-xs text-muted-foreground">Também usado no menu e pelos subtítulos sem ícone próprio.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <Button type="button" variant="outline" className="h-11" onClick={() => setIsFormOpen(false)}>
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button type="submit" className="h-11" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Editor de itens: tela cheia no celular */}
      <Sheet open={editorList !== null} onOpenChange={open => !open && closeEditor()}>
        <SheetContent
          side="right"
          className={cn('flex flex-col gap-0 p-0', isCompact ? 'h-[100dvh] w-full max-w-none' : 'w-full sm:max-w-xl lg:max-w-2xl')}
          data-testid="list-editor-sheet"
        >
          {editorList && <CustomListEditor list={editorList} onClose={closeEditor} allAvailableParts={allAvailableParts} />}
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default CustomListManager;
