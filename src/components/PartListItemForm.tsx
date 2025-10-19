import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addSimplePartItem, getParts, searchParts as searchPartsService, updatePart, getUniqueAfs } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput'; // Importar AfSearchInput
import { showSuccess, showError } from '@/utils/toast';
import { Save } from 'lucide-react';

interface PartListItemFormProps {
  onItemAdded: () => void;
}

const PartListItemForm: React.FC<PartListItemFormProps> = ({ onItemAdded }) => {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState(''); // Estado para o AF
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [allAvailableAfs, setAllAvailableAfs] = useState<string[]>([]); // Estado para AFs disponíveis
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true); // Estado para carregamento de AFs
  const [editedTags, setEditedTags] = useState<string>('');

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingParts(true);
      const parts = await getParts();
      setAllAvailableParts(parts);
      setIsLoadingParts(false);

      setIsLoadingAfs(true); // Carregar AFs
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

  useEffect(() => {
    setEditedTags(selectedPart?.tags || '');
  }, [selectedPart]);

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
      await updatePart({ ...selectedPart, tags: editedTags });
      showSuccess('Tags da peça atualizadas com sucesso!');
      // Atualiza a lista de peças disponíveis para refletir a mudança
      const updatedParts = await getParts();
      setAllAvailableParts(updatedParts);
      // Atualiza a peça selecionada para refletir as novas tags
      setSelectedPart(prev => prev ? { ...prev, tags: editedTags } : null);
    } catch (error) {
      showError('Erro ao atualizar as tags da peça.');
      console.error('Failed to update part tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || quantidade <= 0) {
      showError('Por favor, selecione uma peça e insira a quantidade.');
      return;
    }

    try {
      // Sempre adiciona à simplePartsList, incluindo o AF se preenchido
      await addSimplePartItem({
        codigo_peca: selectedPart.codigo,
        descricao: selectedPart.descricao,
        quantidade,
        af: af.trim() !== '' ? af : undefined, // Adiciona AF se não estiver vazio
      });
      showSuccess('Item adicionado à lista de Peças!');
      
      setSelectedPart(null);
      setQuantidade(1);
      setAf(''); // Limpar o campo AF após adicionar
      setEditedTags('');
      onItemAdded(); // Notifica o pai para recarregar as listas
    } catch (error) {
      showError('Erro ao adicionar item à lista.');
      console.error('Failed to add item to list:', error);
    }
  };

  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags;
  const isSubmitDisabled = isLoadingParts || isLoadingAfs || !selectedPart; // Desabilitar apenas se não houver peça selecionada

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Adicionar Item à Lista de Peças</CardTitle>
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
          {/* AF movido para o final */}
          <div>
            <Label htmlFor="af">AF (Número de Frota) (Opcional)</Label>
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
          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>Adicionar à Lista</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartListItemForm;