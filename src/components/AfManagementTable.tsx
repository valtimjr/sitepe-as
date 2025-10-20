"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Af, getUniqueAfs, addAf, updateAf, deleteAf } from '@/services/partListService';

const AfManagementTable: React.FC = () => {
  const [afs, setAfs] = useState<Af[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAf, setCurrentAf] = useState<Af | null>(null);
  const [formAfNumber, setFormAfNumber] = useState('');

  useEffect(() => {
    loadAfs();
  }, []);

  const loadAfs = async () => {
    setIsLoading(true);
    try {
      // getUniqueAfs retorna apenas strings, precisamos dos objetos Af completos
      // Para isso, vamos buscar diretamente do Supabase ou IndexedDB
      const fetchedAfs = await getAfsFromService(); // Nova função para buscar objetos Af
      setAfs(fetchedAfs);
    } catch (error) {
      showError('Erro ao carregar AFs.');
      console.error('Failed to load AFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        // Update existing AF
        await updateAf({
          ...currentAf,
          af_number: formAfNumber.trim(),
        });
        showSuccess('AF atualizado com sucesso!');
      } else {
        // Add new AF
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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar AFs</CardTitle>
        <Button onClick={handleAddAf} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Adicionar AF
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando AFs...</p>
        ) : afs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum AF cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do AF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {afs.map((af) => (
                  <TableRow key={af.id}>
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