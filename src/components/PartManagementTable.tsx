/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Tag, Upload, Download, Eraser, MoreHorizontal, FileText, Loader2, ChevronLeft, ChevronRight, GripVertical, Link2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Part, addPart, updatePart, deletePart, searchPartsPaginated, importParts, exportDataAsCsv, exportDataAsJson, getAllPartsForExport, cleanupEmptyParts, searchParts as searchPartsService, getParts, batchUpdateRelations } from '@/services/partListService';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import PartSearchInput from './PartSearchInput';
import RelatedPartDisplay from './RelatedPartDisplay';
import { RelatedPart } from '@/types/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompany } from '@/context/CompanyContext';

const PAGE_SIZE = 50;

const PartManagementTable: React.FC = () => {
  const { checkPageAccess } = useSession();
  const { company, branding } = useCompany();
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPart, setCurrentPart] = useState<Part | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formName, setFormName] = useState('');
  const [formItensRelacionados, setFormItensRelacionados] = useState<RelatedPart[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(() => new Set());
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estados para importação
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [parsedPartsToImport, setParsedPartsToImport] = useState<Part[]>([]);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [updateExistingParts, setUpdateExistingParts] = useState(true);
  const [importStats, setImportStats] = useState({ newCount: 0, existingCount: 0 });
  
  // Novos estados para o mapeamento CSV
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [currentImportFile, setCurrentImportFile] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState({
    codigo: '',
    descricao: '',
    tags: '',
    name: '',
    itens_relacionados: ''
  });

  // Estados para gerenciamento de itens relacionados
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSearchResults, setRelatedSearchResults] = useState<Part[]>([]);
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');
  const [draggedRelatedItem, setDraggedRelatedItem] = useState<RelatedPart | null>(null);
  const [isLoadingRelatedParts, setIsLoadingRelatedParts] = useState(false);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);

  // Estados para a nova funcionalidade de relação em lote
  const [isBatchRelateOpen, setIsBatchRelateOpen] = useState(false);
  const [batchRelateInput, setBatchRelateInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const formatRelatedPartObject = (part: Part): RelatedPart => {
    const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
    const subText = part.name && part.name.trim() !== '' && part.descricao !== mainText ? part.descricao : '';
    return { codigo: part.codigo, name: mainText, desc: subText };
  };

  const loadParts = useCallback(async (query: string, page: number, currentCompany: string) => {
    setIsLoading(true);
    try {
      const allParts = await getParts(company);
      setAllAvailableParts(allParts);

      const { parts: fetchedParts, totalCount: fetchedTotalCount } = await searchPartsPaginated(query, company, page, PAGE_SIZE);
      setParts(fetchedParts);
      setTotalCount(fetchedTotalCount);
      setSelectedPartIds(new Set());
    } catch (error) {
      console.error('Erro ao carregar peças:', error);
      showError('Erro ao carregar peças.');
      setParts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadParts(searchQuery, currentPage, company);
  }, [searchQuery, currentPage, loadParts, company]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (relatedSearchQuery.length > 1) {
        setIsLoadingRelatedParts(true);
        const results = await searchPartsService(relatedSearchQuery, company);
        setRelatedSearchResults(results);
      } else {
        setRelatedSearchResults([]);
      }
      setIsLoadingRelatedParts(false);
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [relatedSearchQuery, company]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleAddPart = () => {
    setCurrentPart(null);
    setFormCodigo('');
    setFormDescricao('');
    setFormTags('');
    setFormName('');
    setFormItensRelacionados([]);
    setIsSheetOpen(true);
  };

  const handleEditPart = (part: Part) => {
    setCurrentPart(part);
    setFormCodigo(part.codigo);
    setFormDescricao(part.descricao);
    setFormTags(part.tags || '');
    setFormName(part.name || '');
    setFormItensRelacionados(part.itens_relacionados || []);
    setIsSheetOpen(true);
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta peça?')) return;
    try {
      await deletePart(id, company);
      showSuccess('Peça excluída com sucesso!');
      loadParts(searchQuery, currentPage, company);
    } catch (error) {
      console.error('Erro ao excluir peça:', error);
      showError('Erro ao excluir peça.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo || !formDescricao) {
      showError('Código e Descrição são obrigatórios.');
      return;
    }

    const canEditTags = checkPageAccess('/manage-tags');
    if (!canEditTags && currentPart) {
      setFormTags(currentPart.tags || '');
    }

    try {
      const payload: Omit<Part, 'id'> = {
        codigo: formCodigo,
        descricao: formDescricao,
        tags: formTags.trim(),
        name: formName.trim(),
        itens_relacionados: formItensRelacionados,
      };

      if (currentPart) {
        await updatePart({
          ...currentPart,
          ...payload,
        }, company);
        showSuccess('Peça atualizada com sucesso!');
      } else {
        await addPart(payload, company);
        showSuccess('Peça adicionada com sucesso!');
      }
      setIsSheetOpen(false);
      loadParts(searchQuery, currentPage, company);
    } catch (error) {
      console.error('Erro ao salvar peça:', error);
      showError('Erro ao salvar peça.');
    }
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
    if (selectedPartIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedPartIds).map(id => deletePart(id, company)));
      showSuccess(`${selectedPartIds.size} peças excluídas com sucesso!`);
      loadParts(searchQuery, currentPage, company);
    } catch (error) {
      showError('Erro ao excluir peças selecionadas.');
    }
  };

  const handleBulkClearTags = async () => {
    if (selectedPartIds.size === 0) return;
    try {
      const partsToUpdate = parts.filter(part => selectedPartIds.has(part.id));
      await Promise.all(partsToUpdate.map(part => updatePart({ ...part, tags: '' }, company)));
      showSuccess(`Tags de ${selectedPartIds.size} peças limpas com sucesso!`);
      loadParts(searchQuery, currentPage, company);
    } catch (error) {
      showError('Erro ao limpar tags das peças selecionadas.');
    }
  };

  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    setCurrentImportFile(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      
      if (!csvText.trim()) {
        showError("O arquivo CSV está vazio.");
        return;
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          if (headers.length === 0) {
            showError("Não foi possível identificar os cabeçalhos do CSV.");
            return;
          }
          
          setCsvHeaders(headers);
          setRawCsvData(results.data);
          
          // Tenta mapear automaticamente baseado em nomes comuns
          const autoMap = {
            codigo: headers.find(h => ['codigo', 'código', 'code', 'id'].includes(h.toLowerCase().trim())) || '',
            descricao: headers.find(h => ['descricao', 'descrição', 'description', 'desc'].includes(h.toLowerCase().trim())) || '',
            tags: headers.find(h => ['tags', 'tag'].includes(h.toLowerCase().trim())) || '',
            name: headers.find(h => ['name', 'nome'].includes(h.toLowerCase().trim())) || '',
            itens_relacionados: headers.find(h => ['itens_relacionados', 'related_items', 'relacionados'].includes(h.toLowerCase().trim())) || ''
          };
          
          setColumnMapping(autoMap);
          setIsMappingDialogOpen(true);
        },
        error: (error: any) => {
          showError(`Erro ao ler CSV: ${error.message}`);
        }
      });
    };

    reader.onerror = () => {
      showError("Erro ao ler o arquivo.");
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyMapping = () => {
    if (!columnMapping.codigo || !columnMapping.descricao) {
      showError("É obrigatório mapear as colunas de 'Código' e 'Descrição'.");
      return;
    }

    let newParts: Part[] = rawCsvData.map((row) => {
      const codigo = row[columnMapping.codigo]?.trim();
      const descricao = row[columnMapping.descricao]?.trim();
      const tags = columnMapping.tags ? row[columnMapping.tags]?.trim() : '';
      const name = columnMapping.name ? row[columnMapping.name]?.trim() : '';
      const itensRelacionadosString = columnMapping.itens_relacionados ? row[columnMapping.itens_relacionados]?.trim() : '';
      
      if (!codigo || !descricao) {
        return null;
      }

      return {
        id: row.id || uuidv4(),
        codigo: codigo,
        descricao: descricao,
        tags: tags || '',
        name: name || '',
        itens_relacionados: itensRelacionadosString 
          ? itensRelacionadosString.split(';').map((s:string) => s.trim()).filter((s:string) => s.length > 0).map((code:string) => ({ codigo: code, name: code, desc: '' })) 
          : [],
      };
    }).filter((part): part is Part => part !== null);

    // Deduplicação no arquivo antes de importar
    const partMap = new Map<string, Part>();
    newParts.forEach(part => {
      partMap.set(part.codigo, part);
    });
    const deduplicatedParts = Array.from(partMap.values());

    // Conta novas vs existentes
    const existingCodes = new Set(allAvailableParts.map(p => p.codigo.toLowerCase().trim()));
    let newCount = 0;
    let existingCount = 0;

    deduplicatedParts.forEach(part => {
      if (existingCodes.has(part.codigo.toLowerCase().trim())) {
        existingCount++;
      } else {
        newCount++;
      }
    });

    setImportStats({ newCount, existingCount });
    setParsedPartsToImport(deduplicatedParts);
    setUpdateExistingParts(true); // reset para padrão

    setImportLog([
      `Arquivo lido: ${currentImportFile}`, 
      `Total de linhas com código/descrição: ${newParts.length}`,
      `Peças prontas após deduplicação local: ${deduplicatedParts.length}`,
    ]);
    
    setIsMappingDialogOpen(false);
    setTimeout(() => setIsImportConfirmOpen(true), 300);
  };

  const confirmImport = async () => {
    const existingCodes = new Set(allAvailableParts.map(p => p.codigo.toLowerCase().trim()));
    
    const finalPartsToImport = updateExistingParts 
      ? parsedPartsToImport 
      : parsedPartsToImport.filter(p => !existingCodes.has(p.codigo.toLowerCase().trim()));

    if (finalPartsToImport.length === 0) {
      showError('Nenhuma peça para importar com as opções selecionadas.');
      setIsImportConfirmOpen(false);
      return;
    }

    const loadingToastId = showLoading('Importando peças...');
    setImportLog(prev => [...prev, 'Enviando para o banco de dados...']);

    try {
      await importParts(finalPartsToImport, company);
      setImportLog(prev => [...prev, `Sucesso: ${finalPartsToImport.length} peças processadas.`]);
      showSuccess(`${finalPartsToImport.length} peças processadas com sucesso!`);
      loadParts(searchQuery, currentPage, company);
    } catch (error) {
      setImportLog(prev => [...prev, 'ERRO: Falha na importação.']);
      showError('Erro ao importar peças do CSV.');
    } finally {
      dismissToast(loadingToastId);
      setIsImportConfirmOpen(false);
      setParsedPartsToImport([]);
    }
  };

  const handleExportCsv = async () => {
    let dataToExport: Part[] = [];
    let loadingToastId;
    try {
      loadingToastId = showLoading('Preparando exportação...');
      if (selectedPartIds.size > 0) {
        dataToExport = parts.filter(part => selectedPartIds.has(part.id));
        exportDataAsCsv(dataToExport, 'pecas_selecionadas.csv');
        showSuccess(`${dataToExport.length} peças exportadas para CSV.`);
      } else {
        dataToExport = await getAllPartsForExport(company);
        exportDataAsCsv(dataToExport, `todas_pecas_${company}.csv`);
        showSuccess('Todas as peças exportadas para CSV.');
      }
    } catch (error) {
      showError('Erro ao exportar peças.');
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const handleExportJson = async () => {
    let dataToExport: Part[] = [];
    let loadingToastId;
    try {
      loadingToastId = showLoading('Preparando exportação...');
      if (selectedPartIds.size > 0) {
        dataToExport = parts.filter(part => selectedPartIds.has(part.id));
        exportDataAsJson(dataToExport, 'pecas_selecionadas.json');
        showSuccess(`${dataToExport.length} peças exportadas para JSON.`);
      } else {
        dataToExport = await getAllPartsForExport(company);
        exportDataAsJson(dataToExport, `todas_pecas_${company}.json`);
        showSuccess('Todas as peças exportadas para JSON.');
      }
    } catch (error) {
      showError('Erro ao exportar peças.');
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const handleCleanupEmptyParts = async () => {
    let loadingToastId;
    try {
      loadingToastId = showLoading('Limpando peças vazias...');
      const deletedCount = await cleanupEmptyParts(company);
      if (deletedCount > 0) {
        showSuccess(`${deletedCount} peças vazias removidas.`);
        loadParts(searchQuery, currentPage, company);
      } else {
        showSuccess('Nenhuma peça vazia encontrada.');
      }
    } catch (error) {
      showError(`Erro ao limpar peças vazias.`);
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');

  const isAllSelected = parts.length > 0 && selectedPartIds.size === parts.length;
  const isIndeterminate = selectedPartIds.size > 0 && selectedPartIds.size < parts.length;

  const handleAddRelatedPart = (part: Part) => {
    const relatedPartObject = formatRelatedPartObject(part);
    if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo)) {
      setFormItensRelacionados(prev => [...prev, relatedPartObject]);
      setRelatedSearchQuery('');
      setRelatedSearchResults([]);
      showSuccess(`Peça '${part.codigo}' adicionada.`);
    } else {
      showError(`Peça já está na lista.`);
    }
  };

  const handleRemoveRelatedPart = (codigo: string) => {
    setFormItensRelacionados(prev => prev.filter(p => p.codigo !== codigo));
  };

  const handleBulkAddRelatedParts = async () => {
    const codesToSearch = bulkRelatedPartsInput.split(';').map(c => c.trim()).filter(Boolean);
    if (codesToSearch.length === 0) return;

    const newRelatedItems: RelatedPart[] = [];
    for (const code of codesToSearch) {
      const foundPart = allAvailableParts.find(p => p.codigo.toLowerCase() === code.toLowerCase());
      if (foundPart) {
        const relatedPartObject = formatRelatedPartObject(foundPart);
        if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo)) {
          newRelatedItems.push(relatedPartObject);
        }
      } else {
        const pureCodeObject = { codigo: code, name: code, desc: '' };
        if (!formItensRelacionados.some(p => p.codigo === pureCodeObject.codigo)) {
          newRelatedItems.push(pureCodeObject);
        }
      }
    }

    if (newRelatedItems.length > 0) {
      setFormItensRelacionados(prev => Array.from(new Set([...prev, ...newRelatedItems])));
      showSuccess(`${newRelatedItems.length} itens adicionados.`);
    }
    setBulkRelatedPartsInput('');
  };

  const handleRelatedDragStart = (e: React.DragEvent<HTMLDivElement>, item: RelatedPart) => {
    setDraggedRelatedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.codigo);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleRelatedDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRelatedDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: RelatedPart) => {
    e.preventDefault();
    if (draggedRelatedItem && draggedRelatedItem.codigo !== targetItem.codigo) {
      const newRelatedItems = [...formItensRelacionados];
      const draggedIndex = newRelatedItems.findIndex(item => item.codigo === draggedRelatedItem.codigo);
      const targetIndex = newRelatedItems.findIndex(item => item.codigo === targetItem.codigo);
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newRelatedItems.splice(draggedIndex, 1);
        newRelatedItems.splice(targetIndex, 0, removed);
        setFormItensRelacionados(newRelatedItems);
      }
    }
    setDraggedRelatedItem(null);
  };

  const handleRelatedDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedRelatedItem(null);
  };

  const handleBatchRelateSave = async () => {
    const codesToRelate = Array.from(new Set(batchRelateInput.split(';').map(c => c.trim()).filter(Boolean)));
    if (codesToRelate.length < 2) {
      showError('Insira pelo menos dois códigos.');
      return;
    }

    const loadingToastId = showLoading('Criando relações...');
    try {
      const { updatedCount, notFoundCodes } = await batchUpdateRelations(codesToRelate, company);
      let msg = `${updatedCount} peças relacionadas!`;
      if (notFoundCodes.length > 0) msg += ` Não encontrados: ${notFoundCodes.join(', ')}`;
      showSuccess(msg);
      setIsBatchRelateOpen(false);
      setBatchRelateInput('');
      loadParts(searchQuery, currentPage, company);
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar Peças ({branding.name})</CardTitle>
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
                  <DropdownMenuItem onClick={handleExportCsv}>Exportar CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJson}>Exportar JSON</DropdownMenuItem>
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
                      Esta ação irá remover todas as peças que não possuem Código e Descrição preenchidos nesta empresa.
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
          <Button onClick={() => setIsBatchRelateOpen(prev => !prev)} variant="outline" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Criar Relação em Lotes
          </Button>
          <Button onClick={handleAddPart} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Adicionar Peça
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isBatchRelateOpen && (
          <Card className="mb-4 bg-muted/50">
            <CardHeader><CardTitle className="text-lg">Criar Relação em Lote</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Códigos das Peças (;)</Label>
                <Textarea value={batchRelateInput} onChange={e => setBatchRelateInput(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsBatchRelateOpen(false)}>Cancelar</Button>
                <Button onClick={handleBatchRelateSave}>Salvar Relações</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ position: 'absolute', left: '-9999px' }} />
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Buscar peça..." value={searchQuery} onChange={handleSearchChange} className="pl-9" />
        </div>

        {selectedPartIds.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir ({selectedPartIds.size})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" disabled={!canEditTags}><Tag className="h-4 w-4" /> Limpar Tags ({selectedPartIds.size})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkClearTags}>Limpar Tags</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isLoading ? (
          <p className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></p>
        ) : parts.length === 0 ? (
          <p className="text-center py-8">Nenhuma peça encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"><Checkbox checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false} onCheckedChange={c => handleSelectAll(c===true)}/></TableHead>
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
                    <TableCell><Checkbox checked={selectedPartIds.has(part.id)} onCheckedChange={c => handleSelectPart(part.id, c===true)}/></TableCell>
                    <TableCell className="font-medium">{part.codigo}</TableCell>
                    <TableCell>{part.name || 'N/A'}</TableCell>
                    <TableCell>{part.descricao}</TableCell>
                    <TableCell>{part.tags || ''}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditPart(part)} className="mr-2"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePart(part.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialog para Mapeamento CSV */}
      <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mapear Colunas do CSV</DialogTitle>
            <DialogDescription>
              Selecione as colunas do seu arquivo correspondentes aos campos do sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-codigo" className="text-right font-bold">Código *</Label>
              <select
                id="map-codigo"
                value={columnMapping.codigo}
                onChange={(e) => setColumnMapping({...columnMapping, codigo: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione a coluna...</option>
                {csvHeaders.map(h => <option key={`cod-${h}`} value={h}>{h}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-descricao" className="text-right font-bold">Descrição *</Label>
              <select
                id="map-descricao"
                value={columnMapping.descricao}
                onChange={(e) => setColumnMapping({...columnMapping, descricao: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione a coluna...</option>
                {csvHeaders.map(h => <option key={`desc-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-name" className="text-right">Nome</Label>
              <select
                id="map-name"
                value={columnMapping.name}
                onChange={(e) => setColumnMapping({...columnMapping, name: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Nenhuma (Opcional)</option>
                {csvHeaders.map(h => <option key={`name-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-tags" className="text-right">Tags</Label>
              <select
                id="map-tags"
                value={columnMapping.tags}
                onChange={(e) => setColumnMapping({...columnMapping, tags: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Nenhuma (Opcional)</option>
                {csvHeaders.map(h => <option key={`tag-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-related" className="text-right text-xs leading-tight">Itens Relacionados</Label>
              <select
                id="map-related"
                value={columnMapping.itens_relacionados}
                onChange={(e) => setColumnMapping({...columnMapping, itens_relacionados: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Nenhuma (Opcional)</option>
                {csvHeaders.map(h => <option key={`rel-${h}`} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMappingDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleApplyMapping}>Confirmar Mapeamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{currentPart ? 'Editar Peça' : 'Nova Peça'}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Código</Label>
              <Input value={formCodigo} onChange={e => setFormCodigo(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Nome</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Descrição</Label>
              <Textarea value={formDescricao} onChange={e => setFormDescricao(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tags</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} className="col-span-3" disabled={!canEditTags} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2"><Tag className="h-4 w-4" /> Itens Relacionados</Label>
              <PartSearchInput onSearch={setRelatedSearchQuery} searchResults={relatedSearchResults} onSelectPart={handleAddRelatedPart} searchQuery={relatedSearchQuery} isLoading={isLoadingRelatedParts} />
              <div className="space-y-2">
                <Label className="text-sm">Adicionar múltiplos códigos (;)</Label>
                <div className="flex gap-2">
                  <Textarea value={bulkRelatedPartsInput} onChange={e => setBulkRelatedPartsInput(e.target.value)} rows={2} className="flex-1" />
                  <Button type="button" onClick={handleBulkAddRelatedParts} disabled={!bulkRelatedPartsInput.trim()} variant="outline" size="icon"><PlusCircle className="h-4 w-4" /></Button>
                </div>
              </div>
              <ScrollArea className={cn("w-full rounded-md border p-2", isMobile ? "h-24" : "max-h-96")}>
                {formItensRelacionados.map((item) => (
                  <div key={item.codigo} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs mb-2 cursor-grab" draggable onDragStart={e => handleRelatedDragStart(e, item)} onDragOver={handleRelatedDragOver} onDrop={e => handleRelatedDrop(e, item)} onDragEnd={handleRelatedDragEnd}>
                    <GripVertical className="h-3 w-3" />
                    <span className="truncate"><RelatedPartDisplay item={item} /></span>
                    <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0 ml-auto" onClick={() => handleRemoveRelatedPart(item.codigo)}><XCircle className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Importar Peças</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {parsedPartsToImport.length > 0 ? (
                  <div className="mb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-md border border-border">
                      <div>
                        <span className="font-bold text-lg text-green-600 block">{importStats.newCount}</span>
                        <span className="text-muted-foreground font-medium">Peças não cadastradas (Novas)</span>
                      </div>
                      <div>
                        <span className="font-bold text-lg text-blue-600 block">{importStats.existingCount}</span>
                        <span className="text-muted-foreground font-medium">Peças já existentes</span>
                      </div>
                    </div>

                    {importStats.existingCount > 0 && (
                      <div className="flex items-start space-x-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-md border border-blue-200 dark:border-blue-800/50">
                        <Checkbox 
                          id="update-existing" 
                          checked={updateExistingParts} 
                          onCheckedChange={(c) => setUpdateExistingParts(c === true)} 
                          className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="update-existing"
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            Atualizar informações de peças já existentes
                          </label>
                          <p className="text-xs opacity-80">
                            Se marcado, os dados (descrição, tags, etc) das peças existentes serão substituídos pelos do CSV. <strong>Peças não serão duplicadas.</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 text-destructive">Nenhuma peça válida encontrada.</p>
                )}
                <h4 className="font-semibold text-foreground mb-2">Log de processamento:</h4>
                <ScrollArea className="h-28 w-full rounded-md border p-3 text-xs font-mono bg-muted/30">
                  {importLog.map((line, i) => <p key={i} className="text-muted-foreground mb-1">{line}</p>)}
                </ScrollArea>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setParsedPartsToImport([]); setImportLog([]); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} disabled={parsedPartsToImport.length === 0 || (importStats.newCount === 0 && !updateExistingParts)}>
              Iniciar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PartManagementTable;