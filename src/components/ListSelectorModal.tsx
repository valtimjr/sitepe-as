import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Check, Loader2 } from 'lucide-react';
import { 
  getListsData, 
  createList, 
  addItemToList, 
  setActiveListId,
  LocalList 
} from '@/services/localListStorage';
import { CompanyType } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ListSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: { codigo: string; descricao: string; quantidade: number; af?: string } | null;
  company: CompanyType;
  onSuccess?: (listName: string) => void;
}

export const ListSelectorModal: React.FC<ListSelectorModalProps> = ({
  isOpen,
  onClose,
  part,
  company,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const [lists, setLists] = useState<LocalList[]>([]);
  const [activeListId, setActiveListIdState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Inline creation state
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLists();
      setIsCreatingInline(false);
      setNewListName('');
    }
  }, [isOpen, company]);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const data = await getListsData(company);
      setLists(data.lists);
      setActiveListIdState(data.activeListId);
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectList = async (list: LocalList) => {
    if (!part) return;
    
    setIsSubmitting(true);
    try {
      await addItemToList(company, list.id, {
        codigo_peca: part.codigo,
        descricao: part.descricao,
        quantidade: part.quantidade,
        af: part.af
      });
      
      showSuccess(`Peça adicionada em "${list.name}"`);
      window.dispatchEvent(new CustomEvent('part-added-to-list'));
      
      if (onSuccess) {
        onSuccess(list.name);
      }
      onClose();
    } catch (error) {
      showError('Erro ao adicionar peça à lista.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !part) return;

    setIsSubmitting(true);
    try {
      // 1. Create the new list
      const newList = await createList(company, newListName);
      
      // 2. Add the part to it
      await addItemToList(company, newList.id, {
        codigo_peca: part.codigo,
        descricao: part.descricao,
        quantidade: part.quantidade,
        af: part.af
      });

      // 3. Make this list active
      await setActiveListId(company, newList.id);

      showSuccess(`Peça adicionada na nova lista "${newList.name}"`);
      window.dispatchEvent(new CustomEvent('part-added-to-list'));

      if (onSuccess) {
        onSuccess(newList.name);
      }
      onClose();
    } catch (error) {
      showError('Erro ao criar lista e adicionar peça.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando listas...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 py-2">
        <div className="text-sm text-muted-foreground mb-2">
          Peça: <strong className="text-foreground">{part?.codigo}</strong> - {part?.descricao}
        </div>

        {!isCreatingInline ? (
          <>
            {/* List of Lists */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lists.map((list) => {
                const isActive = list.id === activeListId;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => handleSelectList(list)}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150",
                      isActive 
                        ? "border-primary bg-primary/5 hover:bg-primary/10" 
                        : "border-border hover:bg-accent/50"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{list.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {list.items?.length || 0} {list.items?.length === 1 ? 'peça' : 'peças'}
                      </span>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Create New List Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 py-5 border-dashed"
              onClick={() => setIsCreatingInline(true)}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4" />
              Criar nova lista
            </Button>
          </>
        ) : (
          /* Inline Create Form */
          <form onSubmit={handleCreateAndAdd} className="space-y-4 border p-3 rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label htmlFor="inline-new-list-name" className="text-xs font-bold uppercase">Nome da nova lista</Label>
              <Input
                id="inline-new-list-name"
                placeholder="Ex: Caminhão 42032, Preventiva..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                autoFocus
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingInline(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !newListName.trim()}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-auto max-h-[85vh] p-4 rounded-t-2xl">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle className="text-lg font-bold">Adicionar peça</DrawerTitle>
            <DrawerDescription className="text-xs">
              Em qual lista deseja adicionar esta peça?
            </DrawerDescription>
          </DrawerHeader>
          {renderContent()}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar peça</DialogTitle>
          <DialogDescription>
            Em qual lista deseja adicionar esta peça?
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
