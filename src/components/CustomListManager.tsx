"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import CustomListEditor from './CustomListEditor';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'; // Importar Sheet e SheetFooter

const CustomListManager: React.FC = () => {
  const { user } = useSession();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Alterado para isSheetOpen
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
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleEditListTitle = (list: CustomList) => {
    setCurrentList(list);
    setFormTitle(list.title);
    setIsSheetOpen(true); // Abre o Sheet
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
      
      setIsSheetOpen(false); // Fecha o Sheet
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
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <CardTitle className="text-2xl font-bold">Minhas Listas Personalizadas</CardTitle>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={handleAddList} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Criar Nova Lista
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                  <TableHead className="text-right w-[120px]">Ações</TableHead> {/* Largura fixa para ações */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.title}</TableCell>
                    <TableCell className="text-right w-[120px]"> {/* Largura fixa para ações */}
                      <div className="flex justify-end items-center gap-1"> {/* Flex para alinhar botões */}
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(list)}>
                          <FileText className="h-4 w-4" /> 
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditListTitle(list)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Sheet de Edição/Adição */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md"> {/* SheetContent com side="right" */}
          <SheetHeader>
            <SheetTitle>{currentList ? 'Editar Título da Lista' : 'Criar Nova Lista'}</SheetTitle>
          </SheetHeader>
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
            <SheetFooter> {/* SheetFooter para botões */}
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default CustomListManager;