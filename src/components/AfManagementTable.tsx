"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Af, getAfsFromService, addAf, updateAf, deleteAf } from '@/services/partListService';
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

const AfManagementTable: React.FC = () => {
  const [afs, setAfs] = useState<Af[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAf, setCurrentAf] = useState<Af | null>(null);
  const [formAfNumber, setFormAfNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAfIds, setSelectedAfIds] = useState<Set<string>>(new Set()); // Novo estado para seleção múltipla

  useEffect(() => {
    loadAfs();
  }, []);

  const loadAfs = async () => {
    setIsLoading(true);
    try {
      const fetchedAfs = await getAfsFromService();
      setAfs(fetchedAfs);
    } catch (error) {
      showError('Erro ao carregar AFs.');
      console.error('Failed to load AFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtra os AFs com base na query de busca
  const filteredAfs = afs.filter(af => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    return af.af_number.toLowerCase().includes(lowerCaseQuery);
  });

  const handleAddAf = () => {
    setCurrentAf(null);
    setFormAfNumber('');
    setIsDialogOpen(true);
  };

  const handleEditAf = (af: Af) => {
    setCurrentAf(af);
    setFormAfNumber(af.af_number);
    setIsDialogOpen(true);
  };

  const handleDeleteAf = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este AF?')) return;
    try {
      await deleteAf(id);
      showSuccess('AF excluído com sucesso!');
      loadAfs();
    } catch (error) {
      showError('Erro ao excluir AF.');
      console.error('Failed to delete AF:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAfNumber.trim()) {
      showError('O número do AF é obrigatório.');
      return;
    }

    try {
      if (currentAf) {
        await updateAf({
          ...currentAf,
          af_number: formAfNumber.trim(),
        });
        showSuccess('AF atualizado com sucesso!');
      } else {
        await addAf({
          af_number: formAfNumber.trim(),
        });
        showSuccess('AF adicionado com sucesso!');
      }
      setIsDialogOpen(false);
      loadAfs();
    } catch (error) {
      showError('Erro ao salvar AF.');
      console.error('Failed to save AF:', error);
    }
  };

  // Lógica de seleção múltipla
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleAfIds = new Set(filteredAfs.map(af => af.id));
      setSelectedAfIds(allVisibleAfIds);
    } else {
      setSelectedAfIds(new Set());
    }
  };

  const handleSelectAf = (id: string, checked: boolean) => {
    setSelectedAfIds(prev => {
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
    if (selectedAfIds.size === 0) {
      showError('Nenhum AF selecionado para exclusão.');
      return;
    }
    try {
      await Promise.all(Array.from(selectedAfIds).map(id => deleteAf(id)));
      showSuccess(`${selectedAfIds.size} AFs excluídos com sucesso!`);
      setSelectedAfIds(new Set()); // Limpa a seleção após a ação
      loadAfs();
    } catch (error) {
      showError('Erro ao excluir AFs selecionados.');
      console.error('Failed to bulk delete AFs:', error);
    }
  };

  const isAllSelected = filteredAfs.length > 0 && selectedAfIds.size === filteredAfs.length;
  const isIndeterminate = selectedAfIds.size > 0 && selectedAfIds.size < filteredAfs.length;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar AFs</CardTitle>
        <Button onClick={handleAddAf} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Adicionar AF
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar AF por número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedAfIds.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Excluir Selecionados ({selectedAfIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover {selectedAfIds.size} AFs selecionados. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando AFs...</p>
        ) : filteredAfs.length === 0 && searchQuery.length > 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum AF encontrado para "{searchQuery}".</p>
        ) : filteredAfs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum AF cadastrado.</p>
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
                      aria-label="Selecionar todos os AFs"
                    />
                  </TableHead>
                  <TableHead>Número do AF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAfs.map((af) => (
                  <TableRow key={af.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAfIds.has(af.id)}
                        onCheckedChange={(checked) => handleSelectAf(af.id, checked === true)}
                        aria-label={`Selecionar AF ${af.af_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{af.af_number}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAf(af)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAf(af.id)}>
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
            <DialogTitle>{currentAf ? 'Editar AF' : 'Adicionar Novo AF'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="af_number" className="text-right">
                Número do AF
              </Label>
              <Input
                id="af_number"
                value={formAfNumber}
                onChange={(e) => setFormAfNumber(e.target.value)}
                className="col-span-3"
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

export default AfManagementTable;