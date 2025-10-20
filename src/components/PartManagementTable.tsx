"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Tag } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Part, getParts, addPart, updatePart, deletePart, searchParts as searchPartsService } from '@/services/partListService';
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
} from "@/components/ui/alert-dialog";

const PartManagementTable: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPart, setCurrentPart] = useState<Part | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTags, setFormTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadInitialParts = async () => {
      setIsLoading(true);
      try {
        const fetchedParts = await getParts();
        setParts(fetchedParts);
      } catch (error) {
        showError('Erro ao carregar peças.');
        console.error('Failed to load parts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!searchQuery) {
      loadInitialParts();
    }
  }, [searchQuery]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);
      try {
        const results = await searchPartsService(searchQuery);
        setParts(results);
        setSelectedPartIds(new Set()); // Limpa a seleção ao mudar a busca
      } catch (error) {
        showError('Erro ao buscar peças.');
        console.error('Failed to search parts:', error);
        setParts([]);
      } finally {
        setIsLoading(false);
      }
    };

    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleAddPart = () => {
    setCurrentPart(null);
    setFormCodigo('');
    setFormDescricao('');
    setFormTags('');
    setIsDialogOpen(true);
  };

  const handleEditPart = (part: Part) => {
    setCurrentPart(part);
    setFormCodigo(part.codigo);
    setFormDescricao(part.descricao);
    setFormTags(part.tags || '');
    setIsDialogOpen(true);
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta peça?')) return;
    try {
      await deletePart(id);
      showSuccess('Peça excluída com sucesso!');
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao excluir peça.');
      console.error('Failed to delete part:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo || !formDescricao) {
      showError('Código e Descrição são obrigatórios.');
      return;
    }

    try {
      if (currentPart) {
        await updatePart({
          ...currentPart,
          codigo: formCodigo,
          descricao: formDescricao,
          tags: formTags,
        });
        showSuccess('Peça atualizada com sucesso!');
      } else {
        await addPart({
          codigo: formCodigo,
          descricao: formDescricao,
          tags: formTags,
        });
        showSuccess('Peça adicionada com sucesso!');
      }
      setIsDialogOpen(false);
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao salvar peça.');
      console.error('Failed to save part:', error);
    }
  };

  const loadPartsAfterAction = async () => {
    if (searchQuery) {
      const results = await searchPartsService(searchQuery);
      setParts(results);
    } else {
      const fetchedParts = await getParts();
      setParts(fetchedParts);
    }
    setSelectedPartIds(new Set()); // Limpa a seleção após a ação
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisiblePartIds = new Set(parts.map(part => part.id));
      setSelectedPartIds(allVisiblePartIds);
    } else {
      setSelectedPartIds(new Set());
    }
  };

  const handleSelectPart = (id: string, checked: boolean) => {
    setSelectedPartIds(prev => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(id);
      } else {
        newSelection.delete(id);
      }
      return newSelection;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedPartIds.size === 0) {
      showError('Nenhuma peça selecionada para exclusão.');
      return;
    }
    try {
      await Promise.all(Array.from(selectedPartIds).map(id => deletePart(id)));
      showSuccess(`${selectedPartIds.size} peças excluídas com sucesso!`);
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao excluir peças selecionadas.');
      console.error('Failed to bulk delete parts:', error);
    }
  };

  const handleBulkClearTags = async () => {
    if (selectedPartIds.size === 0) {
      showError('Nenhuma peça selecionada para limpar tags.');
      return;
    }
    try {
      const partsToUpdate = parts.filter(part => selectedPartIds.has(part.id));
      await Promise.all(partsToUpdate.map(part => updatePart({ ...part, tags: '' })));
      showSuccess(`Tags de ${selectedPartIds.size} peças limpas com sucesso!`);
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao limpar tags das peças selecionadas.');
      console.error('Failed to bulk clear tags:', error);
    }
  };

  const isAllSelected = parts.length > 0 && selectedPartIds.size === parts.length;
  const isIndeterminate = selectedPartIds.size > 0 && selectedPartIds.size < parts.length;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar Peças</CardTitle>
        <Button onClick={handleAddPart} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Adicionar Peça
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar peça por código, descrição ou tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedPartIds.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Excluir Selecionados ({selectedPartIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover {selectedPartIds.size} peças selecionadas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Limpar Tags Selecionadas ({selectedPartIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover as tags de {selectedPartIds.size} peças selecionadas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkClearTags}>Limpar Tags</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando peças...</p>
        ) : parts.length === 0 && searchQuery.length > 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma peça encontrada para "{searchQuery}".</p>
        ) : parts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma peça cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      aria-label="Selecionar todas as peças"
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPartIds.has(part.id)}
                        onCheckedChange={(checked) => handleSelectPart(part.id, checked === true)}
                        aria-label={`Selecionar peça ${part.codigo}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{part.codigo}</TableCell>
                    <TableCell>{part.descricao}</TableCell>
                    <TableCell>{part.tags || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditPart(part)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePart(part.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
            <DialogTitle>{currentPart ? 'Editar Peça' : 'Adicionar Nova Peça'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="codigo" className="text-right">
                Código
              </Label>
              <Input
                id="codigo"
                value={formCodigo}
                onChange={(e) => setFormCodigo(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right">
                Descrição
              </Label>
              <Textarea
                id="descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tags" className="text-right">
                Tags
              </Label>
              <Input
                id="tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="tag1;tag2;tag3"
                className="col-span-3"
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

export default PartManagementTable;