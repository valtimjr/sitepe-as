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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { getParts } from '@/services/partListService';
import { Part } from '@/types/supabase';

const CustomListManager: React.FC = () => {
  const { user } = useSession();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentList, setCurrentList] = useState<CustomList | null>(null);
  const [formTitle, setFormTitle] = useState('');
  
  const [isEditorSheetOpen, setIsEditorSheetOpen] = useState(false);
  const [listToEditContent, setListToEditContent] = useState<CustomList | null>(null);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);

  const loadLists = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedLists = await getCustomLists(user.id);
      setLists(fetchedLists);
    } catch (error) {
      showError('Erro ao carregar listas personalizadas.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadAllParts = useCallback(async () => {
    try {
      const parts = await getParts();
      setAllAvailableParts(parts);
    } catch (error) {
      console.error("Erro ao carregar todas as peças para o editor:", error);
    }
  }, []);

  useEffect(() => {
    loadLists();
    loadAllParts();
  }, [loadLists, loadAllParts]);

  const handleAddList = () => {
    setCurrentList(null);
    setFormTitle('');
    setIsSheetOpen(true);
  };

  const handleEditListTitle = (list: CustomList) => {
    setCurrentList(list);
    setFormTitle(list.title);
    setIsSheetOpen(true);
  };

  const handleOpenEditor = (list: CustomList) => {
    setListToEditContent(list);
    setIsEditorSheetOpen(true);
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteCustomList(listId);
      showSuccess('Lista excluída com sucesso!');
      loadLists();
    } catch (error) {
      showError('Erro ao excluir lista.');
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
      
      setIsSheetOpen(false);
      loadLists();
    } catch (error) {
      showError('Erro ao salvar lista.');
    }
  };

  const handleEditorClose = () => {
    setIsEditorSheetOpen(false);
    setListToEditContent(null);
    loadLists();
  };

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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.title}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(list)} className="mr-2">
                        <FileText className="h-4 w-4" /> 
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditListTitle(list)} className="mr-2">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Sheet de Edição/Adição de Título da Lista */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md">
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
            <SheetFooter>
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

      {/* NOVO: Sheet para o CustomListEditor (edição de conteúdo da lista) */}
      <Sheet open={isEditorSheetOpen} onOpenChange={setIsEditorSheetOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto" // Aumentado o max-width para desktop
        >
          <SheetHeader>
            <SheetTitle>Editar Itens da Lista: {listToEditContent?.title}</SheetTitle>
            <SheetDescription>
              Adicione, edite ou reordene os itens desta lista personalizada.
            </SheetDescription>
          </SheetHeader>
          {listToEditContent && (
            <CustomListEditor 
              list={listToEditContent} 
              onClose={handleEditorClose}
              allAvailableParts={allAvailableParts}
            />
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default CustomListManager;