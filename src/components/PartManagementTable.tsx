/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Tag, Upload, Download, Eraser, MoreHorizontal, FileText } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Part, getParts, addPart, updatePart, deletePart, searchParts as searchPartsService, importParts, exportDataAsCsv, exportDataAsJson, getAllPartsForExport, cleanupEmptyParts } from '@/services/partListService';
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
import { useSession } from '@/components/SessionContextProvider';
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

const PartManagementTable: React.FC = () => {
  const { checkPageAccess } = useSession();
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Alterado para isSheetOpen
  const [currentPart, setCurrentPart] = useState<Part | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formName, setFormName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(() => new Set());

  // Novos estados para importação
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [parsedPartsToImport, setParsedPartsToImport] = useState<Part[]>([]);
  const [importLog, setImportLog] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInitialParts = async () => {
      console.time('PartManagementTable: loadInitialParts');
      setIsLoading(true);
      try {
        const fetchedParts = await getParts();
        setParts(fetchedParts);
      } catch (error) {
        showError('Erro ao carregar peças.');
      } finally {
        setIsLoading(false);
        console.timeEnd('PartManagementTable: loadInitialParts');
      }
    };

    if (!searchQuery) {
      loadInitialParts();
    }
  }, [searchQuery]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      console.time('PartManagementTable: fetchSearchResults');
      setIsLoading(true);
      try {
        const results = await searchPartsService(searchQuery);
        setParts(results);
        setSelectedPartIds(new Set());
      } catch (error) {
        showError('Erro ao buscar peças.');
        setParts([]);
      } finally {
        setIsLoading(false);
        console.timeEnd('PartManagementTable: fetchSearchResults');
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
    setFormName('');
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleEditPart = (part: Part) => {
    setCurrentPart(part);
    setFormCodigo(part.codigo);
    setFormDescricao(part.descricao);
    setFormTags(part.tags || '');
    setFormName(part.name || '');
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta peça?')) return;
    try {
      await deletePart(id);
      showSuccess('Peça excluída com sucesso!');
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao excluir peça.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo || !formDescricao) {
      showError('Código e Descrição são obrigatórios.');
      return;
    }

    if (!canEditTags && currentPart) {
      setFormTags(currentPart.tags || '');
    }

    try {
      if (currentPart) {
        await updatePart({
          ...currentPart,
          codigo: formCodigo,
          descricao: formDescricao,
          tags: formTags,
          name: formName,
        });
        showSuccess('Peça atualizada com sucesso!');
      } else {
        await addPart({
          codigo: formCodigo,
          descricao: formDescricao,
          tags: formTags,
          name: formName,
        });
        showSuccess('Peça adicionada com sucesso!');
      }
      setIsSheetOpen(false); // Fecha o Sheet
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao salvar peça.');
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
    setSelectedPartIds(new Set());
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
      showSuccess(`${selectedPartIds.size ?? 0} peças excluídas com sucesso!`);
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao excluir peças selecionadas.');
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
      showSuccess(`Tags de ${selectedPartIds.size ?? 0} peças limpas com sucesso!`);
      loadPartsAfterAction();
    } catch (error) {
      showError('Erro ao limpar tags das peças selecionadas.');
    }
  };

  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      setImportLog(['Nenhum arquivo selecionado.']);
      setParsedPartsToImport([]);
      setIsImportConfirmOpen(true);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      
      if (!csvText.trim()) {
        setImportLog([
          `Arquivo lido: ${file.name}`,
          'O arquivo CSV está vazio ou contém apenas espaços em branco.',
          'Nenhuma peça válida encontrada para importação.'
        ]);
        setParsedPartsToImport([]);
        setIsImportConfirmOpen(true);
        return;
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data as any[];
          
          let newParts: Part[] = parsedData.map((row, index) => {
            const codigo = getRowValue(row, ['codigo', 'código', 'code']);
            const descricao = getRowValue(row, ['descricao', 'descrição', 'description', 'desc']);
            const tags = getRowValue(row, ['tags', 'tag']) || '';
            const name = getRowValue(row, ['name', 'nome']) || '';
            
            if (!codigo || !descricao) {
              return null;
            }

            return {
              id: getRowValue(row, ['id']) || uuidv4(),
              codigo: codigo,
              descricao: descricao,
              tags: tags,
              name: name,
            };
          }).filter((part): part is Part => part !== null);

          // --- Lógica de Deduplicação ---
          const partMap = new Map<string, Part>();
          newParts.forEach(part => {
            partMap.set(part.codigo, part);
          });
          const deduplicatedParts = Array.from(partMap.values());
          // --- Fim da Lógica de Deduplicação ---

          setParsedPartsToImport(deduplicatedParts);
          setImportLog([
            `Arquivo lido: ${file.name}`, 
            `Total de linhas processadas: ${parsedData.length}`,
            `Linhas válidas encontradas: ${newParts.length}`,
            `Peças únicas prontas para importação: ${deduplicatedParts.length}`
          ]);
          setTimeout(() => setIsImportConfirmOpen(true), 100); 

        },
        error: (error: any) => {
          setImportLog([
            `Arquivo lido: ${file.name}`,
            `ERRO ao analisar o arquivo CSV: ${error.message}`,
            'Nenhuma peça válida encontrada para importação.'
          ]);
          setParsedPartsToImport([]);
          setTimeout(() => setIsImportConfirmOpen(true), 100);
        }
      });
    };

    reader.onerror = () => {
      setImportLog([
        `Arquivo lido: ${file.name}`,
        `ERRO ao ler o arquivo: ${reader.error?.message || 'Erro desconhecido.'}`,
        'Nenhuma peça válida encontrada para importação.'
      ]);
      setParsedPartsToImport([]);
      setTimeout(() => setIsImportConfirmOpen(true), 100);
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    const newParts = parsedPartsToImport;
    if (newParts.length === 0) {
      showError('Nenhuma peça válida para importar.');
      setIsImportConfirmOpen(false);
      setImportLog([]);
      setParsedPartsToImport([]);
      return;
    }

    const loadingToastId = showLoading('Importando e sincronizando peças...');
    setImportLog(prev => [...prev, 'Iniciando importação para o banco de dados...']);

    try {
      await importParts(newParts);
      setImportLog(prev => [...prev, `Sucesso: ${newParts.length} peças importadas/atualizadas.`]);
      showSuccess(`${newParts.length} peças importadas/atualizadas com sucesso!`);
      loadPartsAfterAction();
    } catch (error) {
      setImportLog(prev => [...prev, 'ERRO: Falha na importação para o Supabase.']);
      showError('Erro ao importar peças do CSV. Verifique o log.');
    } finally {
      dismissToast(loadingToastId);
      setIsImportConfirmOpen(false);
      setParsedPartsToImport([]);
    }
  };

  const handleExportCsv = async () => {
    let dataToExport: Part[] = [];
    let loadingToastId: string | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de peças...');
      console.time('PartManagementTable: exportDataAsCsv');
      if (selectedPartIds.size > 0) {
        dataToExport = parts.filter(part => selectedPartIds.has(part.id));
        if (dataToExport.length === 0) {
          showError('Nenhuma peça selecionada para exportar.');
          return;
        }
        exportDataAsCsv(dataToExport, 'pecas_selecionadas.csv');
        showSuccess(`${dataToExport.length} peças selecionadas exportadas para CSV com sucesso!`);
      } else {
        dataToExport = await getAllPartsForExport();
        if (dataToExport.length === 0) {
          showError('Nenhuma peça para exportar.');
          return;
        }
        exportDataAsCsv(dataToExport, 'todas_pecas.csv');
        showSuccess('Todos as peças exportadas para CSV com sucesso!');
      }
    } catch (error) {
      showError('Erro ao exportar peças.');
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
      console.timeEnd('PartManagementTable: exportDataAsCsv');
    }
  };

  const handleExportJson = async () => {
    let dataToExport: Part[] = [];
    let loadingToastId: string | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de peças...');
      console.time('PartManagementTable: exportDataAsJson');
      if (selectedPartIds.size > 0) {
        dataToExport = parts.filter(part => selectedPartIds.has(part.id));
        if (dataToExport.length === 0) {
          showError('Nenhuma peça selecionada para exportar.');
          return;
        }
        exportDataAsJson(dataToExport, 'pecas_selecionadas.json');
        showSuccess(`${dataToExport.length} peças selecionadas exportadas para JSON com sucesso!`);
      } else {
        dataToExport = await getAllPartsForExport();
        if (dataToExport.length === 0) {
          showError('Nenhuma peça para exportar.');
          return;
        }
        exportDataAsJson(dataToExport, 'todas_pecas.json');
        showSuccess('Todas as peças exportadas para JSON com sucesso!');
      }
    } catch (error) {
      showError('Erro ao exportar peças.');
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
      console.timeEnd('PartManagementTable: exportDataAsJson');
    }
  };

  const handleCleanupEmptyParts = async () => {
    let loadingToastId: string | undefined;
    try {
      loadingToastId = showLoading('Limpando peças vazias...');
      console.time('PartManagementTable: cleanupEmptyParts');
      const deletedCount = await cleanupEmptyParts();
      if (deletedCount > 0) {
        showSuccess(`${deletedCount} peças vazias foram removidas com sucesso!`);
        loadPartsAfterAction();
      } else {
        showSuccess('Nenhuma peça vazia encontrada para remover.');
      }
    } catch (error: any) {
      showError(`Erro ao limpar peças vazias: ${error.message || 'Detalhes desconhecidos.'}`);
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
      console.timeEnd('PartManagementTable: cleanupEmptyParts');
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');

  const isAllSelected = parts.length > 0 && selectedPartIds.size === parts.length;
  const isIndeterminate = selectedPartIds.size > 0 && selectedPartIds.size < parts.length;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar Peças</CardTitle>
        <div className="flex flex-wrap gap-2 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleImportCsv(); }}>
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
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Eraser className="h-4 w-4 mr-2" /> Limpar Peças Vazias
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover todas as peças que não possuem Código e Descrição preenchidos. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanupEmptyParts}>Limpar Agora</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddPart} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Adicionar Peça
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Input de arquivo oculto */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          style={{ position: 'absolute', left: '-9999px' }} 
        />
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar peça por código, descrição, nome ou tags..."
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
                <Button variant="outline" className="flex items-center gap-2" disabled={!canEditTags}>
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
                      indeterminate={isIndeterminate ? true : undefined}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      aria-label="Selecionar todas as peças"
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
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
                    <TableCell>{part.name || 'N/A'}</TableCell>
                    <TableCell>{part.descricao}</TableCell>
                    <TableCell>{part.tags || ''}</TableCell>
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

      {/* Sheet de Edição/Adição */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md"> {/* SheetContent com side="right" */}
          <SheetHeader>
            <SheetTitle>{currentPart ? 'Editar Peça' : 'Adicionar Nova Peça'}</SheetTitle>
          </SheetHeader>
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
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome da peça (ex: Filtro de Ar)"
                className="col-span-3"
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
                disabled={!canEditTags}
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
              <FileText className="h-5 w-5" /> Confirmar Importação de Peças
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div> {/* Usando div para corrigir o aninhamento de DOM */}
                {parsedPartsToImport.length > 0 ? (
                  <p className="mb-4">
                    Você está prestes a importar {parsedPartsToImport.length} peças. Isso irá atualizar as peças existentes com o mesmo Código ou criar novas.
                  </p>
                ) : (
                  <p className="mb-4 text-destructive">
                    Nenhuma peça válida encontrada para importação. Verifique o formato do seu arquivo CSV.
                  </p>
                )}
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
              setParsedPartsToImport([]);
              setImportLog([]);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} disabled={parsedPartsToImport.length === 0}>
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PartManagementTable;