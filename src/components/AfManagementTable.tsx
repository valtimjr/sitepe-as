/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Upload, Download, MoreHorizontal, FileText } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'; // Importar Sheet e SheetFooter

// Função auxiliar para obter valor de uma linha, ignorando case e variações
const getRowValue = (row: any, keys: string[]): string | undefined => {
  const lowerCaseRow = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase()] = row[key];
    return acc;
  }, {} as { [key: string]: any });

  for (const key of keys) {
    const value = lowerCaseRow[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }
  return undefined;
};

const AfManagementTable: React.FC = () => {
  const [afs, setAfs] = useState<Af[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Alterado para isSheetOpen
  const [currentAf, setCurrentAf] = useState<Af | null>(null);
  const [formAfNumber, setFormAfNumber] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAfIds, setSelectedAfIds] = useState<Set<string>>(() => new Set());
  
  // Novos estados para importação
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [parsedAfsToImport, setParsedAfsToImport] = useState<Af[]>([]);
  const [importLog, setImportLog] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAfs();
  }, []);

  const loadAfs = async () => {
    console.time('AfManagementTable: loadAfs');
    setIsLoading(true);
    try {
      const fetchedAfs = await getAfsFromService();
      setAfs(fetchedAfs);
    } catch (error) {
      showError('Erro ao carregar AFs.');
    } finally {
      setIsLoading(false);
      console.timeEnd('AfManagementTable: loadAfs');
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
    setFormDescricao('');
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleEditAf = (af: Af) => {
    setCurrentAf(af);
    setFormAfNumber(af.af_number);
    setFormDescricao(af.descricao || '');
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleDeleteAf = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este AF?')) return;
    try {
      await deleteAf(id);
      showSuccess('AF excluído com sucesso!');
      loadAfs();
    } catch (error) {
      showError('Erro ao excluir AF.');
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
        descricao: formDescricao.trim(), // Garante que descricao é sempre uma string
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
      setIsSheetOpen(false); // Fecha o Sheet
      loadAfs();
    } catch (error) {
      showError('Erro ao salvar AF.');
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
    }
  };

  const handleImportCsv = () => {
    // Aciona o clique no input de arquivo oculto
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data as any[];
          
          let newAfs: Af[] = parsedData.map(row => {
            const afNumber = getRowValue(row, ['af_number', 'codigo', 'AF']);
            // CHAVES DE BUSCA ATUALIZADAS
            const descricao = getRowValue(row, ['descricao', 'descrição', 'description', 'desc']) || ''; // Garante que descricao é sempre uma string
            
            if (!afNumber) return null;

            return {
              id: getRowValue(row, ['id']) || uuidv4(),
              af_number: afNumber,
              descricao: descricao, // Atribui a string (pode ser vazia)
            };
          }).filter((af): af is Af => af !== null);

          if (newAfs.length === 0) {
            showError('Nenhum dado válido encontrado no arquivo CSV.');
            return;
          }
          
          // --- Lógica de Deduplicação ---
          const afMap = new Map<string, Af>();
          newAfs.forEach(af => {
            // A última ocorrência de um AF_NUMBER no CSV prevalece
            afMap.set(af.af_number, af);
          });
          const deduplicatedAfs = Array.from(afMap.values());
          // --- Fim da Lógica de Deduplicação ---

          setParsedAfsToImport(deduplicatedAfs);
          setImportLog([
            `Arquivo lido: ${file.name}`, 
            `Total de linhas válidas encontradas: ${newAfs.length}`,
            `AFs únicos prontos para importação: ${deduplicatedAfs.length}`
          ]);
          setIsImportConfirmOpen(true);

        },
        error: (error: any) => {
          showError('Erro ao analisar o arquivo CSV.');
        }
      });
    };

    reader.onerror = () => {
      showError('Erro ao ler o arquivo.');
    };

    reader.readAsText(file);

    // Limpa o input para permitir a importação do mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    const newAfs = parsedAfsToImport;
    const loadingToastId = showLoading('Importando e sincronizando AFs...');
    setImportLog(prev => [...prev, 'Iniciando importação para o banco de dados...']);
    console.time('AfManagementTable: confirmImport');

    try {
      await importAfs(newAfs);
      setImportLog(prev => [...prev, `Sucesso: ${newAfs.length} AFs importados/atualizados.`]);
      showSuccess(`${newAfs.length} AFs importados/atualizados com sucesso!`);
      loadAfs();
    } catch (error) {
      setImportLog(prev => [...prev, 'ERRO: Falha na importação para o Supabase.']);
      showError('Erro ao importar AFs do CSV. Verifique o log.');
    } finally {
      dismissToast(loadingToastId);
      setIsImportConfirmOpen(false);
      setParsedAfsToImport([]);
      console.timeEnd('AfManagementTable: confirmImport');
    }
  };

  const handleExportCsv = async () => {
    let dataToExport: Af[] = [];
    let loadingToastId: string | number | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de AFs...');
      console.time('AfManagementTable: exportDataAsCsv');
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
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
      console.timeEnd('AfManagementTable: exportDataAsCsv');
    }
  };

  const handleExportJson = async () => {
    let dataToExport: Af[] = [];
    let loadingToastId: string | number | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de AFs...');
      console.time('AfManagementTable: exportDataAsJson');
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
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
      console.timeEnd('AfManagementTable: exportDataAsJson');
    }
  };

  const isAllSelected = filteredAfs.length > 0 && selectedAfIds.size === filteredAfs.length;
  const isIndeterminate = selectedAfIds.size > 0 && selectedAfIds.size < filteredAfs.length;

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
              <DropdownMenuItem onSelect={handleImportCsv}>
                <Upload className="h-4 w-4 mr-2" /> Importar CSV
              </DropdownMenuItem>
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
        {/* Input de arquivo oculto movido para fora do DropdownMenu para melhor acessibilidade */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />
        
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
                      checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      aria-label="Selecionar todos os AFs"
                    />
                  </TableHead>
                  <TableHead className="w-[120px]">Número do AF</TableHead>
                  <TableHead>Descrição</TableHead>
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
                    <TableCell>{af.descricao || 'N/A'}</TableCell>
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

      {/* Sheet de Edição/Adição */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md"> {/* SheetContent com side="right" */}
          <SheetHeader>
            <SheetTitle>{currentAf ? 'Editar AF' : 'Adicionar Novo AF'}</SheetTitle>
          </SheetHeader>
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

      {/* AlertDialog de Confirmação de Importação */}
      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Confirmar Importação de AFs
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div> {/* Usando div para corrigir o aninhamento de DOM */}
                <p className="mb-4">
                  Você está prestes a importar {parsedAfsToImport.length} AFs. Isso irá atualizar os AFs existentes com o mesmo AF ou criar novos.
                </p>
                <h4 className="font-semibold text-foreground mb-2">Log de Processamento:</h4>
                <ScrollArea className="h-40 w-full rounded-md border p-4 text-sm font-mono bg-muted/50">
                  {importLog.map((line, index) => (
                    <p key={index} className="text-[0.8rem] text-muted-foreground whitespace-pre-wrap">
                      {line}
                    </p>
                  ))}
                </ScrollArea>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setParsedAfsToImport([]);
              setImportLog([]);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AfManagementTable;