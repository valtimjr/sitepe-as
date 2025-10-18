import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addItemToList, getParts, getUniqueAfs, searchParts as searchPartsService } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';

interface PartListItemFormProps {
  onItemAdded: () => void;
}

const PartListItemForm: React.FC<PartListItemFormProps> = ({ onItemAdded }) => {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [allAvailableAfs, setAllAvailableAfs] = useState<string[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingParts(true);
      const parts = await getParts();
      setAllAvailableParts(parts);
      setIsLoadingParts(false);

      setIsLoadingAfs(true);
      const afs = await getUniqueAfs();
      setAllAvailableAfs(afs);
      setIsLoadingAfs(false);
    };
    loadInitialData();
  }, []);

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSelectAf = (selectedAf: string) => {
    setAf(selectedAf);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || quantidade <= 0 || !af) {
      showError('Por favor, selecione uma peça, insira a quantidade e o AF.');
      return;
    }

    try {
      await addItemToList({
        codigo_peca: selectedPart.codigo,
        descricao: selectedPart.descricao,
        quantidade,
        af,
      });
      showSuccess('Item adicionado à lista!');
      setSelectedPart(null);
      setQuantidade(1);
      setAf('');
      onItemAdded();
      const updatedAfs = await getUniqueAfs();
      setAllAvailableAfs(updatedAfs);
    } catch (error) {
      showError('Erro ao adicionar item à lista.');
      console.error('Failed to add item to list:', error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Adicionar Item à Lista</CardTitle>
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
              allParts={allAvailableParts}
              isLoading={isLoadingParts}
            />
          </div>
          <div>
            <Label htmlFor="codigo_peca">Código da Peça</Label>
            <Input
              id="codigo_peca"
              type="text"
              value={selectedPart?.codigo || ''}
              placeholder="Código da peça selecionada"
              readOnly
              className="bg-gray-100 dark:bg-gray-700"
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              type="text"
              value={selectedPart?.descricao || ''}
              placeholder="Descrição da peça selecionada"
              readOnly
              className="bg-gray-100 dark:bg-gray-700"
            />
          </div>
          {selectedPart?.tags && (
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                type="text"
                value={selectedPart.tags}
                placeholder="Tags da peça"
                readOnly
                className="bg-gray-100 dark:bg-gray-700"
              />
            </div>
          )}
          <div>
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
          <div>
            <Label htmlFor="af">AF (Número de Frota)</Label>
            {isLoadingAfs ? (
              <Input value="Carregando AFs..." readOnly className="bg-gray-100 dark:bg-gray-700" />
            ) : (
              <AfSearchInput
                value={af}
                onChange={setAf}
                availableAfs={allAvailableAfs}
                onSelectAf={handleSelectAf}
              />
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoadingParts || isLoadingAfs}>Adicionar à Lista</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartListItemForm;