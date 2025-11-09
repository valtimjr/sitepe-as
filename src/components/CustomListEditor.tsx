"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical, Tag, Info, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part, RelatedPart, MangueiraItemData } from '@/types/supabase';
import { getCustomListItems, addCustomListItem, updateCustomListItem, deleteCustomListItem, deleteCustomListItem as deleteCustomListItemService, updateAllCustomListItems } from '@/services/customListService';
import { getParts, searchParts as searchPartsService, updatePart } from '@/services/partListService';
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { lazyGenerateCustomListPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Importar Popover
import PartSearchInput from './PartSearchInput';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import RelatedPartDisplay from './RelatedPartDisplay'; // Importado o novo componente
import { useSession } from './SessionContextProvider';

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
  editingItem?: CustomListItem | null;
  onItemSaved?: () => void;
  allAvailableParts: Part[];
}

// Interface para o estado de busca de sub-peças
interface SubPartSearchState {
  query: string;
  results: Part[];
  isLoading: boolean;
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose, editingItem, onItemSaved, allAvailableParts }) => {
  const { user } = useSession();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentEditingItemId, setCurrentEditingItemId] = useState<string | null>(null);

  // Form states for main item
  const [formType, setFormType] = useState<'item' | 'subtitle' | 'separator' | 'mangueira'>('item');
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formItensRelacionados, setFormItensRelacionados] = useState<RelatedPart[]>([]);
  
  // Search states for main item form
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [selectedPartFromSearch, setSelectedPartFromSearch] = useState<Part | null>(null);

  // Search states for related items form
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSearchResults, setSearchResultsRelated] = useState<Part[]>([]);

  // Bulk add related items state
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');

  // Drag and Drop states
  const [draggedItem, setDraggedItem] = useState<CustomListItem | null>(null);
  const [draggedRelatedItem, setDraggedRelatedItem] = useState<RelatedPart | null>(null);

  // State to control if the form is for a new item or editing an existing one
  const [isFormForNewItem, setIsFormForNewItem] = useState(false);

  // State for related items popover
  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // NOVO: Estados para Mangueira
  const [formMangueiraPart, setFormMangueiraPart] = useState<Part | null>(null);
  const [formConexao1Part, setFormConexao1Part] = useState<Part | null>(null);
  const [formConexao2Part, setFormConexao2Part] = useState<Part | null>(null);
  const [formCorteCm, setFormCorteCm] = useState<number>(0);
  
  // NOVO: Search states para Mangueira sub-peças
  const [mangueiraSearch, setMangueiraSearch] = useState<SubPartSearchState>({ query: '', results: [], isLoading: false });
  const [conexao1Search, setConexao1Search] = useState<SubPartSearchState>({ query: '', results: [], isLoading: false });
  const [conexao2Search, setConexao2Search] = useState<SubPartSearchState>({ query: '', results: [], isLoading: false });

  // Função auxiliar para formatar a string de exibição (CÓDIGO - NOME/DESCRIÇÃO)
  const formatRelatedPartObject = (part: Part): RelatedPart => {
    const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
    const subText = part.name && part.name.trim() !== '' && part.descricao !== mainText ? part.descricao : '';
    return { codigo: part.codigo, name: mainText, desc: subText };
  };

  const loadItems = useCallback(async () => {
    if (!list.id) {
      return;
    }
    setIsLoading(true);
    try {
      const fetchedItems = await getCustomListItems(list.id);
      setItems(fetchedItems);
    } catch (error) {
      console.error('Erro ao carregar itens da lista:', error);
      showError('Erro ao carregar itens da lista.');
    } finally {
      setIsLoading(false);
    }
  }, [list.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Helper to handle search for a specific sub-part
  const handleSubPartSearch = useCallback(async (query: string, setState: React.Dispatch<React.SetStateAction<SubPartSearchState>>) => {
    setState(prev => ({ ...prev, query, isLoading: true }));
    if (query.length > 1) {
      const results = await searchPartsService(query);
      setState(prev => ({ ...prev, results, isLoading: false }));
    } else {
      setState(prev => ({ ...prev, results: [], isLoading: false }));
    }
  }, []);

  // Effect for Mangueira sub-part searches
  useEffect(() => {
    const handler1 = setTimeout(() => {
      if (mangueiraSearch.query.length > 1) handleSubPartSearch(mangueiraSearch.query, setMangueiraSearch);
    }, 300);
    const handler2 = setTimeout(() => {
      if (conexao1Search.query.length > 1) handleSubPartSearch(conexao1Search.query, setConexao1Search);
    }, 300);
    const handler3 = setTimeout(() => {
      if (conexao2Search.query.length > 1) handleSubPartSearch(conexao2Search.query, setConexao2Search);
    }, 300);
    return () => {
      clearTimeout(handler1);
      clearTimeout(handler2);
      clearTimeout(handler3);
    };
  }, [mangueiraSearch.query, conexao1Search.query, conexao2Search.query, handleSubPartSearch]);


  // Helper to reset Mangueira specific fields
  const resetMangueiraFields = () => {
    setFormMangueiraPart(null);
    setFormConexao1Part(null);
    setFormConexao2Part(null);
    setFormCorteCm(0);
    setMangueiraSearch({ query: '', results: [], isLoading: false });
    setConexao1Search({ query: '', results: [], isLoading: false });
    setConexao2Search({ query: '', results: [], isLoading: false });
  };

  const resetForm = () => {
    setFormType('item');
    setFormItemName('');
    setFormPartCode('');
    setFormDescription('');
    setFormQuantity(1);
    setFormItensRelacionados([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPartFromSearch(null);
    setBulkRelatedPartsInput('');
    setRelatedSearchQuery('');
    setSearchResultsRelated([]);
    resetMangueiraFields(); // Inclui reset de Mangueira
  };

  // Efeito para preencher o formulário quando `editingItem` muda
  useEffect(() => {
    const initializeFormForEdit = async () => {
      resetForm(); // Começa sempre limpando

      if (editingItem) {
        setIsFormForNewItem(false);
        setCurrentEditingItemId(editingItem.id);
        setFormType(editingItem.type || 'item');
        setFormItemName(editingItem.item_name);
        setFormOrderIndex(editingItem.order_index);
        
        if (editingItem.type === 'mangueira' && editingItem.mangueira_data) {
          const data = editingItem.mangueira_data;
          
          // Helper to find part by code
          const findPart = (code: string) => allAvailableParts.find(p => p.codigo === code) || null;

          setFormCorteCm(data.corte_cm);
          
          // Find and set the three parts
          const mangueiraPart = findPart(data.mangueira.codigo);
          const conexao1Part = findPart(data.conexao1.codigo);
          const conexao2Part = findPart(data.conexao2.codigo);

          setFormMangueiraPart(mangueiraPart);
          setFormConexao1Part(conexao1Part);
          setFormConexao2Part(conexao2Part);

          setFormItemName(data.mangueira.name || data.mangueira.description || 'Mangueira');

          // Set search queries for display
          setMangueiraSearch(prev => ({ ...prev, query: data.mangueira.codigo }));
          setConexao1Search(prev => ({ ...prev, query: data.conexao1.codigo }));
          setConexao2Search(prev => ({ ...prev, query: data.conexao2.codigo }));

        } else if (editingItem.type === 'item') {
          setFormPartCode(editingItem.part_code || '');
          setFormDescription(editingItem.description || '');
          setFormQuantity(editingItem.quantity);
          setFormItensRelacionados(editingItem.itens_relacionados || []);
          
          if (editingItem.part_code) {
            const results = await searchPartsService(editingItem.part_code);
            const part = results.find(p => p.codigo.toLowerCase() === editingItem.part_code!.toLowerCase());
            setSelectedPartFromSearch(part || null);
          }
        }
      } else {
        setIsFormForNewItem(true);
        setCurrentEditingItemId(null);
        resetForm();
      }
    };

    initializeFormForEdit();
  }, [editingItem, allAvailableParts]);


  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        // searchPartsService agora retorna apenas o array de Part[]
        const results = await searchPartsService(searchQuery);
        setSearchResults(results);
        setIsLoadingParts(false);
      } else {
        setSearchResults([]);
      }
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchRelatedSearchResults = async () => {
      if (relatedSearchQuery.length > 1) {
        const results = await searchPartsService(relatedSearchQuery);
        setSearchResultsRelated(results);
      } else {
        setSearchResultsRelated([]);
      }
    };
    const handler = setTimeout(() => {
      fetchRelatedSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [relatedSearchQuery]);


  const handleAdd = () => {
    setIsFormForNewItem(true);
    setCurrentEditingItemId(null);
    resetForm();
  };

  // CORRIGIDO: Função para editar item da tabela (preenche o formulário)
  const handleEditItemClick = (item: CustomListItem) => {
    setItemToEdit(item); // Define o item para o useEffect inicializar o formulário
  };

  const handleSelectPart = (part: Part) => {
    // Lógica para tipo 'item'
    if (formType === 'item') {
      setSelectedPartFromSearch(part);
      setFormPartCode(part.codigo);
      setFormDescription(part.descricao);
      setFormItemName(part.name || part.descricao || '');
      setSearchQuery('');
      setSearchResults([]);
      
      if (part.itens_relacionados && part.itens_relacionados.length > 0) {
        const relatedItems = part.itens_relacionados;
        setFormItensRelacionados(prev => {
          const existingCodes = new Set(prev.map(p => p.codigo));
          const newItems = relatedItems.filter(p => !existingCodes.has(p.codigo));
          return [...prev, ...newItems];
        });
        showSuccess(`Sugestões de itens relacionados da peça ${part.codigo} carregadas.`);
      }
    }
  };

  // New handlers for the three sub-parts search inputs
  const handleSelectMangueiraPart = (part: Part | null) => {
    setFormMangueiraPart(part);
    if (part) {
      setFormItemName(part.name || part.descricao || 'Mangueira');
      setMangueiraSearch(prev => ({ ...prev, query: part.codigo }));
    } else {
      setMangueiraSearch(prev => ({ ...prev, query: '' }));
    }
  };
  const handleSelectConexao1Part = (part: Part | null) => {
    setFormConexao1Part(part);
    if (part) {
      setConexao1Search(prev => ({ ...prev, query: part.codigo }));
    } else {
      setConexao1Search(prev => ({ ...prev, query: '' }));
    }
  };
  const handleSelectConexao2Part = (part: Part | null) => {
    setFormConexao2Part(part);
    if (part) {
      setConexao2Search(prev => ({ ...prev, query: part.codigo }));
    } else {
      setConexao2Search(prev => ({ ...prev, query: '' }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedItemName = formItemName.trim();
    const trimmedDescription = formDescription.trim();
    const trimmedPartCode = formPartCode.trim();

    if (formType === 'item' && formQuantity <= 0) {
      showError('A quantidade deve ser maior que zero para itens de peça.');
      return;
    }
    
    if (formType === 'mangueira') {
      if (!formMangueiraPart || !formConexao1Part || !formConexao2Part || formCorteCm <= 0) {
        showError('Preencha todos os campos da Mangueira (Peças e Corte em cm > 0).');
        return;
      }
    }

    if (formType !== 'separator' && !trimmedItemName && formType !== 'mangueira') {
      showError('O Nome ou a Descrição deve ser preenchido.');
      return;
    }

    const finalItemName = trimmedItemName || trimmedDescription || (formType === 'separator' ? '---' : '');

    let payload: Omit<CustomListItem, 'id'>;

    if (formType === 'mangueira') {
      const mangueiraData: MangueiraItemData = {
        mangueira: formatRelatedPartObject(formMangueiraPart!),
        conexao1: formatRelatedPartObject(formConexao1Part!),
        conexao2: formatRelatedPartObject(formConexao2Part!),
        corte_cm: formCorteCm,
      };
      
      payload = {
        type: 'mangueira',
        item_name: finalItemName,
        order_index: currentEditingItemId ? items.find(i => i.id === currentEditingItemId)?.order_index ?? items.length : items.length,
        part_code: null,
        description: null,
        quantity: 0,
        itens_relacionados: [],
        mangueira_data: mangueiraData,
      };
    } else {
      // Existing logic for 'item', 'subtitle', 'separator'
      payload = {
        type: formType,
        item_name: finalItemName,
        part_code: formType === 'item' ? trimmedPartCode || null : null,
        description: formType === 'item' ? trimmedDescription || null : null,
        quantity: formType === 'item' ? formQuantity : 0,
        order_index: currentEditingItemId ? items.find(i => i.id === currentEditingItemId)?.order_index ?? items.length : items.length,
        itens_relacionados: formType === 'item' ? formItensRelacionados : [],
        mangueira_data: undefined,
      };
    }

    try {
      if (currentEditingItemId) {
        await updateCustomListItem(list.id, { id: currentEditingItemId, ...payload } as CustomListItem);
        showSuccess('Item atualizado com sucesso!');
      } else {
        await addCustomListItem(list.id, payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      resetForm();
      setCurrentEditingItemId(null);
      loadItems();
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      showError('Erro ao salvar item.');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteCustomListItemService(list.id, itemId);
      showSuccess('Item excluído com sucesso!');
      loadItems();
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      showError('Erro ao excluir item.');
    }
  };

  const handleMoveItem = async (item: CustomListItem, direction: 'up' | 'down') => {
    const siblings = [...items];
    const currentIndex = siblings.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
  
    // Reordena o array localmente
    const [removed] = siblings.splice(currentIndex, 1);
    siblings.splice(targetIndex, 0, removed);
  
    // Re-indexa o array inteiro para garantir consistência
    const updatedItemsWithNewOrder = siblings.map((reorderedItem, index) => ({
      ...reorderedItem,
      order_index: index,
    }));
  
    // Atualiza a UI imediatamente para feedback visual
    setItems(updatedItemsWithNewOrder);
  
    const loadingToastId = showLoading('Reordenando itens...');
  
    try {
      // Envia o array completo e re-indexado para o Supabase em uma única operação
      await updateAllCustomListItems(list.id, updatedItemsWithNewOrder);
  
      showSuccess('Ordem atualizada!');
      await loadItems(); // Recarrega do Supabase para garantir consistência
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao reordenar itens:', error);
      showError('Erro ao reordenar itens.');
      // Reverte a UI para o estado anterior em caso de erro
      loadItems();
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const formatListText = () => {
    if (items.length === 0) return '';

    let formattedText = `${list.title}\n\n`;

    items.forEach(item => {
      if (item.type === 'separator') {
        formattedText += '--------------------\n';
        return;
      }
      if (item.type === 'subtitle') {
        formattedText += `\n--- ${item.item_name.toUpperCase()} ---\n`;
        return;
      }
      
      if (item.type === 'mangueira' && item.mangueira_data) {
        const data = item.mangueira_data;
        formattedText += `1 - Mangueira: ${data.mangueira.name || data.mangueira.codigo} (Cód: ${data.mangueira.codigo}) - Corte: ${data.corte_cm} cm\n`;
        formattedText += `    Conexão 1: ${data.conexao1.name || data.conexao1.codigo} (Cód: ${data.conexao1.codigo})\n`;
        formattedText += `    Conexão 2: ${data.conexao2.name || data.conexao2.codigo} (Cód: ${data.conexao2.codigo})\n`;
        return;
      }

      const quantidade = item.quantity;
      const nome = item.item_name || '';
      const codigo = item.part_code ? ` (Cód: ${item.part_code})` : '';
      const descricao = item.description || '';
      
      // Formato: [QUANTIDADE] - [NOME PERSONALIZADO] [DESCRIÇÃO] (Cód: [CÓDIGO])
      formattedText += `${quantidade} - ${nome} ${descricao}${codigo}`.trim() + '\n';
    });

    return formattedText.trim();
  };

  const handleCopyList = async () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    const textToCopy = formatListText();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar a lista:', err);
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    exportDataAsCsv(items, `${list.title.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    lazyGenerateCustomListPdf(items, list.title);
    showSuccess('PDF gerado com sucesso!');
  };

  // --- Drag and Drop Handlers (Itens da Lista Principal) ---
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, item: CustomListItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-t-2', 'border-primary');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-primary');
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, targetItem: CustomListItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('opacity-50');

    if (draggedItem && draggedItem.id !== targetItem.id) {
      const currentItemsCopy = [...items];
      const draggedIndex = currentItemsCopy.findIndex(item => item.id === draggedItem.id);
      const targetIndex = currentItemsCopy.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = currentItemsCopy.splice(draggedIndex, 1);
        currentItemsCopy.splice(targetIndex, 0, removed);
        
        const updatedItemsWithNewOrder = currentItemsCopy.map((reorderedItem, index) => ({
          ...reorderedItem,
          order_index: index,
        }));
        
        setItems(updatedItemsWithNewOrder);

        const loadingToastId = showLoading('Reordenando itens...');

        try {
          await updateAllCustomListItems(list.id, updatedItemsWithNewOrder);

          showSuccess('Ordem atualizada com sucesso!');
          await loadItems();
          onItemSaved?.();
        } catch (error) {
          console.error('Erro ao reordenar itens:', error);
          showError('Erro ao reordenar itens.');
          // Reverte a UI para o estado anterior em caso de erro
          loadItems();
        } finally {
          dismissToast(loadingToastId);
        }
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
  };
  // --- End Drag and Drop Handlers (Itens da Lista Principal) ---

  // --- Drag and Drop Handlers (Itens Relacionados) ---
  const handleRelatedDragStart = (e: React.DragEvent<HTMLDivElement>, item: RelatedPart) => {
    setDraggedRelatedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.codigo);
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

  const handleRelatedDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: RelatedPart) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary');

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
  // --- End Drag and Drop Handlers (Itens Relacionados) ---

  const handleSaveGlobalPartName = async () => {
    if (!selectedPartFromSearch || !formPartCode) {
      showError('Nenhuma peça selecionada para atualizar o nome global.');
      return;
    }
  
    const currentGlobalName = selectedPartFromSearch.name || '';
    if (formItemName.trim() === currentGlobalName.trim()) {
      showError('O nome global não foi alterado.');
      return;
    }
  
    const loadingToastId = showLoading('Atualizando nome global da peça...');
    try {
      await updatePart({ ...selectedPartFromSearch, name: formItemName.trim() });
      showSuccess('Nome global da peça atualizado com sucesso!');
      setSelectedPartFromSearch(prev => prev ? { ...prev, name: formItemName.trim() } : null);
    } catch (error) {
      console.error('Erro ao atualizar nome global da peça:', error);
      showError('Erro ao atualizar nome global da peça.');
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const handleAddRelatedPart = (part: Part) => {
    const relatedPartObject = formatRelatedPartObject(part);
    if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo)) {
      setFormItensRelacionados(prev => [...prev, relatedPartObject]);
      setRelatedSearchQuery('');
      setSearchResultsRelated([]);
      showSuccess(`Peça '${part.codigo}' adicionada aos itens relacionados.`);
    } else {
      showError(`Peça '${part.codigo}' já está na lista de itens relacionados.`);
    }
  };

  const handleRemoveRelatedPart = (codigo: string) => {
    setFormItensRelacionados(prev => prev.filter(p => p.codigo !== codigo));
    showSuccess(`Item ${codigo} removido dos itens relacionados.`);
  };

  const handleBulkAddRelatedParts = async () => {
    const codesToSearch = bulkRelatedPartsInput
      .split(';')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    if (codesToSearch.length === 0) {
      showError('Nenhum código válido encontrado para adicionar em massa.');
      return;
    }

    const loadingToastId = showLoading('Buscando e adicionando peças relacionadas...');
    const newRelatedItems: RelatedPart[] = [];
    let foundCount = 0;

    for (const code of codesToSearch) {
      const foundPart = allAvailableParts.find(p => p.codigo.toLowerCase() === code.toLowerCase());

      if (foundPart) {
        const relatedPartObject = formatRelatedPartObject(foundPart);
        if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo) && !newRelatedItems.some(p => p.codigo === relatedPartObject.codigo)) {
          newRelatedItems.push(relatedPartObject);
          foundCount++;
        }
      } else {
        const pureCodeObject = { codigo: code, name: code, desc: '' };
        if (!formItensRelacionados.some(p => p.codigo === pureCodeObject.codigo) && !newRelatedItems.some(p => p.codigo === pureCodeObject.codigo)) {
          newRelatedItems.push(pureCodeObject);
          foundCount++;
        }
      }
    }

    if (newRelatedItems.length > 0) {
      setFormItensRelacionados(prev => Array.from(new Set([...prev, ...newRelatedItems])));
      showSuccess(`${newRelatedItems.length} item(s) adicionado(s) em massa aos itens relacionados.`);
    } else {
      showError('Nenhum novo item válido encontrado ou adicionado em massa.');
    }
    setBulkRelatedPartsInput('');
    dismissToast(loadingToastId);
  };

  const renderItemRow = (item: CustomListItem, index: number) => {
    const isSeparator = item.type === 'separator';
    const isSubtitle = item.type === 'subtitle';
    const isMangueira = item.type === 'mangueira';
    const isItem = item.type === 'item';

    // Logic for Mangueira Header
    const previousItem = index > 0 ? items[index - 1] : null;
    const showMangueiraHeader = isMangueira && (!previousItem || previousItem.type !== 'mangueira');

    if (isSeparator) {
      return (
        <TableRow key={item.id} id={item.id} className="bg-muted/50 border-y border-dashed">
          <TableCell colSpan={6} className="text-center font-mono text-sm font-bold text-foreground italic p-2">
            <Separator className="my-0 bg-foreground/50 h-px" />
          </TableCell>
        </TableRow>
      );
    }

    if (isSubtitle) {
      const startIndex = items.findIndex(i => i.id === item.id);
      let endIndex = items.findIndex((i, idx) => idx > startIndex && i.type === 'subtitle');
      if (endIndex === -1) endIndex = items.length;

      const groupSelectableItems = items.slice(startIndex, endIndex).filter(i => i.type === 'item' || i.type === 'mangueira');
      const selectedInGroupCount = groupSelectableItems.filter(i => selectedItemIds.has(i.id)).length;

      const isGroupAllSelected = groupSelectableItems.length > 0 && selectedInGroupCount === groupSelectableItems.length;
      const isGroupIndeterminate = selectedInGroupCount > 0 && !isGroupAllSelected;

      return (
        <TableRow key={item.id} id={item.id} className="bg-accent/10 border-y border-primary/50">
          <TableCell className="w-[40px] p-2">
            {groupSelectableItems.length > 0 && (
              <Checkbox
                checked={isGroupAllSelected ? true : isGroupIndeterminate ? 'indeterminate' : false}
                onCheckedChange={(checked) => handleSubtitleSelect(item, checked === true)}
                aria-label={`Selecionar todos os itens em ${item.item_name}`}
              />
            )}
          </TableCell>
          <TableCell colSpan={4} className="text-left font-bold text-lg text-primary p-2">
            {item.item_name}
          </TableCell>
          <TableCell className="w-[70px] p-2 text-right">
            {/* Ações para subtítulo podem ser adicionadas aqui se necessário */}
          </TableCell>
        </TableRow>
      );
    }

    if (isMangueira) {
      const data = item.mangueira_data;
      if (!data) return null;

      return (
        <React.Fragment key={item.id}>
          {showMangueiraHeader && (
            <TableRow className="bg-muted/50 border-y border-primary/50">
              <TableHead className="w-[40px] p-2"></TableHead>
              <TableHead className="w-[4rem] p-2 text-center font-bold text-sm">Qtd</TableHead>
              <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Mangueira</TableHead>
              <TableHead className="w-[4rem] p-2 text-center font-bold text-sm">Corte (cm)</TableHead>
              <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Conexões</TableHead>
              <TableHead className="w-[70px] p-2 text-right"></TableHead>
            </TableRow>
          )}
          <TableRow key={item.id} id={item.id}>
            <TableCell className="w-[40px] p-2">
              <Checkbox
                checked={selectedItemIds.has(item.id)}
                onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
                aria-label={`Selecionar item ${item.item_name}`}
              />
            </TableCell>
            <TableCell className="font-medium p-2 text-center">1</TableCell> {/* Quantidade é sempre 1 para Mangueira */}
            
            {/* Coluna 1: Mangueira (Nome/Desc/Cód) */}
            <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm text-primary whitespace-normal break-words">{data.mangueira.name || data.mangueira.codigo}</span>
                {data.mangueira.description && (
                  <span className="text-xs text-muted-foreground italic max-w-full whitespace-normal break-words">{data.mangueira.description}</span>
                )}
                <span className="text-xs text-muted-foreground mt-1">Cód: {data.mangueira.codigo}</span>
              </div>
            </TableCell>
            
            {/* Coluna 2: Corte (cm) */}
            <TableCell className="w-[4rem] p-2 text-center font-medium text-lg">
              {data.corte_cm}
            </TableCell>
            
            {/* Coluna 3: Conexões (Mescladas) */}
            <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
              <div className="flex flex-col items-start space-y-2">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">Conexão 1: {data.conexao1.name || data.conexao1.codigo}</span>
                  <span className="text-xs text-muted-foreground italic">Cód: {data.conexao1.codigo}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">Conexão 2: {data.conexao2.name || data.conexao2.codigo}</span>
                  <span className="text-xs text-muted-foreground italic">Cód: {data.conexao2.codigo}</span>
                </div>
              </div>
            </TableCell>

            {/* Coluna 4: Ações (Vazia) */}
            <TableCell className="w-[70px] p-2 text-right">
              {/* Botão de Edição Removido */}
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    }

    // Item de peça normal (Existing logic)
    if (isItem) {
      return (
        <TableRow key={item.id} id={item.id}>
          <TableCell className="w-[40px] p-2">
            <Checkbox
              checked={selectedItemIds.has(item.id)}
              onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
              aria-label={`Selecionar item ${item.item_name}`}
            />
          </TableCell>
          <TableCell className="font-medium p-2 text-center">{item.quantity}</TableCell>
          <TableCell colSpan={3} className="w-auto whitespace-normal break-words p-2 text-left"> {/* ColSpan 3 */}
              <div className="flex flex-col items-start">
                {item.part_code && (
                  <span className="font-medium text-sm text-primary whitespace-normal break-words">{item.part_code}</span>
                )}
                <span className={cn("text-sm whitespace-normal break-words", !item.part_code && 'font-medium')}>{item.item_name}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground italic max-w-full whitespace-normal break-words">{item.description}</span>
                )}
                {item.itens_relacionados && item.itens_relacionados.length > 0 && (
                  <Popover 
                    key={`popover-${item.id}`}
                    open={isRelatedItemsPopoverOpen === item.id} 
                    onOpenChange={(open) => setIsRelatedItemsPopoverId(open ? item.id : null)}
                    modal={false}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 cursor-pointer h-auto py-0 px-1"
                      >
                        <Tag className="h-3 w-3" /> {item.itens_relacionados.length} item(s) relacionado(s)
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-w-xs p-2">
                      <p className="font-bold mb-1 text-sm">Itens Relacionados:</p>
                      <ScrollArea className={isMobile ? "h-24" : "max-h-96"}>
                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                          {item.itens_relacionados.map(rel => (
                            <li key={rel.codigo} className="list-none ml-0">
                              <RelatedPartDisplay item={rel} />
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
          </TableCell>
          <TableCell className="w-[70px] p-2 text-right">
            {/* Botão de Edição Removido */}
          </TableCell>
        </TableRow>
      );
    }
    
    return null;
  };

  return (
    <React.Fragment>
      <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
        <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-2 mb-4 mt-8">
          <Link to="/custom-menu-view">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Catálogo
            </Button>
          </Link>
          {/* NOVO BOTÃO: Minha Lista de Peças */}
          <Link to="/parts-list">
            <Button variant="outline" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" /> Minha Lista de Peças
            </Button>
          </Link>
        </div>
        
        <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
          <ListIcon className="h-8 w-8 text-primary" />
          {listTitle}
        </h1>

        <Card className="w-full max-w-4xl mx-auto mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-center pt-2">
              Itens da Lista
            </CardTitle>
            <div className="flex flex-row flex-wrap items-center justify-end gap-2 pt-2">
              {selectedItemIds.size > 0 && (
                <Button 
                  onClick={handleExportSelectedToMyList} 
                  className="flex-1 sm:w-auto"
                  disabled={isLoadingAfs}
                >
                  <PlusCircle className="h-4 w-4" /> Exportar Selecionados ({selectedItemIds.size})
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleCopyList} 
                    disabled={items.length === 0} 
                    variant="secondary" 
                    size="icon"
                    className="sm:w-auto sm:px-4"
                  >
                    <Copy className="h-4 w-4" /> 
                    <span className="hidden sm:inline ml-2">Copiar Lista</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copiar Lista</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleExportCsv} 
                    disabled={items.length === 0} 
                    variant="outline" 
                    size="icon"
                    className="sm:w-auto sm:px-4"
                  >
                    <Download className="h-4 w-4" /> 
                    <span className="hidden sm:inline ml-2">Exportar CSV</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar CSV</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleExportPdf} disabled={items.length === 0} variant="default" className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" /> Exportar PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar PDF</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando itens da lista...</p>
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum item nesta lista.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] p-2">
                        <Checkbox
                          checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                          onCheckedChange={handleToggleSelectAll}
                          aria-label="Selecionar todos os itens"
                        />
                      </TableHead>
                      <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                      <TableHead colSpan={3} className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead> {/* ColSpan 3 */}
                      <TableHead className="w-[70px] p-2 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => renderItemRow(item, index))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <MadeWithDyad />

        {/* Sheet de Edição (mantido para o botão de lápis) */}
        <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Editar Item da Lista</SheetTitle>
              <SheetDescription>
                Edite os detalhes do item da lista.
              </SheetDescription>
            </SheetHeader>
            {itemToEdit && listId && (
              <CustomListEditor
                list={{ id: listId, title: listTitle, user_id: '' }}
                onClose={handleItemSavedOrClosed}
                editingItem={itemToEdit}
                onItemSaved={handleItemSavedOrClosed}
                allAvailableParts={allAvailableParts}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Sheet para Exportar Selecionados com AF */}
        <Sheet open={isExportSheetOpen} onOpenChange={setIsExportSheetOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Exportar Itens para Minha Lista</SheetTitle>
              <SheetDescription>
                Selecione um AF (Número de Frota) para aplicar a todos os {selectedItemIds.size} itens selecionados antes de exportar para "Minha Lista de Peças".
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="af-for-export">AF (Número de Frota)</Label>
                {isLoadingAfs ? (
                  <Input value="Carregando AFs..." readOnly className="bg-muted" />
                ) : (
                  <AfSearchInput
                    value={afForExport}
                    onChange={setAfForExport}
                    availableAfs={allAvailableAfs}
                    onSelectAf={setAfForExport}
                  />
                )}
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsExportSheetOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmExport} disabled={!afForExport.trim() || isLoadingAfs}>
                <Check className="h-4 w-4 mr-2" /> Confirmar Exportação
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </React.Fragment>
  );
};

export default CustomListPage;