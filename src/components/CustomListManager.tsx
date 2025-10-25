import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, List as ListIcon, FileText } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { CustomList } from '@/types/supabase';
import { getCustomLists, createCustomList, updateCustomList, deleteCustomList } from '@/services/customListService';
import { useSession } from './SessionContextProvider';
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
} from "@/components/ui/alert-dialog";
import CustomListEditor from './CustomListEditor'; // Será criado na próxima etapa
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CustomListManager: React.FC = () => {
  const { user } = useSession();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentList, setCurrentList] = useState<CustomList | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [listToEdit, setListToEdit] = useState<CustomList | null>(null);

  const loadLists = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedLists = await getCustomLists(user.id);
      setLists(fetchedLists);
    } catch (error) {
      showError('Erro ao carregar listas personalizadas.');
      console.error('Failed to load custom lists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const handleAddList = () => {
    setCurrentList(null);
    setFormTitle('');
    setIsDialogOpen(true);
  };

  const handleEditListTitle = (list: CustomList) => {
    setCurrentList(list);
    setFormTitle(list.title);
    setIsDialogOpen(true);
  };

  const handleOpenEditor = (list: CustomList) => {
    setListToEdit(list);
    setIsEditorOpen(true);
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteCustomList(listId);
      showSuccess('Lista excluída com sucesso!');
      loadLists();
    } catch (error) {
      showError('Erro ao excluir lista.');
      console.error('Failed to delete list:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !user) {
      showError('O título da lista é obrigatório.');
      return;
    }

    try {
      if (currentList) {
        await updateCustomList({ ...currentList, title: formTitle.trim() });
        showSuccess('Título da lista atualizado com sucesso!');
      } else {
        await createCustomList(formTitle.trim(), user.id);
        showSuccess('Lista criada com sucesso!');
      }
      
      setIsDialogOpen(false);
      loadLists();
    } catch (error) {
      showError('Erro ao salvar lista.');
      console.error('Failed to save list:', error);
    }
  };

  if (isEditorOpen && listToEdit) {
    return (
      <CustomListEditor 
        list={listToEdit} 
        onClose={() => {
          setIsEditorOpen(false);
          setListToEdit(null);
          loadLists();
        }}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Minhas Listas Personalizadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button onClick={handleAddList} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Criar Nova Lista
          </Button>
        </div>

        <h3 className="text-xl font-semibold pt-4">Listas Existentes</h3>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando listas...</p>
        ) : lists.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma lista personalizada criada.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título da Lista</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.title}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(list)} className="mr-2">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar Itens</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEditListTitle(list)} className="mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar Título</TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá remover a lista "{list.title}" e todos os seus itens. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteList(list.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentList ? 'Editar Título da Lista' : 'Criar Nova Lista'}</DialogTitle>
            <DialogDescription>
              {currentList ? 'Altere o nome da sua lista personalizada.' : 'Insira um nome para a nova lista de peças.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CustomListManager;