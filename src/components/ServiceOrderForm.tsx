import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addServiceOrderItem, getParts, getAfsFromService, searchParts as searchPartsService, updatePart, deleteServiceOrderItem, ServiceOrderItem, updateServiceOrderItem, Af } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, Plus, FilePlus, XCircle, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/SessionContextProvider'; // Importar useSession
import { useIsMobile } from '@/hooks/use-mobile'; // Importar useIsMobile

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt?: Date;
}

type FormMode = 'create-new-so' | 'add-part-to-existing-so' | 'edit-part' | 'edit-so-details';

interface ServiceOrderFormProps {
  onItemAdded: () => void;
  onNewServiceOrder: () => void;
  listItems: ServiceOrderItem[]; // Ainda necessário para a lógica de item em branco
  onClose?: () => void; // Para fechar o Sheet/Dialog
  
  mode: FormMode; // Modo explícito do formulário
  initialSoData?: ServiceOrderDetails | null; // Dados da OS (para criar nova, editar detalhes, adicionar peça)
  initialPartData?: ServiceOrderItem | null; // Dados da peça (apenas para editar peça)
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ 
  onItemAdded, 
  onNewServiceOrder, 
  listItems, 
  onClose, 
  mode, 
  initialSoData, 
  initialPartData, 
}) => {
  const { checkPageAccess } = useSession();
  const isMobile = useIsMobile();
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
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [editedTags, setEditedTags] = useState<string>('');
  const [isOsInvalid, setIsOsInvalid] = useState(false);

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

  // Efeito para inicializar o formulário com base no `mode` e `initial` props
  useEffect(() => {
    resetAllFieldsInternal(); // Sempre reseta tudo primeiro

    if (initialSoData) {
      setAf(initialSoData.af);
      setOs(initialSoData.os);
      setHoraInicio(initialSoData.hora_inicio || '');
      setHoraFinal(initialSoData.hora_final || '');
      setServicoExecutado(initialSoData.servico_executado || '');
    }

    if (mode === 'edit-part' && initialPartData) {
      setQuantidade(initialPartData.quantidade ?? 1);
      const partFromInitial = allAvailableParts.find(p => p.codigo === initialPartData.codigo_peca);
      setSelectedPart(partFromInitial || null);
      setEditedTags(partFromInitial?.tags || '');
      setSearchQuery(initialPartData.codigo_peca || '');
    } else if (mode === 'add-part-to-existing-so') {
      setQuantidade(1); // Quantidade padrão para nova peça
      resetPartFields(); // Limpa campos de peça para nova adição
    } else if (mode === 'create-new-so' || mode === 'edit-so-details') {
      resetPartFields(); // Não há peça sendo adicionada/editada nestes modos inicialmente
    }

    setIsOsInvalid(false);
  }, [mode, initialSoData, initialPartData, allAvailableParts]);


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

    if (!af && (mode === 'create-new-so' || mode === 'edit-so-details')) {
      showError('Por favor, insira o AF (Número de Frota).');
      return;
    }

    // Lógica para EDITAR DETALHES DA OS
    if (mode === 'edit-so-details' && initialSoData) {
      const originalAf = initialSoData.af;
      const originalOs = initialSoData.os;
      const originalHoraInicio = initialSoData.hora_inicio;
      const originalHoraFinal = initialSoData.hora_final;
      const originalServicoExecutado = initialSoData.servico_executado;
      const originalCreatedAt = initialSoData.createdAt;

      const itemsToUpdate = listItems.filter(item =>
        item.af === originalAf &&
        (item.os === originalOs || (item.os === undefined && originalOs === undefined)) &&
        (item.hora_inicio === originalHoraInicio || (item.hora_inicio === undefined && originalHoraInicio === undefined)) &&
        (item.hora_final === originalHoraFinal || (originalHoraFinal === undefined && item.hora_final === undefined)) &&
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
        // Se não houver itens, cria um item "em branco" para representar a OS
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
      onNewServiceOrder(); // Notifica o pai para resetar o estado de edição
      onClose?.(); // Fecha o modal/sheet
      return;
    }

    // Lógica para ADICIONAR PEÇA A UMA OS EXISTENTE ou EDITAR PEÇA
    if (mode === 'add-part-to-existing-so' || mode === 'edit-part') {
      if (!selectedPart) {
        showError('Por favor, selecione uma peça.');
        return;
      }
      if (quantidade <= 0) {
        showError('A quantidade da peça deve ser maior que zero.');
        return;
      }

      try {
        if (mode === 'edit-part' && initialPartData) {
          // Atualiza a peça existente
          await updateServiceOrderItem({
            ...initialPartData,
            codigo_peca: selectedPart.codigo,
            descricao: selectedPart.descricao,
            quantidade: quantidade,
            af: af, // AF já vem do initialSoData
            os: os, // OS já vem do initialSoData
            hora_inicio: horaInicio || undefined,
            hora_final: horaFinal || undefined,
            servico_executado: servicoExecutado,
          });
          showSuccess('Peça atualizada com sucesso!');
        } else if (mode === 'add-part-to-existing-so' && initialSoData) {
          // Adiciona nova peça à OS existente
          // Verifica se existe um item "em branco" para esta OS e o remove
          const blankItem = listItems.find(item =>
            item.af === initialSoData.af &&
            (item.os === initialSoData.os || (item.os === undefined && initialSoData.os === undefined)) &&
            (item.hora_inicio === initialSoData.hora_inicio || (item.hora_inicio === undefined && initialSoData.hora_inicio === undefined)) &&
            (item.hora_final === initialSoData.hora_final || (initialSoData.hora_final === undefined && item.hora_final === undefined)) &&
            (item.servico_executado === initialSoData.servico_executado || (initialSoData.servico_executado === undefined && item.servico_executado === undefined)) &&
            !item.codigo_peca && !item.descricao && (item.quantidade === undefined || item.quantidade === 0)
          );
          if (blankItem) {
            await deleteServiceOrderItem(blankItem.id);
          }

          await addServiceOrderItem({
            codigo_peca: selectedPart.codigo,
            descricao: selectedPart.descricao,
            quantidade: quantidade,
            af: initialSoData.af,
            os: initialSoData.os,
            hora_inicio: initialSoData.hora_inicio || undefined,
            hora_final: initialSoData.hora_final || undefined,
            servico_executado: servicoExecutado,
          }, initialSoData.createdAt);
          showSuccess('Peça adicionada à Ordem de Serviço!');
        }
        onItemAdded(); // Recarrega a lista no componente pai
        onClose?.(); // Fecha o modal/sheet
      } catch (error) {
        showError('Erro ao salvar peça.');
        console.error('Failed to save part:', error);
      }
      return;
    }

    // Lógica para CRIAR NOVA OS (mode === 'create-new-so')
    if (mode === 'create-new-so') {
      try {
        // Se houver uma peça selecionada, adiciona-a diretamente
        if (selectedPart) {
          if (quantidade <= 0) {
            showError('A quantidade da peça deve ser maior que zero.');
            return;
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
          });
          showSuccess('Ordem de Serviço e peça adicionadas!');
        } else {
          // Se não houver peça, cria uma OS "em branco"
          await addServiceOrderItem({
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
        }
        onItemAdded();
        onNewServiceOrder(); // Notifica o pai para resetar o estado de edição
        onClose?.(); // Fecha o modal/sheet
        // setIsCreatingNewOrder(false); // Esta linha não é mais necessária aqui
      } catch (error) {
        showError('Erro ao criar ordem de serviço.');
        console.error('Failed to create service order:', error);
      }
      return;
    }
  };

  // Lógica para desabilitar a edição de tags
  const canEditTags = checkPageAccess('/manage-tags');
  const isUpdateTagsDisabled = !selectedPart || selectedPart.tags === editedTags || !canEditTags;
  
  // Desabilita o botão de submit se AF for vazio ou OS inválida
  const isSubmitDisabled = isLoadingParts || isLoadingAfs || (!af && (mode === 'create-new-so' || mode === 'edit-so-details')) || isOsInvalid;

  // Determina quais seções mostrar
  const showOsDetails = mode === 'create-new-so' || mode === 'edit-so-details'; // Alterado para ocultar em modos de peça
  const showPartDetails = mode === 'create-new-so' || mode === 'add-part-to-existing-so' || mode === 'edit-part';
  const isOsDetailsReadOnly = mode === 'add-part-to-existing-so' || mode === 'edit-part';

  return (
    <Card className="w-full max-w-md mx-auto shadow-none border-none">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-xl font-bold">
          {mode === 'create-new-so' && "Criar Nova Ordem de Serviço"}
          {mode === 'edit-so-details' && (
            <>
              Editar OS: <span className="text-primary dark:text-primary">{initialSoData?.af}</span>
              {initialSoData?.os && <span className="text-primary dark:text-primary"> (OS: {initialSoData.os})</span>}
            </>
          )}
          {mode === 'add-part-to-existing-so' && (
            <>
              Adicionar Peça à OS: <span className="text-primary dark:text-primary">{initialSoData?.af}</span>
              {initialSoData?.os && <span className="text-primary dark:text-primary"> (OS: {initialSoData.os})</span>}
            </>
          )}
          {mode === 'edit-part' && (
            <>
              Editar Peça: <span className="text-primary dark:text-primary">{initialPartData?.codigo_peca || initialPartData?.descricao}</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campos da Ordem de Serviço */}
          {showOsDetails && (
            <>
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
              {/* Horários: Lado a lado no mobile, com label "Hora" acima */}
              <div className="space-y-2">
                {isMobile && <Label className="text-base font-semibold">Hora (Opcional)</Label>}
                <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0"> {/* Adicionado md:flex-row e md:space-x-2 */}
                  <div className="flex-1">
                    <Label htmlFor="hora_inicio" className="min-h-[2.5rem] flex items-center">
                      {isMobile ? 'Inicial' : 'Hora de Início (Opcional)'}
                    </Label>
                    <Input
                      id="hora_inicio"
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      readOnly={isOsDetailsReadOnly}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="hora_final" className="min-h-[2.5rem] flex items-center">
                      {isMobile ? 'Final' : 'Hora Final (Opcional)'}
                    </Label>
                    <Input
                      id="hora_final"
                      type="time"
                      value={horaFinal}
                      onChange={(e) => setHoraFinal(e.target.value)}
                      readOnly={isOsDetailsReadOnly}
                    />
                  </div>
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
            </>
          )}

          {showPartDetails && (
            <>
              {showOsDetails && <Separator className="my-6" />}
              <h3 className="text-lg font-semibold">Detalhes da Peça</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"> {/* Adicionado items-start aqui */}
                <div className="space-y-2 md:col-span-1"> {/* Código da Peça: menor */}
                  <Label htmlFor="codigo_peca">
                    <span className="block h-4"></span> {/* Adicionado linha em branco aqui */}
                    Código da Peça
                  </Label>
                  <Input
                    id="codigo_peca"
                    type="text"
                    value={selectedPart?.codigo || ''}
                    placeholder="Código da peça selecionada"
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2 md:col-span-2"> {/* Nome da Peça: maior */}
                  <Label htmlFor="name">
                    <span className="block h-4"></span> {/* Adicionado linha em branco aqui */}
                    Nome da Peça
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={selectedPart?.name || ''}
                    placeholder="Nome da peça selecionada"
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"> {/* Adicionado items-start aqui */}
                <div className="space-y-2 md:col-span-2"> {/* Descrição: maior */}
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
                <div className="space-y-2 md:col-span-1"> {/* Quantidade: menor */}
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
            </>
          )}
          <div className="flex gap-2 pt-4">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} className="w-full">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {mode === 'edit-so-details' ? "Salvar Detalhes da Ordem" : 
               mode === 'add-part-to-existing-so' ? "Adicionar Peça" : 
               mode === 'edit-part' ? "Salvar Peça" : 
               "Criar Ordem e Adicionar Peça"}
            </Button>
          </div>
        </form>
        {/* REMOVIDO: O botão "Iniciar Nova Ordem de Serviço" foi removido daqui. */}
        {/*
        {mode === 'create-new-so' && (
          <div className="flex flex-col space-y-2 mt-4">
            <Button variant="outline" onClick={onNewServiceOrder} className="w-full flex items-center gap-2">
              <FilePlus className="h-4 w-4" /> Iniciar Nova Ordem de Serviço
            </Button>
          </div>
        )}
        */}
      </CardContent>
    </Card>
  );
};

export default ServiceOrderForm;