/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Upload, Download, MoreHorizontal } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Af, getAfsFromService, addAf, updateAf, deleteAf, importAfs, exportDataAsCsv, exportDataAsJson, getAllAfsForExport } from '@/services/partListService';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';

const AfManagementTable: React.FC = () => {
  const [afs, setAfs] = useState<Af[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAf, setCurrentAf] = useState<Af | null>(null);
  const [formAfNumber, setFormAfNumber] = useState('');
  const [formDescricao, setFormDescricao] = useState(''); // Novo estado
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAfIds, setSelectedAfIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filteredAfs = afs.filter(af => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    return af.af_number.toLowerCase().includes(lowerCaseQuery) || 
           (af.descricao && af.descricao.toLowerCase().includes(lowerCaseQuery));
  });

  const handleAddAf = () => {
    setCurrentAf(null);
    setFormAfNumber('');
    setFormDescricao(''); // Limpa o novo campo
    setIsDialogOpen(true);
  };

  const handleEditAf = (af: Af) => {
    setCurrentAf(af);
    setFormAfNumber(af.af_number);
    setFormDescricao(af.descricao || ''); // Define o novo campo
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
      const payload: Omit<Af, 'id'> = {
        af_number: formAfNumber.trim(),
        descricao: formDescricao.trim() || undefined,
      };

      if (currentAf) {
        await updateAf({
          ...currentAf,
          ...payload,
        });
        showSuccess('AF atualizado com sucesso!');
      } else {
        await addAf(payload);
        showSuccess('AF adicionado com sucesso!');
      }
      setIsDialogOpen(false);
      loadAfs();
    } catch (error) {
      showError('Erro ao salvar AF.');
      console.error('Failed to save AF:', error);
    }
  };

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
      showSuccess(`${selectedAfIds?.size ?? 0} AFs excluídos com sucesso!`);
      setSelectedAfIds(new Set());
      loadAfs();
    } catch (error) {
      showError('Erro ao excluir AFs selecionados.');
      console.error('Failed to bulk delete AFs:', error);
    }
  };

  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedData = results.data as any[];
          
          const newAfs: Af[] = parsedData.map(row => ({
            id: row.id || uuidv4(),
            // Suporta 'af_number', 'codigo', ou 'AF' para o número do AF
            af_number: row.af_number || row.codigo || row.AF,
            // Suporta 'descricao' ou 'description' para a descrição
            descricao: row.descricao || row.description || '',
          })).filter(af => af.af_number);

          if (newAfs.length === 0) {
            showError('Nenhum dado válido encontrado no arquivo CSV.');
            return;
          }

          try {
            await importAfs(newAfs);
            showSuccess(`${newAfs.length} AFs importados/atualizados com sucesso!`);
            loadAfs();
          } catch (error) {
            showError('Erro ao importar AFs do CSV.');
            console.error('Failed to import AFs from CSV:', error);
          }
        },
        error: (error: any) => {
          showError('Erro ao analisar o arquivo CSV.');
          console.error('CSV parsing error:', error);
        }
      });
    }
  };

  const handleExportCsv = async () => {
    let dataToExport: Af[] = [];
    let loadingToastId: string | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de AFs...');
      if (selectedAfIds.size > 0) {
        dataToExport = afs.filter(af => selectedAfIds.has(af.id));
        if (dataToExport.length === 0) {
          showError('Nenhum AF selecionado para exportar.');
          return;
        }
        exportDataAsCsv(dataToExport, 'afs_selecionados.csv');
        showSuccess(`${dataToExport.length} AFs selecionados exportados para CSV com sucesso!`);
      } else {
        dataToExport = await getAllAfsForExport();
        if (dataToExport.length === 0) {
          showError('Nenhum AF para exportar.');
          return;
        }
        exportDataAsCsv(dataToExport, 'todos_afs.csv');
        showSuccess('Todos os AFs exportados para CSV com sucesso!');
      }
    } catch (error) {
      showError('Erro ao exportar AFs.');
      console.error('Failed to export AFs:', error);
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const handleExportJson = async () => {
    let dataToExport: Af[] = [];
    let loadingToastId: string | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de AFs...');
      if (selectedAfIds.size > 0) {
        dataToExport = afs.filter(af => selectedAfIds.has(af.id));
        if (dataToExport.length === 0) {
          showError('Nenhum AF selecionado para exportar.');
          return;
        }
        exportDataAsJson(dataToExport, 'afs_selecionados.json');
        showSuccess(`${dataToExport.length} AFs selecionados exportados para JSON com sucesso!`);
      } else {
        dataToExport = await getAllAfsForExport();
        if (dataToExport.length === 0) {
          showError('Nenhum AF para exportar.');
          return;
        }
        exportDataAsJson(dataToExport, 'todos_afs.json');
        showSuccess('Todos os AFs exportados para JSON com sucesso!');
      }
    } catch (error) {
      showError('Erro ao exportar AFs.');
      console.error('Failed to export AFs:', error);
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const isAllSelected = filteredAfs.length > 0 && selectedAfIds.size === filteredAfs.length;
  const isIndeterminate = selectedAfs.size > 0 && selectedAfIds.size < filteredAfs.length;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar AFs</CardTitle>
        <div className="flex flex-wrap gap-2 justify-end">
          {selectedAfIds.size > 0 && (
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
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportCsv}>
                <Upload className="h-4 w-4 mr-2" /> Importar CSV
              </DropdownMenuItem>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="h-4 w-4 mr-2" /> Exportar
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={handleExportCsv}>
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJson}>
                    Exportar JSON
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddAf} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Adicionar AF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar AF por número ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

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
                      indeterminate={isIndeterminate ? true : undefined}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      aria-label="Selecionar todos os AFs"
                    />
                  </TableHead>
                  <TableHead className="w-[120px]">Número do AF</TableHead>
                  <TableHead>Descrição</TableHead> {/* Nova Coluna */}
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
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
                    <TableCell>{af.descricao || 'N/A'}</TableCell> {/* Exibe a descrição */}
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right">
                Descrição (Opcional)
              </Label>
              <Textarea
                id="descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Ex: Frota de Caminhões Pesados"
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

export default AfManagementTable;