"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, XCircle, GripVertical, Tag, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part, RelatedPart, MangueiraItemData, MangueiraPartDetails } from '@/types/supabase';
import { addCustomListItem, updateCustomListItem, updatePart } from '@/services/customListService';
import { searchParts as searchPartsService } from '@/services/partListService';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RelatedPartDisplay from './RelatedPartDisplay';
import PartSearchInput from './PartSearchInput';
import { SheetFooter } from '@/components/ui/sheet'; // Adicionado SheetFooter

interface CustomListItemFormProps {
  list: CustomList;
  editingItem: CustomListItem | null;
  onItemSaved: () => void;
  onClose: () => void;
  allAvailableParts: Part[];
}

interface SubPartSearchState {
  query: string;
  results: Part[];
  isLoading: boolean;
}

const formatRelatedPartObject = (part: Part): MangueiraPartDetails => {
  const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
  const subText = (part.name && part.name.trim() !== '' && part.descricao !== mainText) ? part.descricao : '';
  return { codigo: part.codigo, name: mainText, description: subText }; // Corrigido: retorna MangueiraPartDetails
};

const CustomListItemForm: React.FC<CustomListItemFormProps> = ({ list, editingItem, onItemSaved, onClose, allAvailableParts }) => {
  const isMobile = useIsMobile();
  
  const [formType, setFormType] = useState<'item' | 'subtitle' | 'separator' | 'mangueira'>('item');
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formItensRelacionados, setFormItensRelacionados] = useState<RelatedPart[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [selectedPartFromSearch, setSelectedPartFromSearch] = useState<Part | null>(null);

  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSearchResults, setSearchResultsRelated] = useState<Part[]>([]);
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');
  const [draggedRelatedItem, setDraggedRelatedItem] = useState<RelatedPart | null>(null);

  // Mangueira States
  const [formMangueiraPart, setFormMangueiraPart] = useState<Part | null>(null);
  const [formConexao1Part, setFormConexao1Part] = useState<Part | null>(null);
  const [formConexao2Part, setFormConexao2Part] = useState<Part | null>(null);
  const [formCorteCm, setFormCorteCm] = useState<number>(0);
  
  const [mangueiraSearch, setMangueiraSearch] = useState<SubPartSearchState>({ query: '', results: [], isLoading: false });
  const [conexao1Search, setConexao1Search] = useState<SubPartSearchState>({ query: '', results: [], isLoading: false });
  const [conexao2Search, setConexao2Search] = useState<SubPartSearchState>({ query: '', results: [], isLoading: false });

  const resetMangueiraFields = () => {
    setFormMangueiraPart(null);
    setFormConexao1Part(null);
    setFormConexao2Part(null);
    setFormCorteCm(0);
    setMangueiraSearch(prev => ({ ...prev, query: '', results: [] }));
    setConexao1Search(prev => ({ ...prev, query: '', results: [] }));
    setConexao2Search(prev => ({ ...prev, query: '', results: [] }));
  };

  const resetForm = useCallback(() => {
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
    resetMangueiraFields();
  }, []);

  // Efeito para inicializar o formulário com base no `editingItem`
  useEffect(() => {
    resetForm();

    if (editingItem) {
      setFormType(editingItem.type || 'item');
      setFormItemName(editingItem.item_name);
      
      if (editingItem.type === 'mangueira' && editingItem.mangueira_data) {
        const data = editingItem.mangueira_data;
        
        const findPart = (code: string) => allAvailableParts.find(p => p.codigo === code) || null;

        setFormCorteCm(data.corte_cm);
        
        const mangueiraPart = findPart(data.mangueira.codigo);
        const conexao1Part = findPart(data.conexao1.codigo);
        const conexao2Part = findPart(data.conexao2.codigo);

        setFormMangueiraPart(mangueiraPart);
        setFormConexao1Part(conexao1Part);
        setFormConexao2Part(conexao2Part);

        setFormItemName(data.mangueira.name || data.mangueira.description || 'Mangueira');

        setMangueiraSearch(prev => ({ ...prev, query: data.mangueira.codigo }));
        setConexao1Search(prev => ({ ...prev, query: data.conexao1.codigo }));
        setConexao2Search(prev => ({ ...prev, query: data.conexao2.codigo }));

      } else if (editingItem.type === 'item') {
        setFormPartCode(editingItem.part_code || '');
        setFormDescription(editingItem.description || '');
        setFormQuantity(editingItem.quantity);
        setFormItensRelacionados(editingItem.itens_relacionados || []);
        
        if (editingItem.part_code) {
          const part = allAvailableParts.find(p => p.codigo.toLowerCase() === editingItem.part_code!.toLowerCase());
          setSelectedPartFromSearch(part || null);
        }
      }
    }
  }, [editingItem, allAvailableParts, resetForm]);

  // Efeito para a busca de peças (principal)
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
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

  // Efeito para a busca de peças relacionadas
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


  const handleSelectPart = (part: Part) => {
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
    const relatedPartObject: RelatedPart = {
      codigo: part.codigo,
      name: part.name || part.descricao,
      desc: part.descricao,
    };
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
        const relatedPartObject: RelatedPart = {
          codigo: foundPart.codigo,
          name: foundPart.name || foundPart.descricao,
          desc: foundPart.descricao,
        };
        if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo) && !newRelatedItems.some(p => p.codigo === relatedPartObject.codigo)) {
          newRelatedItems.push(relatedPartObject);
          foundCount++;
        }
      } else {
        const pureCodeObject: RelatedPart = { codigo: code, name: code, desc: '' };
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

  // Drag and Drop Handlers (Itens Relacionados)
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
        order_index: editingItem ? editingItem.order_index : list.items_data?.length ?? 0,
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
        order_index: editingItem ? editingItem.order_index : list.items_data?.length ?? 0,
        itens_relacionados: formType === 'item' ? formItensRelacionados : [],
        mangueira_data: undefined,
      };
    }

    try {
      if (editingItem) {
        await updateCustomListItem(list.id, { id: editingItem.id, ...payload } as CustomListItem);
        showSuccess('Item atualizado com sucesso!');
      } else {
        await addCustomListItem(list.id, payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      onItemSaved();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      showError('Erro ao salvar item.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="item-type">Tipo de Item</Label>
        <Select
          value={formType}
          onValueChange={(value: 'item' | 'subtitle' | 'separator' | 'mangueira') => {
            setFormType(value);
            if (value !== 'item') {
              setFormPartCode('');
              setFormDescription('');
              setFormQuantity(0);
              setFormItensRelacionados([]);
              setSelectedPartFromSearch(null);
            }
            if (value !== 'mangueira') {
              resetMangueiraFields();
            }
            if (value === 'separator') {
              setFormItemName('--- SEPARADOR ---');
            } else if (value === 'subtitle') {
              setFormItemName('');
            }
          }}
        >
          <SelectTrigger id="item-type">
            <SelectValue placeholder="Selecione o Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item">Item de Peça Simples</SelectItem>
            <SelectItem value="mangueira">Mangueira (Item Complexo)</SelectItem>
            <SelectItem value="subtitle">Subtítulo</SelectItem>
            <SelectItem value="separator">Separador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formType !== 'separator' && (
        <div className="space-y-2">
          <Label htmlFor="item-name">
            {formType === 'subtitle' ? 'Texto do Subtítulo' : 'Nome Personalizado'}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="item-name"
              value={formItemName}
              onChange={(e) => setFormItemName(e.target.value)}
              placeholder={formType === 'subtitle' ? 'Ex: Peças do Motor' : 'Ex: Kit de Reparo do Motor'}
              className="flex-1"
              required={formType === 'item' || formType === 'subtitle' || formType === 'mangueira'}
              readOnly={formType === 'mangueira'} // Nome é definido pela Mangueira principal
            />
            {formPartCode && formType === 'item' && ( 
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveGlobalPartName}
                    disabled={
                      !selectedPartFromSearch || 
                      formItemName.trim().toLowerCase() === (selectedPartFromSearch.name || selectedPartFromSearch.descricao || '').trim().toLowerCase() ||
                      !formItemName.trim()
                    }
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Salvar este nome como o nome global da peça "{selectedPartFromSearch?.codigo || 'N/A'}"
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Campos Específicos para Mangueira */}
      {formType === 'mangueira' && (
        <Card className="p-4 space-y-4 bg-muted/20">
          <CardTitle className="text-base font-semibold">Configuração da Mangueira</CardTitle>
          
          {/* Corte (cm) */}
          <div className="space-y-2">
            <Label htmlFor="corte-cm">Corte (cm)</Label>
            <Input
              id="corte-cm"
              type="number"
              value={formCorteCm}
              onChange={(e) => setFormCorteCm(parseInt(e.target.value) || 0)}
              min="1"
              required
              placeholder="Comprimento em centímetros"
            />
          </div>

          {/* Mangueira (Peça Principal) */}
          <div className="space-y-2">
            <Label htmlFor="mangueira-part">1. Peça Mangueira</Label>
            <PartSearchInput
              onSearch={(query) => handleSubPartSearch(query, setMangueiraSearch)}
              searchResults={mangueiraSearch.results}
              onSelectPart={handleSelectMangueiraPart}
              searchQuery={mangueiraSearch.query}
              isLoading={mangueiraSearch.isLoading}
            />
            {formMangueiraPart && (
              <p className="text-sm text-muted-foreground">Selecionado: {formMangueiraPart.codigo} - {formMangueiraPart.name || formMangueiraPart.descricao}</p>
            )}
          </div>

          {/* Conexão 1 */}
          <div className="space-y-2">
            <Label htmlFor="conexao1-part">2. Conexão 1</Label>
            <PartSearchInput
              onSearch={(query) => handleSubPartSearch(query, setConexao1Search)}
              searchResults={conexao1Search.results}
              onSelectPart={handleSelectConexao1Part}
              searchQuery={conexao1Search.query}
              isLoading={conexao1Search.isLoading}
            />
            {formConexao1Part && (
              <p className="text-sm text-muted-foreground">Selecionado: {formConexao1Part.codigo} - {formConexao1Part.name || formConexao1Part.descricao}</p>
            )}
          </div>

          {/* Conexão 2 */}
          <div className="space-y-2">
            <Label htmlFor="conexao2-part">3. Conexão 2</Label>
            <PartSearchInput
              onSearch={(query) => handleSubPartSearch(query, setConexao2Search)}
              searchResults={conexao2Search.results}
              onSelectPart={handleSelectConexao2Part}
              searchQuery={conexao2Search.query}
              isLoading={conexao2Search.isLoading}
            />
            {formConexao2Part && (
              <p className="text-sm text-muted-foreground">Selecionado: {formConexao2Part.codigo} - {formConexao2Part.name || formConexao2Part.descricao}</p>
            )}
          </div>
        </Card>
      )}
      {/* Fim Campos Específicos para Mangueira */}


      {formType === 'item' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="search-part">Buscar Peça (Opcional)</Label>
            <PartSearchInput
              onSearch={setSearchQuery}
              searchResults={searchResults}
              onSelectPart={handleSelectPart}
              searchQuery={searchQuery}
              isLoading={isLoadingParts}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="part-code">Cód. Peça (Opcional)</Label>
              <Input
                id="part-code"
                value={formPartCode}
                onChange={(e) => setFormPartCode(e.target.value)}
                placeholder="Código da peça"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                value={formQuantity}
                onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                min="1"
                required
                className="w-full"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Input
              id="description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descrição da peça"
              className="w-full"
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" /> Itens Relacionados (Códigos de Peça)
            </Label>
            <PartSearchInput
              onSearch={setRelatedSearchQuery}
              searchResults={relatedSearchResults}
              onSelectPart={handleAddRelatedPart}
              searchQuery={relatedSearchQuery}
              isLoading={isLoadingParts}
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
            <ScrollArea className={cn("w-full rounded-md border p-2", isMobile ? "h-24" : "max-h-96")}>
              {formItensRelacionados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item relacionado adicionado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formItensRelacionados.map((item, index) => (
                    <div 
                      key={item.codigo} 
                      className={cn(
                        "flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full border border-transparent cursor-grab",
                        draggedRelatedItem?.codigo === item.codigo && 'opacity-50',
                        draggedRelatedItem && 'hover:border-primary'
                      )}
                      draggable
                      onDragStart={(e) => handleRelatedDragStart(e, item)}
                      onDragOver={handleRelatedDragOver}
                      onDrop={(e) => handleRelatedDrop(e, item)}
                      onDragLeave={handleRelatedDragLeave}
                      onDragEnd={handleRelatedDragEnd}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <GripVertical className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          <RelatedPartDisplay item={item} />
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 text-destructive shrink-0"
                        onClick={() => handleRemoveRelatedPart(item.codigo)}
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
        </>
      )}

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          <XCircle className="h-4 w-4 mr-2" /> Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" /> {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
        </Button>
      </SheetFooter>
    </form>
  );
};

export default CustomListItemForm;