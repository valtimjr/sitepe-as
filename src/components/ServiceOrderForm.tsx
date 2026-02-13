import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, searchParts as searchPartsService, updatePart, getAfsFromService, Af, saveDailyServiceOrder, getDailyServiceOrdersByDate } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Save, XCircle, Loader2, Tag, PlusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/SessionContextProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import RelatedPartDisplay from './RelatedPartDisplay';
import { ScrollArea } from './ui/scroll-area';
import { RelatedPart, DailyServiceOrder, ServiceOrderData } from '@/types/supabase';
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

type FormMode = 'create-new-so' | 'edit-so-details';

interface ServiceOrderFormProps {
  onItemAdded: () => void;
  onNewServiceOrder: () => void;
  onClose?: () => void;
  mode: FormMode;
  initialSoData?: ServiceOrderDetails | null;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ 
  onItemAdded, 
  onClose, 
  mode, 
  initialSoData, 
}) => {
  const { user, profile } = useSession();
  const isMobile = useIsMobile();
  
  // Estados da OS
  const [af, setAf] = useState('');
  const [os, setOs] = useState<string>('');
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFinal, setHoraFinal] = useState<string>('');
  const [servicoExecutado, setServicoExecutado] = useState<string>('');
  
  // Estados das Peças
  const [addedParts, setAddedParts] = useState<{codigo_peca: string, descricao: string, quantidade: number}[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);

  useEffect(() => {
    const loadAfs = async () => {
      const data = await getAfsFromService();
      setAllAvailableAfs(data);
    };
    loadAfs();
  }, []);

  useEffect(() => {
    if (initialSoData) {
      setAf(initialSoData.af);
      setOs(initialSoData.os?.toString() || '');
      setHoraInicio(initialSoData.hora_inicio || '');
      setHoraFinal(initialSoData.hora_final || '');
      setServicoExecutado(initialSoData.servico_executado || '');
    }
  }, [initialSoData]);

  // Busca de peças
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
    const handler = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleAddPartToList = () => {
    if (!selectedPart) return;
    setAddedParts(prev => [...prev, {
      codigo_peca: selectedPart.codigo,
      descricao: selectedPart.descricao,
      quantidade: quantidade
    }]);
    setSelectedPart(null);
    setQuantidade(1);
    setSearchQuery('');
  };

  const handleRemovePartFromList = (index: number) => {
    setAddedParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!af) {
      showError('O número do AF é obrigatório.');
      return;
    }

    const loadingId = showLoading('Salvando ordem de serviço...');
    try {
      const dateStr = format(initialSoData?.createdAt || new Date(), 'yyyy-MM-dd');
      
      // 1. Busca as ordens existentes do dia
      const existingOrders = await getDailyServiceOrdersByDate(user.id, dateStr);
      
      // 2. Cria a nova OS ou atualiza a existente
      const newOrderData: ServiceOrderData = {
        id: mode === 'edit-so-details' && initialSoData ? (initialSoData as any).id || uuidv4() : uuidv4(),
        af,
        os,
        hora_inicio: horaInicio,
        hora_final: horaFinal,
        servico_executado: servicoExecutado,
        parts: addedParts
      };

      let updatedOrders: ServiceOrderData[];
      if (mode === 'edit-so-details') {
        updatedOrders = existingOrders.map(o => o.af === initialSoData?.af && o.os === initialSoData?.os?.toString() ? newOrderData : o);
      } else {
        updatedOrders = [...existingOrders, newOrderData];
      }

      // 3. Salva o pacote completo do dia
      const dailyOrder: DailyServiceOrder = {
        id: uuidv4(), // O ID da linha na tabela pode ser novo, o conflito é em user_id+date
        user_id: user.id,
        date: dateStr,
        user_badge: profile?.badge || null,
        user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || null,
        os_list: updatedOrders,
      };

      await saveDailyServiceOrder(dailyOrder);
      showSuccess('Ordem de serviço salva com sucesso!');
      onItemAdded();
    } catch (error: any) {
      showError('Erro ao salvar: ' + error.message);
    } finally {
      dismissToast(loadingId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>AF (Número de Frota)</Label>
          <AfSearchInput
            value={af}
            onChange={setAf}
            onSelectAf={setAf}
            availableAfs={allAvailableAfs}
          />
        </div>
        <div className="space-y-2">
          <Label>Número da OS</Label>
          <Input 
            value={os} 
            onChange={e => setOs(e.target.value)} 
            placeholder="Ex: 45001"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hora Início</Label>
          <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Hora Final</Label>
          <Input type="time" value={horaFinal} onChange={e => setHoraFinal(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Serviço Executado</Label>
        <Textarea 
          value={servicoExecutado} 
          onChange={e => setServicoExecutado(e.target.value)} 
          placeholder="Descreva o trabalho realizado..."
          rows={3}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Adicionar Peças</h3>
        <div className="space-y-3">
          <PartSearchInput
            onSearch={setSearchQuery}
            searchResults={searchResults}
            onSelectPart={setSelectedPart}
            searchQuery={searchQuery}
            isLoading={isLoadingParts}
          />
          
          {selectedPart && (
            <div className="flex items-end gap-2 bg-muted/50 p-3 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-bold">{selectedPart.codigo}</p>
                <p className="text-xs text-muted-foreground">{selectedPart.descricao}</p>
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Qtd</Label>
                <Input 
                  type="number" 
                  value={quantidade} 
                  onChange={e => setQuantidade(parseInt(e.target.value) || 1)} 
                />
              </div>
              <Button type="button" size="icon" onClick={handleAddPartToList}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {addedParts.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead className="w-16 text-center">Qtd</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addedParts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2">
                      <p className="font-medium text-xs">{p.codigo_peca}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.descricao}</p>
                    </TableCell>
                    <TableCell className="text-center">{p.quantidade}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePartFromList(i)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          <Save className="h-4 w-4" /> Salvar Ordem
        </Button>
      </div>
    </form>
  );
};

export default ServiceOrderForm;