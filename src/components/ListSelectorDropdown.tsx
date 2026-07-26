import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { 
  getListsData, 
  createList, 
  addItemToList, 
  setActiveListId,
  LocalList 
} from '@/services/localListStorage';
import { CompanyType } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';

// LocalStorage key to persist the last selected list per company
const LAST_SELECTED_KEY_PREFIX = 'autoboard_last_selected_list_';

interface ListSelectorDropdownProps {
  company: CompanyType;
  selectedListId: string;
  onSelectedListIdChange: (id: string) => void;
  // If provided, handles inline creation and automatic addition of this part
  part?: { codigo: string; descricao: string; quantidade: number; af?: string } | null;
  // Callback when a new list is created and the part is added to it
  onCreatedAndAdded?: () => void;
}

export const ListSelectorDropdown = forwardRef<HTMLDivElement, ListSelectorDropdownProps>(({
  company,
  selectedListId,
  onSelectedListIdChange,
  part,
  onCreatedAndAdded,
}, ref) => {
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inline creation states
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load lists on mount/company change
  useEffect(() => {
    const loadLists = async () => {
      setIsLoading(true);
      try {
        const data = await getListsData(company);
        // Only keep id and name for performance and memory efficiency
        const simplifiedLists = data.lists.map(l => ({ id: l.id, name: l.name }));
        setLists(simplifiedLists);

        // Check for last selected list in localStorage
        const storedLastSelected = localStorage.getItem(`${LAST_SELECTED_KEY_PREFIX}${company}`);
        const isValidStored = storedLastSelected && simplifiedLists.some(l => l.id === storedLastSelected);

        if (isValidStored) {
          onSelectedListIdChange(storedLastSelected);
        } else {
          // Fallback to active list ID
          onSelectedListIdChange(data.activeListId);
        }
      } catch (error) {
        console.error('Error loading lists in selector:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLists();
  }, [company]);

  // Persist selection change
  const handleSelectionChange = (value: string) => {
    if (value === 'CREATE_NEW_LIST') {
      setIsCreatingInline(true);
      setNewListName('');
      return;
    }
    onSelectedListIdChange(value);
    localStorage.setItem(`${LAST_SELECTED_KEY_PREFIX}${company}`, value);
  };

  const handleCreateInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newListName.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Create the new list
      const newList = await createList(company, newListName);

      // 2. Persist as selected/active
      onSelectedListIdChange(newList.id);
      localStorage.setItem(`${LAST_SELECTED_KEY_PREFIX}${company}`, newList.id);
      await setActiveListId(company, newList.id);

      // 3. If part details are passed, add it automatically
      if (part) {
        await addItemToList(company, newList.id, {
          codigo_peca: part.codigo,
          descricao: part.descricao,
          quantidade: part.quantidade,
          af: part.af
        });
        showSuccess(`Peça adicionada na nova lista "${newList.name}"`);
        window.dispatchEvent(new CustomEvent('part-added-to-list'));
        if (onCreatedAndAdded) {
          onCreatedAndAdded();
        }
      } else {
        showSuccess(`Lista "${newList.name}" criada com sucesso!`);
      }

      // Reset inline creation state
      setIsCreatingInline(false);
      setNewListName('');
    } catch (error) {
      showError('Erro ao criar nova lista.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-1 px-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Carregando listas...</span>
      </div>
    );
  }

  // If there is only one list, we completely hide the dropdown per requirements
  if (lists.length <= 1 && !isCreatingInline) {
    return null;
  }

  return (
    <div className="space-y-1.5 text-left" ref={ref} onClick={(e) => e.stopPropagation()}> {/* Expose ref */}
      {!isCreatingInline ? (
        <>
          <Label htmlFor="list-select" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Adicionar na lista
          </Label>
          <Select value={selectedListId} onValueChange={handleSelectionChange}>
            <SelectTrigger id="list-select" className="h-8 text-xs border bg-background/50 focus:ring-1 focus:ring-primary">
              <SelectValue placeholder="Selecione uma lista" />
            </SelectTrigger>
            <SelectContent className="z-[300]">
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id} className="text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    {list.name}
                  </span>
                </SelectItem>
              ))}
              <div className="h-px bg-muted my-1" />
              <SelectItem value="CREATE_NEW_LIST" className="text-xs text-primary font-bold focus:text-primary focus:bg-primary/5">
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Criar nova lista
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="space-y-2 border p-2.5 rounded-lg bg-primary/5 border-primary/20 animate-in fade-in-50 duration-150">
          <Label htmlFor="inline-list-name" className="text-[9px] font-bold uppercase tracking-wider text-primary">
            Nome da nova lista
          </Label>
          <Input
            id="inline-list-name"
            placeholder="Ex: Caminhão 42032, Preventiva..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="h-7 text-xs bg-background"
            autoFocus
            required
            disabled={isSubmitting}
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingInline(false)}
              className="h-6 text-[10px] px-2 hover:bg-background/80"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateInlineSubmit}
              size="sm"
              className="h-6 text-[10px] px-2"
              disabled={isSubmitting || !newListName.trim()}
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

ListSelectorDropdown.displayName = 'ListSelectorDropdown';
