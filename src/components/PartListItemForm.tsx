import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addSimplePartItem, updatePart, Af, getAfsFromService } from '@/services';
import PartCodeInput from './PartCodeInput'; // Import the new component
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { useQuery } from '@tanstack/react-query'; // Importar useQuery

interface PartListItemFormProps {
  onItemAdded: () => void;
}

const PartListItemForm: React.FC<PartListItemFormProps> = ({ onItemAdded }) => {
  const { checkPageAccess } = useSession();
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  
  const [editedTags, setEditedTags] = useState<string>('');
  const [partCodeInput, setPartCodeInput] = useState(''); // Novo estado para o input de código da peça

  // Use useQuery for AFs, as PartCodeInput now handles parts internally
  const { data: allAvailableAfs = [], isLoading: isLoadingAfs } = useQuery<Af[]>({
    queryKey: ['afs'],
    queryFn: getAfsFromService,
    initialData: [], // Começa com um array vazio para carregamento instantâneo
    staleTime: 5 * 60 * 1000, // Dados considerados "frescos" por 5 minutos
    placeholderData: (previousData) => previousData || [], // Mantém dados anteriores enquanto busca novos
  });

  useEffect(() => {
    setEditedTags(selectedPart?.tags || '');
  }, [selectedPart]);

  const handlePartCodeInputChange = (value: string) => {
    setPartCodeInput(value);
    // onSelectPart será chamado pelo PartCodeInput quando uma peça for encontrada
  };

  const handleSelectPart = (part: Part | null) => {
    setSelectedPart(part);
    if (part) {
      setPartCodeInput(part.codigo); // Garante que o input reflita o código da peça selecionada
    }
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
      // Invalida a query para recarregar os dados e atualizar a peça selecionada
      // queryClient.invalidateQueries(['parts']); // Não é necessário aqui, useQuery já faz isso
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
      await addSimplePartItem({
        codigo_peca: selectedPart.codigo,
        descricao: selectedPart.descricao,
        quantidade,
        af: af.trim() !== '' ? af : undefined,
      });
      showSuccess('Item adicionado à lista de Peças!');
      
      setSelectedPart(null);
      setQuantidade(1);
      setAf('');
      setEditedTags('');
      setPartCodeInput(''); // Limpa o input de código da peça
      onItemAdded();
    } catch (error) {
      showError('Erro ao adicionar item à lista.');
      console.error('Failed to add item to list:', error);
    }
  };

  const canEditTags = checkPageAccess('/manage-tags');
  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags || !canEditTags;
  const isSubmitDisabled = isLoadingAfs || !selectedPart;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Adicionar Item à Lista de Peças</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="part-code-input">Código da Peça</Label>
            <PartCodeInput
              value={partCodeInput}
              onChange={handlePartCodeInputChange}
              onSelectPart={handleSelectPart}
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
          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>Adicionar à Lista</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartListItemForm;