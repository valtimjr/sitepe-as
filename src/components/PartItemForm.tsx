"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addSimplePartItem, getParts, searchParts as searchPartsService, updatePart, getAfsFromService, Af, updateSimplePartItem } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, XCircle, Loader2, Tag } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { SimplePartItem } from '@/services/localDbService';
import RelatedPartDisplay from './RelatedPartDisplay';
import { ScrollArea } from './ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { RelatedPart } from '@/types/supabase';
import { useCompany } from '@/context/CompanyContext';

interface PartItemFormProps {
  onItemAdded: () => void;
  editingItem?: SimplePartItem | null;
  onCloseEdit?: () => void;
}

const PartItemForm: React.FC<PartItemFormProps> = ({ onItemAdded, editingItem, onCloseEdit }) => {
  const { checkPageAccess } = useSession();
  const { company } = useCompany();
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [editedTags, setEditedTags] = useState<string>('');
  const isMobile = useIsMobile();
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);

  // Estados para permitir edição manual
  const [customCodigo, setCustomCodigo] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDescricao, setCustomDescricao] = useState('');

  useEffect(() => {
    const initializeForm = async () => {
      if (editingItem) {
        setQuantidade(editingItem.quantidade ?? 1);
        setAf(editingItem.af || '');
        setCustomCodigo(editingItem.codigo_peca || '');
        setCustomDescricao(editingItem.descricao || '');
        
        if (editingItem.codigo_peca) {
          setIsLoadingParts(true);
          const results = await searchPartsService(editingItem.codigo_peca, company);
          const partFromEdit = results.find(p => p.codigo === editingItem.codigo_peca);
          setSelectedPart(partFromEdit || null);
          setEditedTags(partFromEdit?.tags || '');
          setCustomName(partFromEdit?.name || '');
          setSearchQuery(editingItem.codigo_peca || ''); 
          setIsLoadingParts(false);
        } else {
          setSelectedPart(null);
          setEditedTags('');
          setCustomName('');
          setSearchQuery('');
        }
      } else {
        setSelectedPart(null);
        setQuantidade(1);
        setAf('');
        setEditedTags('');
        setSearchQuery('');
        setSearchResults([]);
        setCustomCodigo('');
        setCustomName('');
        setCustomDescricao('');
      }
    };

    initializeForm();
  }, [editingItem, company]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingParts(true);
      const parts = await getParts(company);
      setAllAvailableParts(parts);
      setIsLoadingParts(false);

      setIsLoadingAfs(true);
      const afs = await getAfsFromService(company);
      setAllAvailableAfs(afs);
      setIsLoadingAfs(false);
    };
    loadInitialData();
  }, [company]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        const results = await searchPartsService(searchQuery, company);
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
  }, [searchQuery, company]);

  useEffect(() => {
    setEditedTags(selectedPart?.tags || '');
  }, [selectedPart]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery(part.codigo);
    setCustomCodigo(part.codigo);
    setCustomName(part.name || '');
    setCustomDescricao(part.descricao);
    setSearchResults([]);
  };

  const handleSelectAf = (selectedAfNumber: string) => {
    setAf(selectedAfNumber);
  };

  const handleUpdateTags = async () => {
    if (!selectedPart) {
      showError('Nenhuma peça selecionada para atualizar as tags.');
      return;
    }
    if (selectedPart.tags === editedTags) {
      showError('As tags não foram alteradas.');
      return;
    }

    try {
      await updatePart({ ...selectedPart, tags: editedTags }, company);
      showSuccess('Tags da peça atualizadas com sucesso!');
      setSelectedPart(prev => prev ? { ...prev, tags: editedTags } : null);
    } catch (error) {
      showError('Erro ao atualizar as tags da peça.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!customCodigo && !customDescricao) || quantidade <= 0) {
      showError('Por favor, insira o código ou descrição da peça e a quantidade.');
      return;
    }

    try {
      const itemData = {
        codigo_peca: customCodigo,
        descricao: customDescricao,
        quantidade,
        af: af.trim() !== '' ? af : undefined,
      };

      if (editingItem) {
        await updateSimplePartItem({
          ...editingItem,
          ...itemData,
        });
        showSuccess('Item atualizado com sucesso!');
        onCloseEdit?.();
      } else {
        await addSimplePartItem(itemData, company);
        showSuccess('Item adicionado à lista de Peças!');
      }
      
      setSelectedPart(null);
      setQuantidade(1);
      setAf('');
      setEditedTags('');
      setSearchQuery('');
      setSearchResults([]);
      setCustomCodigo('');
      setCustomName('');
      setCustomDescricao('');
      onItemAdded();
    } catch (error) {
      showError('Erro ao salvar item na lista.');
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');
  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags || !canEditTags;
  const isSubmitDisabled = isLoadingParts || (!customCodigo && !customDescricao);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{editingItem ? 'Editar Item' : 'Adicionar Item à Lista de Peças'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search-part">Buscar Peça</Label>
            <PartSearchInput
              onSearch={handleSearch}
              searchResults={searchResults}
              onSelectPart={handleSelectPart}
              searchQuery={searchQuery}
              isLoading={isLoadingParts}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="codigo_peca">Cód. Peça</Label>
              <Input
                id="codigo_peca"
                type="text"
                value={customCodigo}
                onChange={(e) => setCustomCodigo(e.target.value)}
                placeholder="Cód. Peça"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome da Peça</Label>
              <Input
                id="name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nome da peça"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                type="text"
                value={customDescricao}
                onChange={(e) => setCustomDescricao(e.target.value)}
                placeholder="Descrição da peça"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                min="1"
                required
              />
            </div>
          </div>
          {selectedPart && (
            <div>
              <Label htmlFor="tags">Tags (separadas por ';')</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="tags"
                  type="text"
                  value={editedTags}
                  onChange={(e) => setEditedTags(e.target.value)}
                  placeholder="Adicione tags separadas por ';'"
                  disabled={!canEditTags}
                />
                <Button
                  type="button"
                  onClick={handleUpdateTags}
                  disabled={isUpdateTagsDisabled}
                  variant="outline"
                  size="icon"
                  aria-label="Atualizar Tags"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {selectedPart && selectedPart.itens_relacionados && selectedPart.itens_relacionados.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Itens Relacionados da Peça
              </Label>
              <ScrollArea className={cn("w-full rounded-md border p-2", isMobile ? "h-24" : "max-h-96")}>
                <div className="flex flex-col gap-2">
                  {selectedPart.itens_relacionados.map(relatedItem => {
                      return <RelatedPartDisplay key={relatedItem.codigo} item={relatedItem} />;
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          <div>
            <Label htmlFor="af">AF (Número de Frota) (Opcional)</Label>
            <AfSearchInput
              value={af}
              onChange={setAf}
              onSelectAf={handleSelectAf}
              availableAfs={allAvailableAfs}
            />
          </div>
          <div className="flex gap-2">
            {editingItem && (
              <Button type="button" variant="outline" onClick={onCloseEdit} className="w-full">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              <Save className="mr-2 h-4 w-4" /> {editingItem ? 'Salvar Alterações' : 'Adicionar à Lista'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartItemForm;