import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Part, searchParts as searchPartsService, getAfsFromService, Af, saveDailyServiceOrder, getDailyServiceOrdersByDate } from '@/services/partListService';
import { getGuestOrders, saveGuestOrders } from '@/services/guestOrderService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Save, Tag } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useSession } from '@/components/SessionContextProvider';
import { ServiceOrderData, DailyServiceOrder } from '@/types/supabase';
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
  listItems: any[];
  onClose?: () => void;
  mode: FormMode;
  initialSoData?: ServiceOrderDetails | null;
  initialPartData?: any | null;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ 
  onItemAdded, 
  onClose, 
  mode, 
  initialSoData, 
}) => {
  const { user, profile } = useSession();
  
  // Estados dos detalhes da OS
  const [af, setAf] = useState('');
  const [os, setOs] = useState<number | undefined>(undefined);
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFinal, setHoraFinal] = useState<string>('');
  const [servicoExecutado, setServicoExecutado] = useState<string>('');
  
  // Estados das peças (Manual + Busca)
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);

  useEffect(() => {
    const loadAfs = async () => {
      const afs = await getAfsFromService();
      setAllAvailableAfs(afs);
    };
    loadAfs();
  }, []);

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

  const handleSelectPart = (part: Part) => {
    setFormPartCode(part.codigo);
    setFormDescription(part.name || part.descricao);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!af) {
      showError('O campo AF é obrigatório.');
      return;
    }

    try {
      const orderId = (mode.includes('edit') && (initialSoData as any)?.id) ? (initialSoData as any).id : uuidv4();
      
      const newOrder: ServiceOrderData = {
        id: orderId,
        af: af,
        os: os?.toString() || '',
        hora_inicio: horaInicio,
        hora_final: horaFinal,
        servico_executado: servicoExecutado,
        parts: []
      };

      // Adiciona peça se houver algo preenchido
      if (formPartCode.trim() || formDescription.trim()) {
        newOrder.parts.push({
          codigo_peca: formPartCode.trim(),
          descricao: formDescription.trim(),
          quantidade: quantidade
        });
      }

      if (user) {
        const loadingId = showLoading('Salvando...');
        const dateStr = format(initialSoData?.createdAt || new Date(), 'yyyy-MM-dd');
        const existingOrders = await getDailyServiceOrdersByDate(user.id, dateStr);
        
        let updatedOrders;
        if (mode === 'edit-so-details') {
          updatedOrders = existingOrders.map(o => o.id === orderId ? { ...newOrder, parts: o.parts } : o);
        } else if (mode === 'add-part-to-existing-so') {
            updatedOrders = existingOrders.map(o => {
                if (o.af === af && o.os === (os?.toString() || '')) {
                    return { ...o, parts: [...o.parts, ...newOrder.parts] };
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
        const guestOrders = getGuestOrders();
        let updatedOrders;
        if (mode === 'edit-so-details') {
          updatedOrders = guestOrders.map(o => o.id === orderId ? { ...newOrder, parts: o.parts } : o);
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="af">AF (Frota) *</Label>
              <AfSearchInput value={af} onChange={setAf} onSelectAf={setAf} availableAfs={allAvailableAfs} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="os">OS (Opcional)</Label>
              <Input id="os" type="number" value={os === undefined ? '' : os} onChange={(e) => setOs(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Nº da OS" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" value={horaFinal} onChange={(e) => setHoraFinal(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Serviço Executado</Label>
            <Textarea value={servicoExecutado} onChange={(e) => setServicoExecutado(e.target.value)} placeholder="Trabalho realizado..." rows={2} />
          </div>
          
          <Separator />

          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
              <Tag className="h-4 w-4" /> Peça e Quantidade
            </h3>
            
            <div>
              <Label>Buscar no Catálogo</Label>
              <PartSearchInput onSearch={setSearchQuery} searchResults={searchResults} onSelectPart={handleSelectPart} searchQuery={searchQuery} isLoading={isLoadingParts} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label>Cód. Peça</Label>
                <Input value={formPartCode} onChange={(e) => setFormPartCode(e.target.value)} placeholder="Código" />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Nome da peça" />
              </div>
            </div>

            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)} min="1" />
            </div>
          </div>
          
          <div className="flex gap-2 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">Cancelar</Button>
            <Button type="submit" className="w-full" disabled={!af}><Save className="h-4 w-4 mr-2" /> Salvar Ordem</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ServiceOrderForm;