/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Tag, Upload, Download, Eraser, MoreHorizontal, FileText, Loader2, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Part, addPart, updatePart, deletePart, searchPartsPaginated, importParts, exportDataAsCsv, exportDataAsJson, getAllPartsForExport, cleanupEmptyParts, searchParts as searchPartsService, getParts } from '@/services/partListService';
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
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import PartSearchInput from './PartSearchInput';
import RelatedPartDisplay from './RelatedPartDisplay'; // Importado o novo componente

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

const PAGE_SIZE = 50;

const PartManagementTable: React.FC = () => {
  const { checkPageAccess } = useSession();
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPart, setCurrentPart] = useState<Part | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formName, setFormName] = useState('');
  const [formItensRelacionados, setFormItensRelacionados] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(() => new Set());
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Novos estados para importação
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [parsedPartsToImport, setParsedPartsToImport] = useState<Part[]>([]);
  const [importLog, setImportLog] = useState<string[]>([]);

  // Estados para gerenciamento de itens relacionados
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSearchResults, setRelatedSearchResults] = useState<Part[]>([]);
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');
  const [draggedRelatedItem, setDraggedRelatedItem] = useState<string | null>(null);
  const [isLoadingRelatedParts, setIsLoadingRelatedParts] = useState(false);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]); // Adicionado para busca de relacionados

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função auxiliar para formatar a string de exibição (CÓDIGO - NOME/DESCRIÇÃO)
  const formatRelatedPartString = (part: Part): string => {
    const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
    const subText = part.name && part.name.trim() !== '' ? part.descricao : '';
    
    // Formato: CÓDIGO | NOME/DESCRIÇÃO PRINCIPAL | DESCRIÇÃO SECUNDÁRIA
    return `${part.codigo}|${mainText}|${subText}`;
  };

  const loadParts = useCallback(async (query: string, page: number) => {
    console.time('PartManagementTable: loadParts');
    setIsLoading(true);
    try {
      // Carrega todas as peças para o cache local (necessário para itens relacionados)
      const allParts = await getParts();
      setAllAvailableParts(allParts);

      // Usando a função paginada
      const { parts: fetchedParts, totalCount: fetchedTotalCount } = await searchPartsPaginated(query, page, PAGE_SIZE);
      setParts(fetchedParts);
      setTotalCount(fetchedTotalCount);
      setSelectedPartIds(new Set()); // Limpa seleção ao carregar nova página/busca
    } catch (error) {
      console.error('PartManagementTable: Erro ao carregar peças:', error);
      showError('Erro ao carregar peças.');
      setParts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      console.timeEnd('PartManagementTable: loadParts');
    }
  }, []);

  useEffect(() => {
    loadParts(searchQuery, currentPage);
  }, [searchQuery, currentPage, loadParts]);

  // Efeito para a busca de peças relacionadas
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (relatedSearchQuery.length > 1) {
        setIsLoadingRelatedParts(true);
        // Usamos searchPartsService para buscar sugestões
        const results = await searchPartsService(relatedSearchQuery);
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
  }, [relatedSearchQuery]); // Depende apenas da query de busca

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Volta para a primeira página ao pesquisar
  };

  const handleAddPart = () => {
    console.log('PartManagementTable: Abrindo formulário para adicionar nova peça.');
    setCurrentPart(null);
    setFormCodigo('');
    setFormDescricao('');
    setFormTags('');
    setFormName('');
    setFormItensRelacionados([]); // Limpa itens relacionados
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleEditPart = (part: Part) => {
    console.log(`PartManagementTable: Abrindo formulário para editar peça com ID: ${part.id}`);
    setCurrentPart(part);
    setFormCodigo(part.codigo);
    setFormDescricao(part.descricao);
    setFormTags(part.tags || '');
    setFormName(part.name || '');
    setFormItensRelacionados(part.itens_relacionados || []); // Carrega itens relacionados
    setIsSheetOpen(true); // Abre o Sheet
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta peça?')) return;
    console.time('PartManagementTable: handleDeletePart');
    console.log(`PartManagementTable: Iniciando exclusão da peça com ID: ${id}`);
    try {
      console.log('PartManagementTable: Chamando deletePart() para excluir peça.');
      await deletePart(id);
      showSuccess('Peça excluída com sucesso!');
      console.log(`PartManagementTable: Peça com ID: ${id} excluída com sucesso.`);
      loadParts(searchQuery, currentPage); // Recarrega a página atual
    } catch (error) {
      console.error(`PartManagementTable: Erro ao excluir peça com ID: ${id}:`, error);
      showError('Erro ao excluir peça.');
    } finally {
      console.timeEnd('PartManagementTable: handleDeletePart');
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

    console.time('PartManagementTable: handleSubmit');
    console.log(`PartManagementTable: Iniciando submissão do formulário (modo: ${currentPart ? 'edição' : 'adição'}).`);

    try {
      const payload: Omit<Part, 'id'> = {
        codigo: formCodigo,
        descricao: formDescricao,
        tags: formTags,
        name: formName,
        itens_relacionados: formItensRelacionados, // Inclui itens relacionados
      };

      if (currentPart) {
        console.log(`PartManagementTable: Chamando updatePart() para atualizar peça com ID: ${currentPart.id}.`);
        await updatePart({
          ...currentPart,
          ...payload,
        });
        showSuccess('Peça atualizada com sucesso!');
        console.log(`PartManagementTable: Peça com ID: ${currentPart.id} atualizada com sucesso.`);
      } else {
        console.log('PartManagementTable: Chamando addPart() para adicionar nova peça.');
        await addPart(payload);
        showSuccess('Peça adicionada com sucesso!');
        console.log('PartManagementTable: Nova peça adicionada com sucesso.');
      }
      setIsSheetOpen(false); // Fecha o Sheet
      loadParts(searchQuery, currentPage);
    } catch (error) {
      console.error('PartManagementTable: Erro ao salvar peça:', error);
      showError('Erro ao salvar peça.');
    } finally {
      console.timeEnd('PartManagementTable: handleSubmit');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    console.log(`PartManagementTable: Selecionar todos: ${checked}`);
    if (checked) {
      const allVisiblePartIds = new Set(parts.map(part => part.id));
      setSelectedPartIds(allVisiblePartIds);
    } else {
      setSelectedPartIds(new Set());
    }
  };

  const handleSelectPart = (id: string, checked: boolean) => {
    console.log(`PartManagementTable: Selecionar peça ID: ${id}, checked: ${checked}`);
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
    console.time('PartManagementTable: handleBulkDelete');
    console.log(`PartManagementTable: Iniciando exclusão em massa de ${selectedPartIds.size} peças.`);
    try {
      console.log('PartManagementTable: Chamando deletePart() para cada peça selecionada.');
      await Promise.all(Array.from(selectedPartIds).map(id => deletePart(id)));
      showSuccess(`${selectedPartIds.size ?? 0} peças excluídas com sucesso!`);
      console.log(`PartManagementTable: ${selectedPartIds.size} peças excluídas em massa com sucesso.`);
      loadParts(searchQuery, currentPage);
    } catch (error) {
      console.error('PartManagementTable: Erro ao excluir peças selecionadas em massa:', error);
      showError('Erro ao excluir peças selecionadas.');
    } finally {
      console.timeEnd('PartManagementTable: handleBulkDelete');
    }
  };

  const handleBulkClearTags = async () => {
    if (selectedPartIds.size === 0) {
      showError('Nenhuma peça selecionada para limpar tags.');
      return;
    }
    console.time('PartManagementTable: handleBulkClearTags');
    console.log(`PartManagementTable: Iniciando limpeza de tags para ${selectedPartIds.size} peças.`);
    try {
      const partsToUpdate = parts.filter(part => selectedPartIds.has(part.id));
      console.log('PartManagementTable: Chamando updatePart() para limpar tags de cada peça selecionada.');
      await Promise.all(partsToUpdate.map(part => updatePart({ ...part, tags: '' })));
      showSuccess(`Tags de ${selectedPartIds.size ?? 0} peças limpas com sucesso!`);
      console.log(`PartManagementTable: Tags de ${selectedPartIds.size} peças limpas com sucesso.`);
      loadParts(searchQuery, currentPage);
    } catch (error) {
      console.error('PartManagementTable: Erro ao limpar tags das peças selecionadas:', error);
      showError('Erro ao limpar tags das peças selecionadas.');
    } finally {
      console.timeEnd('PartManagementTable: handleBulkClearTags');
    }
  };

  const handleImportCsv = () => {
    console.log('PartManagementTable: Acionando input de arquivo para importação CSV.');
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('PartManagementTable: Nenhum arquivo selecionado para importação.');
      setImportLog(['Nenhum arquivo selecionado.']);
      setParsedPartsToImport([]);
      setIsImportConfirmOpen(true);
      return;
    }

    console.log(`PartManagementTable: Arquivo "${file.name}" selecionado. Iniciando leitura...`);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      
      if (!csvText.trim()) {
        console.warn('PartManagementTable: Arquivo CSV vazio ou com apenas espaços em branco.');
        setImportLog([
          `Arquivo lido: ${file.name}`,
          'O arquivo CSV está vazio ou contém apenas espaços em branco.',
          'Nenhuma peça válida encontrada para importação.'
        ]);
        setParsedPartsToImport([]);
        setIsImportConfirmOpen(true);
        return;
      }

      console.log('PartManagementTable: Iniciando análise do CSV com PapaParse.');
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data as any[];
          console.log(`PartManagementTable: PapaParse concluiu. ${parsedData.length} linhas processadas.`);
          
          let newParts: Part[] = parsedData.map((row, index) => {
            const codigo = getRowValue(row, ['codigo', 'código', 'code']);
            const descricao = getRowValue(row, ['descricao', 'descrição', 'description', 'desc']);
            const tags = getRowValue(row, ['tags', 'tag']) || '';
            const name = getRowValue(row, ['name', 'nome']) || '';
            const itensRelacionadosString = getRowValue(row, ['itens_relacionados', 'related_items']) || ''; // NOVO CAMPO
            
            if (!codigo || !descricao) {
              console.warn(`PartManagementTable: Linha ${index + 1} ignorada por falta de Código ou Descrição.`);
              return null;
            }

            return {
              id: getRowValue(row, ['id']) || uuidv4(),
              codigo: codigo,
              descricao: descricao,
              tags: tags,
              name: name,
              itens_relacionados: itensRelacionadosString.split(';').map(s => s.trim()).filter(s => s.length > 0), // Processa o array
            };
          }).filter((part): part is Part => part !== null);

          console.log(`PartManagementTable: ${newParts.length} peças válidas extraídas antes da deduplicação.`);

          // --- Lógica de Deduplicação ---
          const partMap = new Map<string, Part>();
          newParts.forEach(part => {
            // A última ocorrência de um CÓDIGO no CSV prevalece
            partMap.set(part.codigo, part);
          });
          const deduplicatedParts = Array.from(partMap.values());
          console.log(`PartManagementTable: ${deduplicatedParts.length} peças únicas após deduplicação.`);
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
          console.error('PartManagementTable: Erro ao analisar o arquivo CSV:', error);
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
      console.error('PartManagementTable: Erro ao ler o arquivo:', reader.error);
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
    console.time('PartManagementTable: confirmImport');

    try {
      console.log(`PartManagementTable: Chamando importParts() para ${newParts.length} peças.`);
      await importParts(newParts);
      setImportLog(prev => [...prev, `Sucesso: ${newParts.length} peças importadas/atualizadas.`]);
      showSuccess(`${newParts.length} peças importadas/atualizadas com sucesso!`);
      console.log(`PartManagementTable: ${newParts.length} peças importadas/atualizadas com sucesso.`);
      loadParts(searchQuery, currentPage);
    } catch (error) {
      console.error('PartManagementTable: Erro na importação para o Supabase:', error);
      setImportLog(prev => [...prev, 'ERRO: Falha na importação para o Supabase.']);
      showError('Erro ao importar peças do CSV. Verifique o log.');
    } finally {
      dismissToast(loadingToastId);
      setIsImportConfirmOpen(false);
      setParsedPartsToImport([]);
      console.timeEnd('PartManagementTable: confirmImport');
    }
  };

  const handleExportCsv = async () => {
    let dataToExport: Part[] = [];
    let loadingToastId: string | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de peças...');
      console.time('PartManagementTable: exportDataAsCsv');
      console.log('PartManagementTable: Iniciando exportação para CSV.');
      if (selectedPartIds.size > 0) {
        console.log(`PartManagementTable: Exportando ${selectedPartIds.size} peças selecionadas.`);
        dataToExport = parts.filter(part => selectedPartIds.has(part.id));
        if (dataToExport.length === 0) {
          showError('Nenhuma peça selecionada para exportar.');
          return;
        }
        exportDataAsCsv(dataToExport, 'pecas_selecionadas.csv');
        showSuccess(`${dataToExport.length} peças selecionadas exportadas para CSV com sucesso!`);
      } else {
        console.log('PartManagementTable: Exportando todas as peças. Chamando getAllPartsForExport().');
        dataToExport = await getAllPartsForExport();
        if (dataToExport.length === 0) {
          showError('Nenhuma peça para exportar.');
          return;
        }
        exportDataAsCsv(dataToExport, 'todas_pecas.csv');
        showSuccess('Todas as peças exportadas para CSV com sucesso!');
      }
      console.log(`PartManagementTable: Exportação para CSV concluída. Total de ${dataToExport.length} itens.`);
    } catch (error) {
      console.error('PartManagementTable: Erro ao exportar peças para CSV:', error);
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
      console.log('PartManagementTable: Iniciando exportação para JSON.');
      if (selectedPartIds.size > 0) {
        console.log(`PartManagementTable: Exportando ${selectedPartIds.size} peças selecionadas.`);
        dataToExport = parts.filter(part => selectedPartIds.has(part.id));
        if (dataToExport.length === 0) {
          showError('Nenhuma peça selecionada para exportar.');
          return;
        }
        exportDataAsJson(dataToExport, 'pecas_selecionadas.json');
        showSuccess(`${dataToExport.length} peças selecionadas exportadas para JSON com sucesso!`);
      } else {
        console.log('PartManagementTable: Exportando todas as peças. Chamando getAllPartsForExport().');
        dataToExport = await getAllPartsForExport();
        if (dataToExport.length === 0) {
          showError('Nenhuma peça para exportar.');
          return;
        }
        exportDataAsJson(dataToExport, 'todas_pecas.json');
        showSuccess('Todas as peças exportadas para JSON com sucesso!');
      }
      console.log(`PartManagementTable: Exportação para JSON concluída. Total de ${dataToExport.length} itens.`);
    } catch (error) {
      console.error('PartManagementTable: Erro ao exportar peças para JSON:', error);
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
      console.log('PartManagementTable: Iniciando limpeza de peças vazias. Chamando cleanupEmptyParts().');
      const deletedCount = await cleanupEmptyParts();
      if (deletedCount > 0) {
        showSuccess(`${deletedCount} peças vazias foram removidas com sucesso!`);
        console.log(`PartManagementTable: ${deletedCount} peças vazias removidas com sucesso.`);
        loadParts(searchQuery, currentPage);
      } else {
        showSuccess('Nenhuma peça vazia encontrada para remover.');
        console.log('PartManagementTable: Nenhuma peça vazia encontrada para remover.');
      }
    } catch (error: any) {
      console.error('PartManagementTable: Erro ao limpar peças vazias:', error);
      showError(`Erro ao limpar peças vazias: ${error.message || 'Detalhes desconhecidos.'}`);
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
      console.timeEnd('PartManagementTable: cleanupEmptyParts');
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');

  const isAllSelected = parts.length > 0 && selectedPartIds.size === parts.length;
  const isIndeterminate = selectedPartIds.size > 0 && selectedPartIds.size < parts.length;

  // --- Handlers para Itens Relacionados ---
  const handleAddRelatedPart = (part: Part) => {
    const formattedPart = formatRelatedPartString(part);
    if (!formItensRelacionados.includes(formattedPart)) {
      setFormItensRelacionados(prev => [...prev, formattedPart]);
      setRelatedSearchQuery('');
      setRelatedSearchResults([]);
      showSuccess(`Peça ${part.codigo} adicionada aos itens relacionados.`);
    } else {
      showError(`Peça ${part.codigo} já está na lista de itens relacionados.`);
    }
  };

  const handleRemoveRelatedPart = (formattedPartString: string) => {
    setFormItensRelacionados(prev => prev.filter(c => c !== formattedPartString));
    showSuccess(`Item ${formattedPartString.split('|')[0]} removido dos itens relacionados.`);
  };

  const handleBulkAddRelatedParts = () => {
    const codesToSearch = bulkRelatedPartsInput
      .split(';')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    if (codesToSearch.length === 0) {
      showError('Nenhum código válido encontrado para adicionar.');
      return;
    }

    const loadingToastId = showLoading('Buscando e adicionando peças relacionadas...');
    const newRelatedItems: string[] = [];
    let foundCount = 0;

    for (const code of codesToSearch) {
      const foundPart = allAvailableParts.find(p => p.codigo.toLowerCase() === code.toLowerCase());

      if (foundPart) {
        const formattedPart = formatRelatedPartString(foundPart);
        if (!formItensRelacionados.includes(formattedPart) && !newRelatedItems.includes(formattedPart)) {
          newRelatedItems.push(formattedPart);
          foundCount++;
        }
      } else {
        // Se não for encontrado no catálogo, adiciona o código puro para permitir personalização
        // Formato: CÓDIGO | CÓDIGO | ''
        const pureCode = `${code}|${code}|`;
        if (!formItensRelacionados.includes(pureCode) && !newRelatedItems.includes(pureCode)) {
          newRelatedItems.push(pureCode);
          foundCount++;
        }
      }
    }

    if (newRelatedItems.length > 0) {
      setFormItensRelacionados(prev => Array.from(new Set([...prev, ...newRelatedItems])));
      showSuccess(`${foundCount} item(s) adicionado(s) em massa aos itens relacionados.`);
    } else {
      showError('Nenhum novo item válido encontrado ou adicionado em massa.');
    }
    setBulkRelatedPartsInput('');
    dismissToast(loadingToastId);
  };

  // Drag and Drop Handlers (Itens Relacionados)
  const handleRelatedDragStart = (e: React.DragEvent<HTMLDivElement>, item: string) => {
    setDraggedRelatedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleRelatedDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-primary');
  };

  const handleRelatedDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-primary');
  };

  const handleRelatedDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary');

    if (draggedRelatedItem && draggedRelatedItem !== targetItem) {
      const newRelatedItems = [...formItensRelacionados];
      const draggedIndex = newRelatedItems.findIndex(item => item === draggedRelatedItem);
      const targetIndex = newRelatedItems.findIndex(item => item === targetItem);

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
  // --- Fim Handlers para Itens Relacionados ---

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
            onChange={handleSearchChange}
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
          <p className="text-center text-muted-foreground py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando peças...
          </p>
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

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages} (Total: {totalCount} peças)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Sheet de Edição/Adição */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md max-h-[90vh] overflow-y-auto"> {/* Adicionado max-h e overflow */}
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

            {/* NOVO: Seção de Itens Relacionados */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Itens Relacionados (Códigos de Peça)
              </Label>
              <PartSearchInput
                onSearch={setRelatedSearchQuery}
                searchResults={relatedSearchResults}
                onSelectPart={handleAddRelatedPart}
                searchQuery={relatedSearchQuery}
                isLoading={isLoadingRelatedParts}
              />
              <div className="space-y-2">
                <Label htmlFor="bulk-related-parts" className="text-sm text-muted-foreground">
                  Adicionar múltiplos códigos (separados por ';')
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="bulk-related-parts"
                    value={bulkRelatedPartsInput}
                    onChange={(e) => setBulkRelatedPartsInput(e.target.value)}
                    placeholder="Ex: COD1; COD2; COD3"
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleBulkAddRelatedParts}
                    disabled={bulkRelatedPartsInput.trim().length === 0}
                    variant="outline"
                    size="icon"
                    aria-label="Adicionar em massa"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-24 w-full rounded-md border p-2">
                {formItensRelacionados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item relacionado adicionado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formItensRelacionados.map((formattedString, index) => (
                      <div 
                        key={formattedString} 
                        className={cn(
                          "flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full border border-transparent cursor-grab",
                          draggedRelatedItem === formattedString && 'opacity-50',
                          draggedRelatedItem && 'hover:border-primary'
                        )}
                        draggable
                        onDragStart={(e) => handleRelatedDragStart(e, formattedString)}
                        onDragOver={handleRelatedDragOver}
                        onDrop={(e) => handleRelatedDrop(e, formattedString)}
                        onDragLeave={handleRelatedDragLeave}
                        onDragEnd={handleRelatedDragEnd}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <GripVertical className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            <RelatedPartDisplay formattedString={formattedString} />
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-destructive shrink-0"
                          onClick={() => handleRemoveRelatedPart(formattedString)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                Arraste e solte os códigos acima para reordenar.
              </p>
            </div>
            {/* FIM NOVO: Seção de Itens Relacionados */}

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