import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CompanyType } from '@/types/company';
import { SavedPartList } from '@/types/supabase';
import { deleteCloudList, getCloudLists, loadCloudListToLocal } from '@/services/cloudListService';
import { showError, showSuccess } from '@/utils/toast';

interface CloudListsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  company: CompanyType;
  onListOpened: () => void;
}

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const CloudListsDialog: React.FC<CloudListsDialogProps> = ({ open, onOpenChange, userId, company, onListOpened }) => {
  const [lists, setLists] = useState<SavedPartList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setLists(await getCloudLists(userId, company));
    } catch (error: any) {
      showError(error?.message || 'Erro ao carregar listas da nuvem.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, company]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleOpen = async (list: SavedPartList) => {
    setBusyId(list.id);
    try {
      await loadCloudListToLocal(company, list);
      showSuccess(`Lista "${list.name}" aberta!`);
      onListOpened();
      onOpenChange(false);
    } catch (error: any) {
      showError(error?.message || 'Erro ao abrir a lista.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (list: SavedPartList) => {
    setBusyId(list.id);
    try {
      await deleteCloudList(list.id);
      setLists(prev => prev.filter(l => l.id !== list.id));
      showSuccess(`Lista "${list.name}" excluída da nuvem.`);
    } catch (error: any) {
      showError(error?.message || 'Erro ao excluir a lista.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><Cloud className="h-5 w-5" /></div>
            <div className="text-left">
              <DialogTitle>Listas na nuvem</DialogTitle>
              <DialogDescription>Abra uma lista salva para continuar de onde parou.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : lists.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma lista salva na nuvem ainda.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <ul className="space-y-2">
              {lists.map(list => (
                <li key={list.id} className="flex items-center gap-3 rounded-lg border bg-card p-3" data-testid="cloud-list-row">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.item_count} {list.item_count === 1 ? 'item' : 'itens'} · {formatDate(list.updated_at)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleOpen(list)} disabled={busyId !== null}>
                    {busyId === list.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4 sm:mr-2" />}
                    <span className="hidden sm:inline">Abrir</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive" disabled={busyId !== null} aria-label="Excluir lista da nuvem">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir da nuvem?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A lista "{list.name}" será removida da nuvem. As listas no seu dispositivo não serão afetadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(list)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CloudListsDialog;
