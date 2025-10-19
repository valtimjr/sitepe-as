import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addItemToList, getParts, getUniqueAfs, searchParts as searchPartsService, updatePart, deleteListItem, ListItem } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, Plus, FilePlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils'; // Importar a função cn para combinar classes Tailwind

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
}

interface ServiceOrderFormProps {
  onItemAdded: () => void;
  editingServiceOrder: ServiceOrderDetails | null;
  onNewServiceOrder: () => void;
  listItems: ListItem[]; // Nova prop para acessar a lista completa de itens
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ onItemAdded, editingServiceOrder, onNewServiceOrder, listItems }) => {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  const [os, setOs] = useState<number | undefined>(undefined);
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFinal, setHoraFinal] = useState<string>('');
  const [servicoExecutado, setServicoExecutado] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [allAvailableAfs, setAllAvailableAfs] = useState<string[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [editedTags, setEditedTags] = useState<string>('');
  const [isOsInvalid, setIsOsInvalid] = useState(false);
  const [currentBlankOsItemId, setCurrentBlankOsItemId] = useState<string | null>(null); // Estado para armazenar o ID do item "em branco" da OS atual

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
    if (editingServiceOrder) {
      setAf(editingServiceOrder.af);
      setOs(editingServiceOrder.os);
      setHoraInicio(editingServiceOrder.hora_inicio || '');
      setHoraFinal(editingServiceOrder.hora_final || '');
      setServicoExecutado(editingServiceOrder.servico_executado || '');
      resetPartFields();
      setIsOsInvalid(false); // Reseta a validação ao carregar uma OS para edição

      // Busca por um item "em branco" que corresponda à OS que está sendo editada
      const blankItem = listItems.find(item =>
        item.af === editingServiceOrder.af &&
        (item.os === editingServiceOrder.os || (item.os === undefined && editingServiceOrder.os === undefined)) &&
        (item.hora_inicio === editingServiceOrder.hora_inicio || (item.hora_inicio === undefined && editingServiceOrder.hora_inicio === undefined)) &&
        (item.hora_final === editingServiceOrder.hora_final || (item.hora_final === undefined && editingServiceOrder.hora_final === undefined)) &&
        (item.servico_executado === editingServiceOrder.servico_executado || (item.servico_executado === undefined && editingServiceOrder.servico_executado === undefined)) &&
        !item.codigo_peca && !item.descricao && (item.quantidade === undefined || item.quantidade === 0) // Verifica se é realmente um item "em branco"
      );

      if (blankItem) {
        setCurrentBlankOsItemId(blankItem.id);
      } else {
        setCurrentBlankOsItemId(null);
      }

    } else {
      resetAllFieldsInternal();
      setCurrentBlankOsItemId(null); // Limpa o ID do item em branco ao iniciar uma nova OS
    }
  }, [editingServiceOrder, listItems]); // Adiciona listItems como dependência

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
      const updatedParts = await getParts();
      setAllAvailableParts(updatedParts);
      setSelectedPart(prev => prev ? { ...prev, tags: editedTags } : null);
    } catch (error) {
      showError('Erro ao atualizar as tags da peça.');
      console.error('Failed to update part tags:', error);
    }
  };

  const resetAllFieldsInternal = () => {
    setSelectedPart(null);
    setQuantidade(1);
    setAf('');
    setOs(undefined);
    setHoraInicio('');
    setHoraFinal('');
    setServicoExecutado('');
    setSearchQuery('');
    setSearchResults([]);
    setEditedTags('');
    setIsOsInvalid(false); // Reseta a validação
  };

  const resetPartFields = () => {
    setSelectedPart(null);
    setQuantidade(1);
    setSearchQuery('');
    setSearchResults([]);
    setEditedTags('');
    showSuccess('Campos de peça limpos para adicionar nova peça à ordem atual!');
  };

  const handleOsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedValue = value === '' ? undefined : parseInt(value);

    if (parsedValue !== undefined && (parsedValue < 0 || parsedValue > 99999)) {
      setIsOsInvalid(true);
    } else {
      setIsOsInvalid(false);
    }
    setOs(parsedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOsInvalid) {
      showError('Por favor, corrija o valor da OS antes de continuar.');
      return;
    }

    if (!af) {
      showError('Por favor, insira o AF (Número de Frota).');
      return;
    }

    // Se uma peça foi selecionada, estamos adicionando uma peça à OS
    if (selectedPart) {
      if (quantidade <= 0) {
        showError('A quantidade da peça deve ser maior que zero.');
        return;
      }

      try {
        // Se existe um item "em branco" para esta OS, exclua-o antes de adicionar a peça
        if (currentBlankOsItemId) {
          await deleteListItem(currentBlankOsItemId);
          setCurrentBlankOsItemId(null); // Limpa o ID do item em branco
        }

        await addItemToList({
          codigo_peca: selectedPart.codigo,
          descricao: selectedPart.descricao,
          quantidade: quantidade,
          af,
          os: os,
          hora_inicio: horaInicio || undefined,
          hora_final: horaFinal || undefined,
          servico_executado: servicoExecutado,
        });
        showSuccess('Item adicionado à lista!');
        resetPartFields();
        onItemAdded(); // Isso irá disparar o carregamento e a seleção da nova OS
        const updatedAfs = await getUniqueAfs();
        setAllAvailableAfs(updatedAfs);
      } catch (error) {
        showError('Erro ao adicionar item à lista.');
        console.error('Failed to add item to list:', error);
      }
    } else { // Se nenhuma peça foi selecionada, estamos criando uma entrada de OS "em branco"
      try {
        // Impede a criação de uma OS em branco se já estiver editando uma OS
        if (editingServiceOrder) {
          showError('Por favor, selecione uma peça para adicionar à ordem de serviço atual, ou inicie uma nova ordem.');
          return;
        }

        // Adiciona um novo item "em branco"
        const newBlankId = await addItemToList({
          af,
          os: os,
          hora_inicio: horaInicio || undefined,
          hora_final: horaFinal || undefined,
          servico_executado: servicoExecutado,
          codigo_peca: undefined, // Explicitamente undefined para item em branco
          descricao: undefined,
          quantidade: undefined,
        });
        showSuccess('Ordem de Serviço criada sem peças. Adicione peças agora!');
        setCurrentBlankOsItemId(newBlankId); // Armazena o ID deste novo item em branco
        onItemAdded(); // Isso irá disparar loadListItems e definir editingServiceOrder para esta nova OS em branco
        const updatedAfs = await getUniqueAfs();
        setAllAvailableAfs(updatedAfs);
      } catch (error) {
        showError('Erro ao criar ordem de serviço.');
        console.error('Failed to create blank service order:', error);
      }
    }
  };

  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags;
  // Desabilita o botão de submit se:
  // - estiver carregando peças ou AFs
  // - não houver AF preenchido
  // - a OS for inválida
  // - estiver editando uma OS e nenhuma peça estiver selecionada (não pode submeter sem peça se já está editando)
  const isSubmitDisabled = isLoadingParts || isLoadingAfs || !af || isOsInvalid || (editingServiceOrder && !selectedPart);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {editingServiceOrder ? (
            <>
              Adicionar Peça à OS: <span className="text-blue-600 dark:text-blue-400">{editingServiceOrder.af}</span>
              {editingServiceOrder.os && <span className="text-blue-600 dark:text-blue-400"> (OS: {editingServiceOrder.os})</span>}
            </>
          ) : (
            "Criar Nova Ordem de Serviço"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campos da Ordem de Serviço */}
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
                readOnly={!!editingServiceOrder}
              />
            )}
          </div>
          <div>
            <Label htmlFor="os" className={cn(isOsInvalid && 'text-red-500 dark:text-red-400')}>OS (Opcional)</Label>
            <Input
              id="os"
              type="number"
              value={os === undefined ? '' : os}
              onChange={handleOsChange} // Usar o novo handler
              placeholder="Número da Ordem de Serviço"
              min="0"
              max="99999"
              readOnly={!!editingServiceOrder}
              className={cn(isOsInvalid && 'border-red-500 dark:border-red-400 focus-visible:ring-red-500')}
            />
            {isOsInvalid && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                Valor inválido. A OS só pode ser de 0 a 99999.
              </p>
            )}
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="hora_inicio">Hora de Início (Opcional)</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                readOnly={!!editingServiceOrder}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="hora_final">Hora Final (Opcional)</Label>
              <Input
                id="hora_final"
                type="time"
                value={horaFinal}
                onChange={(e) => setHoraFinal(e.target.value)}
                readOnly={!!editingServiceOrder}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="servico_executado">Serviço Executado (Opcional)</Label>
            <Textarea
              id="servico_executado"
              value={servicoExecutado}
              onChange={(e) => setServicoExecutado(e.target.value)}
              placeholder="Descreva o serviço executado"
              rows={3}
              readOnly={!!editingServiceOrder}
            />
          </div>

          <Separator className="my-6" />

          <h3 className="text-lg font-semibold">Detalhes da Peça (Opcional)</h3>
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
              required={!!selectedPart}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
            {editingServiceOrder ? "Adicionar Peça à Ordem" : "Criar Ordem e Adicionar Peça"}
          </Button>
        </form>
        <div className="flex flex-col space-y-2 mt-4">
          <Button variant="outline" onClick={onNewServiceOrder} className="w-full flex items-center gap-2">
            <FilePlus className="h-4 w-4" /> Iniciar Nova Ordem de Serviço
          </Button>
          {/* O botão "Adicionar Outra Peça (à ordem atual)" foi removido daqui */}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceOrderForm;