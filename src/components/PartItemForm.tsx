import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addSimplePartItem, getParts, searchParts as searchPartsService, updatePart, getAfsFromService, Af, updateSimplePartItem } from '@/services/partListService'; // Adicionado updateSimplePartItem
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, XCircle } from 'lucide-react'; // Adicionado XCircle para o botão Cancelar
import { useSession } from '@/components/SessionContextProvider';
import { SimplePartItem } from '@/services/localDbService'; // Importar SimplePartItem

interface PartItemFormProps {
  onItemAdded: () => void; // Mantido para adição, mas também chamado após edição
  editingItem?: SimplePartItem | null; // Novo prop para o item a ser editado
  onCloseEdit?: () => void; // Novo prop para fechar o formulário de edição
}

const PartItemForm: React.FC<PartItemFormProps> = ({ onItemAdded, editingItem, onCloseEdit }) => {
  const { checkPageAccess } = useSession();
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [editedTags, setEditedTags] = useState<string>('');

  // Efeito para inicializar o formulário com os dados do item de edição
  useEffect(() => {
    if (editingItem) {
      // Preenche os campos com os dados do item de edição
      setQuantidade(editingItem.quantidade ?? 1);
      setAf(editingItem.af || '');
      // Para o PartSearchInput, precisamos de um objeto Part completo, então buscamos
      const partFromEdit = allAvailableParts.find(p => p.codigo === editingItem.codigo_peca);
      setSelectedPart(partFromEdit || null);
      setEditedTags(partFromEdit?.tags || '');
      // Define a query de busca para o código da peça para que o PartSearchInput exiba corretamente
      setSearchQuery(editingItem.codigo_peca || ''); 
    } else {
      // Reseta os campos para o modo de adição
      setSelectedPart(null);
      setQuantidade(1);
      setAf('');
      setEditedTags('');
      setSearchQuery('');
    }
  }, [editingItem, allAvailableParts]); // Depende de editingItem e allAvailableParts

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingParts(true);
      const parts = await getParts();
      setAllAvailableParts(parts);
      setIsLoadingParts(false);

      setIsLoadingAfs(true);
      const afs = await getAfsFromService();
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
    setSearchQuery(''); // Limpa a query para que o input mostre o código da peça selecionada
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
      await updatePart({ ...selectedPart, tags: editedTags });
      showSuccess('Tags da peça atualizadas com sucesso!');
      const updatedParts = await getParts();
      setAllAvailableParts(updatedParts);
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
      const itemData = {
        codigo_peca: selectedPart.codigo,
        descricao: selectedPart.descricao,
        quantidade,
        af: af.trim() !== '' ? af : undefined,
      };

      if (editingItem) {
        // Modo de edição: atualiza o item existente
        await updateSimplePartItem({
          ...editingItem,
          ...itemData,
        });
        showSuccess('Item atualizado com sucesso!');
        onCloseEdit?.(); // Fecha o formulário de edição
      } else {
        // Modo de adição: adiciona um novo item
        await addSimplePartItem(itemData);
        showSuccess('Item adicionado à lista de Peças!');
      }
      
      // Limpa os campos após a operação (se não for edição ou se for edição e o formulário não fechar)
      setSelectedPart(null);
      setQuantidade(1);
      setAf('');
      setEditedTags('');
      setSearchQuery('');
      setSearchResults([]);
      onItemAdded(); // Notifica o pai que a lista foi alterada
    } catch (error) {
      showError('Erro ao salvar item na lista.');
      console.error('Failed to save item to list:', error);
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');
  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags || !canEditTags;
  const isSubmitDisabled = isLoadingParts || isLoadingAfs || !selectedPart;

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
              className="bg-muted"
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
              className="bg-muted"
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
            <Label htmlFor="af">AF (Número de Frota) (Opcional)</Label>
            {isLoadingAfs ? (
              <Input value="Carregando AFs..." readOnly className="bg-muted" />
            ) : (
              <AfSearchInput
                value={af}
                onChange={setAf}
                availableAfs={allAvailableAfs}
                onSelectAf={handleSelectAf}
              />
            )}
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