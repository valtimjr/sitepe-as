"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addSimplePartItem, getParts, searchParts as searchPartsService, updatePart, getAfsFromService, Af, updateSimplePartItem } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, XCircle, Tag, Info } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { SimplePartItem } from '@/services/localDbService';
import RelatedPartDisplay from './RelatedPartDisplay';
import { ScrollArea } from './ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [editedTags, setEditedTags] = useState<string>('');
  const isMobile = useIsMobile();
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);

  useEffect(() => {
    const initializeForm = async () => {
      if (editingItem) {
        setQuantidade(editingItem.quantidade ?? 1);
        setAf(editingItem.af || '');
        
        if (editingItem.codigo_peca) {
          setIsLoadingParts(true);
          const results = await searchPartsService(editingItem.codigo_peca, company);
          const partFromEdit = results.find(p => p.codigo === editingItem.codigo_peca);
          setSelectedPart(partFromEdit || null);
          setEditedTags(partFromEdit?.tags || '');
          setSearchQuery(editingItem.codigo_peca || ''); 
          setIsLoadingParts(false);
        }
      } else {
        setSelectedPart(null);
        setQuantidade(1);
        setAf('');
        setEditedTags('');
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    initializeForm();
  }, [editingItem, company]);

  useEffect(() => {
    const loadInitialData = async () => {
      const afs = await getAfsFromService(company);
      setAllAvailableAfs(afs);
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
    setSearchResults([]);
  };

  const handleSelectAf = (selectedAfNumber: string) => {
    setAf(selectedAfNumber);
  };

  const handleUpdateTags = async () => {
    if (!selectedPart) return;
    try {
      await updatePart({ ...selectedPart, tags: editedTags }, company);
      showSuccess('Tags da peça atualizadas!');
      setSelectedPart(prev => prev ? { ...prev, tags: editedTags } : null);
    } catch (error) {
      showError('Erro ao atualizar as tags.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || quantidade <= 0) {
      showError('Selecione uma peça e a quantidade.');
      return;
    }

    try {
      const itemData = {
        codigo_peca: selectedPart.codigo,
        descricao: selectedPart.descricao,
        quantidade,
        af: af.trim() !== '' ? af : undefined,
      };

      if (editingItem) {
        await updateSimplePartItem({ ...editingItem, ...itemData });
        showSuccess('Item atualizado!');
        onCloseEdit?.();
      } else {
        await addSimplePartItem(itemData, company);
        showSuccess('Item adicionado!');
      }
      
      setSelectedPart(null);
      setQuantidade(1);
      setAf('');
      setSearchQuery('');
      onItemAdded();
    } catch (error) {
      showError('Erro ao salvar item.');
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');
  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags || !canEditTags;

  return (
    <Card className="w-full max-w-md mx-auto border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {editingItem ? 'Editar Item' : 'Adicionar Item à Lista'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="search-part" className="text-sm font-semibold">Buscar Peça (Código ou Nome)</Label>
            <PartSearchInput
              onSearch={handleSearch}
              searchResults={searchResults}
              onSelectPart={handleSelectPart}
              searchQuery={searchQuery}
              isLoading={isLoadingParts}
            />
          </div>

          {selectedPart && (
            <div className="bg-muted/30 p-3 rounded-lg border border-muted space-y-3 animate-in fade-in duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Informações da Peça</span>
                  <p className="text-sm font-medium">{selectedPart.name || 'Sem nome definido'}</p>
                  <p className="text-xs text-muted-foreground">{selectedPart.descricao}</p>
                  <p className="text-xs font-mono bg-background px-1.5 py-0.5 rounded border inline-block mt-1">
                    Cód: {selectedPart.codigo}
                  </p>
                </div>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              {selectedPart.itens_relacionados && selectedPart.itens_relacionados.length > 0 && (
                <div className="pt-2 border-t border-muted">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1 mb-2">
                    <Tag className="h-3 w-3" /> Itens Relacionados
                  </Label>
                  <ScrollArea className={cn("w-full rounded border bg-background/50", isMobile ? "h-28" : "max-h-40")}>
                    <div className="p-2 space-y-1">
                      {selectedPart.itens_relacionados.map(relatedItem => (
                        <RelatedPartDisplay key={relatedItem.codigo} item={relatedItem} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="tags" className="text-[10px] font-bold uppercase text-muted-foreground">Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tags"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                    placeholder="tag1; tag2..."
                    className="h-8 text-xs"
                    disabled={!canEditTags}
                  />
                  <Button
                    type="button"
                    onClick={handleUpdateTags}
                    disabled={isUpdateTagsDisabled}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantidade" className="text-sm">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                min="1"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af" className="text-sm">AF (Frota)</Label>
              <AfSearchInput
                value={af}
                onChange={setAf}
                onSelectAf={handleSelectAf}
                availableAfs={allAvailableAfs}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {editingItem && (
              <Button type="button" variant="outline" onClick={onCloseEdit} className="flex-1">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={!selectedPart}>
              <Save className="mr-2 h-4 w-4" /> {editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartItemForm;