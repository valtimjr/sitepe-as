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
  const { user, profile, checkPageAccess } = useSession();
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
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [editedTags, setEditedTags] = useState<string>('');
  const [isOsInvalid, setIsOsInvalid] = useState(false);

  useEffect(() => {
    const loadAfs = async () => {
      const afs = await getAfsFromService();
      setAllAvailableAfs(afs);
    };
    loadAfs();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!af || isOsInvalid) {
      showError('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      const orderId = (mode.includes('edit') && initialSoData?.createdAt) ? (initialSoData as any).id || uuidv4() : uuidv4();
      
      const newOrder: ServiceOrderData = {
        id: orderId,
        af: af,
        os: os?.toString() || '',
        hora_inicio: horaInicio,
        hora_final: horaFinal,
        servico_executado: servicoExecutado,
        parts: selectedPart ? [{
          codigo_peca: selectedPart.codigo,
          descricao: selectedPart.descricao,
          quantidade: quantidade
        }] : []
      };

      if (user) {
        const loadingId = showLoading('Salvando no servidor...');
        const dateStr = format(initialSoData?.createdAt || new Date(), 'yyyy-MM-dd');
        const existingOrders = await getDailyServiceOrdersByDate(user.id, dateStr);
        
        let updatedOrders;
        if (mode.includes('edit')) {
          updatedOrders = existingOrders.map(o => o.af === initialSoData?.af && o.os === initialSoData?.os?.toString() ? newOrder : o);
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
            <Label>Serviço</Label>
            <Textarea value={servicoExecutado} onChange={(e) => setServicoExecutado(e.target.value)} placeholder="Descrição do serviço" rows={3} />
          </div>
          
          <Separator />
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">Cancelar</Button>
            <Button type="submit" className="w-full" disabled={!af}>Salvar Ordem</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ServiceOrderForm;