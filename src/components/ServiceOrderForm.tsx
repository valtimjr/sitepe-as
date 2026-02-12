import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, addServiceOrderItem, getParts, searchParts as searchPartsService, updatePart, getAfsFromService, Af, updateServiceOrderItem, deleteServiceOrderItem, ServiceOrderItem, saveDailyServiceOrder, getDailyServiceOrdersByDate } from '@/services/partListService';
import { getGuestOrders, saveGuestOrders } from '@/services/guestOrderService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Save, Plus, FilePlus, XCircle, Loader2, Tag } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/SessionContextProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import RelatedPartDisplay from './RelatedPartDisplay';
import { ScrollArea } from './ui/scroll-area';
import { RelatedPart, ServiceOrderData, DailyServiceOrder } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

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
  listItems: ServiceOrderItem[];
  onClose?: () => void;
  mode: FormMode;
  initialSoData?: ServiceOrderDetails | null;
  initialPartData?: ServiceOrderItem | null;
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
  const { user, profile } = useSession();
  const isMobile = useIsMobile();
  
  // Estados dos detalhes da OS
  const [af, setAf] = useState('');
  const [os, setOs] = useState<number | undefined>(undefined);
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFinal, setHoraFinal] = useState<string>('');
  const [servicoExecutado, setServicoExecutado] = useState<string>('');
  
  // Estados das peças
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  
  // Estados globais
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isOsInvalid, setIsOsInvalid] = useState(false);

  useEffect(() => {
    const loadAfs = async () => {
      const afs = await getAfsFromService();
      setAllAvailableAfs(afs);
    };
    loadAfs();
  }, []);

  // Efeito para busca de peças
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        try {
          const results = await searchPartsService(searchQuery);
          setSearchResults(results);
        } finally {
          setIsLoadingParts(false);
        }
      } else {
        setSearchResults([]);
      }
    };
    const handler = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (initialSoData) {
      setAf(initialSoData.af || '');
      setOs(initialSoData.os);
      setHoraInicio(initialSoData.hora_inicio || '');
      setHoraFinal(initialSoData.hora_final || '');
      setServicoExecutado(initialSoData.servico_executado || '');
    }
  }, [initialSoData]);

  const handleOsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const parsed = val === '' ? undefined : parseInt(val);
    setIsOsInvalid(parsed !== undefined && (parsed < 0 || parsed > 99999));
    setOs(parsed);
  };

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!af || isOsInvalid) {
      showError('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      const orderId = (mode.includes('edit') && initialSoData?.createdAt) ? (initialSoData as any).id || uuidv4() : uuidv4();
      
      // Cria a estrutura da ordem
      const newOrder: ServiceOrderData = {
        id: orderId,
        af: af,
        os: os?.toString() || '',
        hora_inicio: horaInicio,
        hora_final: horaFinal,
        servico_executado: servicoExecutado,
        parts: []
      };

      // Se houver uma peça selecionada, adiciona ao array
      if (selectedPart) {
        newOrder.parts.push({
          codigo_peca: selectedPart.codigo,
          descricao: selectedPart.descricao,
          quantidade: quantidade
        });
      }

      if (user) {
        const loadingId = showLoading('Salvando no servidor...');
        const dateStr = format(initialSoData?.createdAt || new Date(), 'yyyy-MM-dd');
        const existingOrders = await getDailyServiceOrdersByDate(user.id, dateStr);
        
        let updatedOrders;
        if (mode.includes('edit')) {
          // Na edição, se a ordem já existe, preservamos as peças que já estavam lá e adicionamos/atualizamos
          updatedOrders = existingOrders.map(o => {
            if (o.af === initialSoData?.af && o.os === initialSoData?.os?.toString()) {
              // Mesclamos as peças se estivermos apenas adicionando uma nova através deste form
              const mergedParts = [...o.parts];
              if (selectedPart) {
                mergedParts.push(newOrder.parts[0]);
              }
              return { ...newOrder, parts: mergedParts };
            }
            return o;
          });
        } else {
          updatedOrders = [...existingOrders, newOrder];
        }

        const dailyOrder: DailyServiceOrder = {
          id: uuidv4(),
          user_id: user.id,
          date: dateStr,
          user_badge: profile?.badge || null,
          user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || null,
          os_list: updatedOrders,
        };

        await saveDailyServiceOrder(dailyOrder);
        dismissToast(loadingId);
      } else {
        // Modo Visitante
        const guestOrders = getGuestOrders();
        let updatedOrders;
        if (mode.includes('edit')) {
          updatedOrders = guestOrders.map(o => o.id === (initialSoData as any)?.id ? newOrder : o);
        } else {
          updatedOrders = [...guestOrders, newOrder];
        }
        saveGuestOrders(updatedOrders);
      }

      showSuccess('Ordem de serviço salva!');
      onItemAdded();
      onClose?.();
    } catch (error) {
      showError('Erro ao salvar a ordem.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-none border-none">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="af">AF (Número de Frota)</Label>
              <AfSearchInput
                value={af}
                onChange={setAf}
                onSelectAf={setAf}
                availableAfs={allAvailableAfs}
              />
            </div>
            <div>
              <Label htmlFor="os">OS (Opcional)</Label>
              <Input id="os" type="number" value={os === undefined ? '' : os} onChange={handleOsChange} placeholder="Nº da OS" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Hora Início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <Label>Hora Fim</Label>
              <Input type="time" value={horaFinal} onChange={(e) => setHoraFinal(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Serviço Executado</Label>
            <Textarea 
              value={servicoExecutado} 
              onChange={(e) => setServicoExecutado(e.target.value)} 
              placeholder="Descreva o trabalho realizado..." 
              rows={3} 
            />
          </div>
          
          <Separator />

          {/* Seção de Peças */}
          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
              <Tag className="h-4 w-4" /> Adicionar Peça (Opcional)
            </h3>
            
            <div>
              <Label htmlFor="part-search">Buscar Peça</Label>
              <PartSearchInput
                onSearch={setSearchQuery}
                searchResults={searchResults}
                onSelectPart={handleSelectPart}
                searchQuery={searchQuery}
                isLoading={isLoadingParts}
              />
            </div>

            {selectedPart && (
              <div className="grid grid-cols-4 gap-2 bg-muted/30 p-3 rounded-md border border-primary/20">
                <div className="col-span-3">
                  <p className="text-[10px] font-bold text-primary uppercase">Selecionada:</p>
                  <p className="text-xs font-bold">{selectedPart.codigo}</p>
                  <p className="text-sm truncate">{selectedPart.name || selectedPart.descricao}</p>
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input 
                    type="number" 
                    value={quantidade} 
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                    min="1"
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
            <Button type="submit" className="w-full" disabled={!af}>
              <Save className="h-4 w-4 mr-2" /> Salvar Ordem
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ServiceOrderForm;