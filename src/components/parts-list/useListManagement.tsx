import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogDescription as DialogDescription,
} from '@/components/responsive/ResponsiveDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocalList, formatListText } from '@/services/localListStorage';
import { CompanyType } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import ListIconEditor from '@/components/list-icon/ListIconEditor';
import LoginModal from '@/components/LoginModal';
import { useCloudListActions } from '@/hooks/use-cloud-list-actions';

interface ListManagementOptions {
  lists: LocalList[];
  company: CompanyType;
  companyName: string;
  onCreateList: (name: string, icon?: ListIconData | null) => void;
  onRenameList: (id: string, newName: string, icon?: ListIconData | null) => void;
  onDeleteList: (id: string) => void;
  onListChanged: () => void;
}

/** Criar, renomear, excluir, copiar e nuvem das listas (diálogos compartilhados entre carrossel e chips). */
export const useListManagement = ({
  lists,
  company,
  companyName,
  onCreateList,
  onRenameList,
  onDeleteList,
  onListChanged,
}: ListManagementOptions) => {
  const { requestCloudAction, savingListId, loginModalProps } = useCloudListActions(company, onListChanged);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState<ListIconData | null>(null);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameListId, setRenameListId] = useState('');
  const [renameListName, setRenameListName] = useState('');
  const [renameListIcon, setRenameListIcon] = useState<ListIconData | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState('');
  const [deleteListName, setDeleteListName] = useState('');

  const openCreate = useCallback(() => setIsCreateOpen(true), []);

  const openRename = useCallback((list: LocalList) => {
    setRenameListId(list.id);
    setRenameListName(list.name);
    setRenameListIcon(list.icon ?? null);
    setIsRenameOpen(true);
  }, []);

  const openDelete = useCallback((list: LocalList) => {
    setDeleteListId(list.id);
    setDeleteListName(list.name);
    setIsDeleteOpen(true);
  }, []);

  const copyListText = useCallback(async (list: LocalList) => {
    const text = formatListText(list, companyName);
    if (!text) {
      showError('A lista está vazia.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`Lista "${list.name}" copiada para a área de transferência!`);
    } catch {
      showError('Erro ao copiar lista.');
    }
  }, [companyName]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      showError('O nome da lista não pode ser vazio.');
      return;
    }
    onCreateList(newListName.trim(), newListIcon);
    setNewListName('');
    setNewListIcon(null);
    setIsCreateOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameListName.trim()) {
      showError('O nome da lista não pode ser vazio.');
      return;
    }
    onRenameList(renameListId, renameListName.trim(), renameListIcon);
    setIsRenameOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (lists.length <= 1) {
      showError('Não é possível excluir a única lista existente.');
      return;
    }
    onDeleteList(deleteListId);
    setIsDeleteOpen(false);
  };

  const dialogs = (
    <>
      {/* Create List Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setNewListIcon(null);
        }}
      >
        <DialogContent dialogClassName="sm:max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg">Criar Nova Lista</DialogTitle>
            <DialogDescription className="text-xs">
              Insira o nome para a sua nova lista de peças.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <ListIconEditor name={newListName} icon={newListIcon} onChange={setNewListIcon} />
            <div className="space-y-2">
              <Label htmlFor="new-list-name" className="text-xs font-bold uppercase">Nome da Lista</Label>
              <Input
                id="new-list-name"
                placeholder="Ex: Caminhão 42032, Preventiva..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="rounded-none text-xs"
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="rounded-none text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-none text-xs font-bold">Criar Lista</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename List Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent dialogClassName="sm:max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg">Editar Lista</DialogTitle>
            <DialogDescription className="text-xs">
              Altere o nome e o ícone desta lista de peças.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <ListIconEditor name={renameListName} icon={renameListIcon} onChange={setRenameListIcon} />
            <div className="space-y-2">
              <Label htmlFor="rename-list-name" className="text-xs font-bold uppercase">Novo Nome</Label>
              <Input
                id="rename-list-name"
                value={renameListName}
                onChange={(e) => setRenameListName(e.target.value)}
                className="rounded-none text-xs"
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRenameOpen(false)} className="rounded-none text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-none text-xs font-bold">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LoginModal {...loginModalProps} />

      {/* Delete List Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent dialogClassName="sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg text-destructive">Excluir Lista</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja excluir a lista <strong className="text-foreground">"{deleteListName}"</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="rounded-none text-xs">
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteConfirm} className="rounded-none text-xs font-bold">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const anyDialogOpen = isCreateOpen || isRenameOpen || isDeleteOpen || loginModalProps.isOpen;

  return { openCreate, openRename, openDelete, copyListText, requestCloudAction, savingListId, dialogs, anyDialogOpen };
};
