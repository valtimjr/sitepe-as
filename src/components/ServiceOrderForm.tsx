import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addServiceOrderItem, getParts, getAfsFromService, searchParts as searchPartsService, updatePart, deleteServiceOrderItem, ServiceOrderItem, updateServiceOrderItem, Af } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, Plus, FilePlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/SessionContextProvider'; // Importar useSession

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt?: Date;
  mode: 'add_part' | 'edit_details';
}

interface ServiceOrderFormProps {
  onItemAdded: () => void;
  editingServiceOrder: ServiceOrderDetails | null;
  onNewServiceOrder: () => void;
  listItems: ServiceOrderItem[];
  setIsCreatingNewOrder: (isCreating: boolean) => void;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ onItemAdded, editingServiceOrder, onNewServiceOrder, listItems, setIsCreatingNewOrder }) => {
  const { checkPageAccess } = useSession(); // Obter checkPageAccess
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
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]); // Alterado para Af[]
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [editedTags, setEditedTags] = useState<string>('');
  const [isOsInvalid, setIsOsInvalid] = useState(false);
  const [currentBlankOsItemId, setCurrentBlankOsItemId] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingParts(true);
      const parts = await getParts();
      setAllAvailableParts(parts);
      setIsLoadingParts(false);

      setIsLoadingAfs(true);
      const afs = await getAfsFromService(); // Usar getAfsFromService para obter objetos Af
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
      setIsOsInvalid(false);

      const blankItem = listItems.find(item =>
        item.af === editingServiceOrder.af &&
        (item.os === editingServiceOrder.os || (item.os === undefined && editingServiceOrder.os === undefined)) &&
        (item.hora_inicio === editingServiceOrder.hora_inicio || (item.hora_inicio === undefined && editingServiceOrder.hora_inicio === undefined)) &&
        (item.hora_final === editingServiceOrder.hora_final || (item.hora_final === undefined && editingServiceOrder.hora_final === undefined)) &&
        (item.servico_executado === editingServiceOrder.servico_executado || (item.servico_executado === undefined && editingServiceOrder.servico_executado === undefined)) &&
        !item.codigo_peca && !item.descricao && (item.quantidade === undefined || item.quantidade === 0)
      );

      if (blankItem) {
        setCurrentBlankOsItemId(blankItem.id);
      } else {
        setCurrentBlankOsItemId(null);
      }

    } else {
      resetAllFieldsInternal();
      setCurrentBlankOsItemId(null);
    }
  }, [editingServiceOrder, listItems]);

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
    setIsOsInvalid(false);
  };

  const resetPartFields = () => {
    setSelectedPart(null);
    setQuantidade(1);
    setSearchQuery('');
    setSearchResults([]);
    setEditedTags('');
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

    if (editingServiceOrder?.mode === 'edit_details') {
      const originalAf = editingServiceOrder.af;
      const originalOs = editingServiceOrder.os;
      const originalHoraInicio = editingServiceOrder.hora_inicio;
      const originalHoraFinal = editingServiceOrder.hora_final;
      const originalServicoExecutado = editingServiceOrder.servico_executado;
      const originalCreatedAt = editingServiceOrder.createdAt;

      const itemsToUpdate = listItems.filter(item =>
        item.af === originalAf &&
        (item.os === originalOs || (item.os === undefined && originalOs === undefined)) &&
        (item.hora_inicio === originalHoraInicio || (item.hora_inicio === undefined && originalHoraInicio === undefined)) &&
        (item.hora_final === originalHoraFinal || (item.hora_final === undefined && originalHoraFinal === undefined)) &&
        (item.servico_executado === originalServicoExecutado || (item.servico_executado === undefined && originalServicoExecutado === undefined))
      );

      if (itemsToUpdate.length > 0) {
        try {
          for (const item of itemsToUpdate) {
            await updateServiceOrderItem({
              ...item,
              af,
              os,
              hora_inicio: horaInicio || undefined,
              hora_final: horaFinal || undefined,
              servico_executado: servicoExecutado,
            });
          }
          showSuccess('Detalhes da Ordem de Serviço atualizados!');
        } catch (error) {
          showError('Erro ao atualizar os detalhes da Ordem de Serviço.');
          console.error('Failed to update service order details:', error);
        }
      } else {
        try {
          await addServiceOrderItem({
            af,
            os,
            hora_inicio: horaInicio || undefined,
            hora_final: horaFinal || undefined,
            servico_executado: servicoExecutado,
            codigo_peca: undefined,
            descricao: undefined,
            quantidade: undefined,
          }, originalCreatedAt);
          showSuccess('Ordem de Serviço recriada com novos detalhes!');
        } catch (error) {
          showError('Erro ao recriar a Ordem de Serviço.');
          console.error('Failed to recreate blank service order:', error);
        }
      }
      onItemAdded();
      onNewServiceOrder();
      setIsCreatingNewOrder(false);
      return;
    }

    if (selectedPart) {
      if (quantidade <= 0) {
        showError('A quantidade da peça deve ser maior que zero.');
        return;
      }

      try {
        if (currentBlankOsItemId) {
          await deleteServiceOrderItem(currentBlankOsItemId);
          setCurrentBlankOsItemId(null);
        }

        await addServiceOrderItem({
          codigo_peca: selectedPart.codigo,
          descricao: selectedPart.descricao,
          quantidade: quantidade,
          af,
          os: os,
          hora_inicio: horaInicio || undefined,
          hora_final: horaFinal || undefined,
          servico_executado: servicoExecutado,
        }, editingServiceOrder?.createdAt);

        showSuccess('Item adicionado à lista!');
        resetPartFields();
        onItemAdded();
        const updatedAfs = await getAfsFromService(); // Atualiza a lista de AFs
        setAllAvailableAfs(updatedAfs);
        setIsCreatingNewOrder(false);
      } catch (error) {
        showError('Erro ao adicionar item à lista.');
        console.error('Failed to add item to service order list:', error);
      }
    } else {
      try {
        if (editingServiceOrder) {
          showError('Por favor, selecione uma peça para adicionar à ordem de serviço atual, ou inicie uma nova ordem.');
          return;
        }

        const newBlankId = await addServiceOrderItem({
          af,
          os: os,
          hora_inicio: horaInicio || undefined,
          hora_final: horaFinal || undefined,
          servico_executado: servicoExecutado,
          codigo_peca: undefined,
          descricao: undefined,
          quantidade: undefined,
        });
        showSuccess('Ordem de Serviço criada sem peças. Adicione peças agora!');
        setCurrentBlankOsItemId(newBlankId);
        onItemAdded();
        const updatedAfs = await getAfsFromService(); // Atualiza a lista de AFs
        setAllAvailableAfs(updatedAfs);
        setIsCreatingNewOrder(false);
      } catch (error) {
        showError('Erro ao criar ordem de serviço.');
        console.error('Failed to create blank service order:', error);
      }
    }
  };

  // Lógica para desabilitar a edição de tags
  const canEditTags = checkPageAccess('/manage-tags');
  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags || !canEditTags;
  const isSubmitDisabled = isLoadingParts || isLoadingAfs || !af || isOsInvalid || (editingServiceOrder?.mode === 'add_part' && !selectedPart);

  const isOsDetailsReadOnly = editingServiceOrder?.mode === 'add_part';
  const isPartDetailsVisible = !editingServiceOrder || editingServiceOrder.mode === 'add_part';

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {editingServiceOrder ? (
            editingServiceOrder.mode === 'edit_details' ? (
              <>
                Editando OS: <span className="text-primary dark:text-primary">{editingServiceOrder.af}</span>
                {editingServiceOrder.os && <span className="text-primary dark:text-primary"> (OS: {editingServiceOrder.os})</span>}
              </>
            ) : (
              <>
                Adicionar Peça à OS: <span className="text-primary dark:text-primary">{editingServiceOrder.af}</span>
                {editingServiceOrder.os && <span className="text-primary dark:text-primary"> (OS: {editingServiceOrder.os})</span>}
              </>
            )
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
              <Input value="Carregando AFs..." readOnly className="bg-muted" />
            ) : (
              <AfSearchInput
                value={af}
                onChange={setAf}
                availableAfs={allAvailableAfs}
                onSelectAf={handleSelectAf}
                readOnly={isOsDetailsReadOnly}
              />
            )}
          </div>
          <div>
            <Label htmlFor="os" className={cn(isOsInvalid && 'text-destructive')}>OS (Opcional)</Label>
            <Input
              id="os"
              type="number"
              value={os === undefined ? '' : os}
              onChange={handleOsChange}
              placeholder="Número da Ordem de Serviço"
              min="0"
              max="99999"
              readOnly={isOsDetailsReadOnly}
              className={cn(isOsInvalid && 'border-destructive focus-visible:ring-destructive')}
            />
            {isOsInvalid && (
              <p className="text-sm text-destructive mt-1">
                Valor inválido. A OS só pode ser de 0 a 99999.
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <Label htmlFor="hora_inicio" className="min-h-[2.5rem] flex items-center">Hora de Início (Opcional)</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                readOnly={isOsDetailsReadOnly}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="hora_final" className="min-h-[2.5rem] flex items-center">Hora Final (Opcional)</Label>
              <Input
                id="hora_final"
                type="time"
                value={horaFinal}
                onChange={(e) => setHoraFinal(e.target.value)}
                readOnly={isOsDetailsReadOnly}
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
              readOnly={isOsDetailsReadOnly}
            />
          </div>

          {isPartDetailsVisible && (
            <>
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
                  required={!!selectedPart}
                />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
            {editingServiceOrder?.mode === 'edit_details' ? "Salvar Detalhes da Ordem" : (editingServiceOrder ? "Adicionar Peça à Ordem" : "Criar Ordem e Adicionar Peça")}
          </Button>
        </form>
        <div className="flex flex-col space-y-2 mt-4">
          <Button variant="outline" onClick={onNewServiceOrder} className="w-full flex items-center gap-2">
            <FilePlus className="h-4 w-4" /> Iniciar Nova Ordem de Serviço
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceOrderForm;