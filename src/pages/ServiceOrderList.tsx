import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import { getDailyServiceOrdersByDate, saveDailyServiceOrder } from '@/services/partListService';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, ClipboardList, FilePlus, Loader2, Save, Trash2, Edit, Info } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { v4 as uuidv4 } from 'uuid';
import { DailyServiceOrder, ServiceOrderData } from '@/types/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ServiceOrderList: React.FC = () => {
  const { user, profile, isLoading: isSessionLoading } = useSession();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orders, setOrders] = useState<ServiceOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Estados para o formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrderData | null>(null);

  const dateString = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const loadOrders = useCallback(async () => {
    // Se não há usuário, não adianta tentar carregar do Supabase
    if (!user?.id) {
      setIsLoading(false);
      setOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getDailyServiceOrdersByDate(user.id, dateString);
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      showError('Erro ao carregar ordens de serviço.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dateString]);

  // Redireciona para ordens offline se não estiver logado
  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/guest-service-orders');
    }
  }, [user, isSessionLoading, navigate]);

  // Carrega ordens quando muda data ou usuário
  useEffect(() => {
    if (!isSessionLoading && user) {
      document.title = "Ordens de Serviço - AutoBoard";
      loadOrders();
    }
  }, [dateString, user?.id, loadOrders, isSessionLoading]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    setSelectedDate(newDate);
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleOpenCreateForm = () => {
    if (!user) {
      showError('Você precisa estar logado para salvar ordens de serviço online.');
      return;
    }
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleEditOrder = (order: ServiceOrderData) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!user || !window.confirm('Tem certeza que deseja excluir esta ordem?')) return;
    
    const updatedOrders = orders.filter(o => o.id !== orderId);
    const loadingId = showLoading('Excluindo ordem...');
    
    try {
      const dailyOrder: DailyServiceOrder = {
        id: uuidv4(),
        user_id: user.id,
        date: dateString,
        user_badge: profile?.badge || null,
        user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || null,
        os_list: updatedOrders,
      };

      await saveDailyServiceOrder(dailyOrder);
      setOrders(updatedOrders);
      showSuccess('Ordem excluída com sucesso!');
    } catch (error) {
      showError('Erro ao excluir ordem.');
    } finally {
      dismissToast(loadingId);
    }
  };

  const handleFormSaved = () => {
    setIsFormOpen(false);
    loadOrders();
  };

  if (isSessionLoading || (isLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Carregando ordens...</p>
        </div>
      </div>
    );
  }

  // Se não tem usuário, o useEffect acima já deve ter redirecionado, mas como fallback:
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-4 mt-8 text-center text-primary flex items-center justify-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        Ordens de Serviço
      </h1>

      {/* Navegação de Data */}
      <Card className="w-full max-w-4xl mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => handleDateChange('prev')} size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 font-bold text-lg hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" onClick={() => handleDateChange('next')} size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Ordens */}
      <Card className="w-full max-w-4xl mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Ordens do Dia</CardTitle>
          <Button onClick={handleOpenCreateForm} className="flex items-center gap-2">
            <FilePlus className="h-4 w-4" /> Iniciar Nova OS
          </Button>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma ordem registrada nesta data.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-primary">AF: {order.af} | OS: {order.os}</h3>
                        <p className="text-sm text-muted-foreground">{order.hora_inicio} - {order.hora_final}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditOrder(order)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteOrder(order.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm mb-3"><strong>Serviço:</strong> {order.servico_executado}</p>
                    {order.parts.length > 0 && (
                      <div className="bg-muted/30 p-2 rounded text-xs">
                        <p className="font-bold mb-1">Peças:</p>
                        <ul className="list-disc list-inside">
                          {order.parts.map((p, idx) => (
                            <li key={idx}>{p.quantidade}x {p.codigo_peca} - {p.descricao}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de OS */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
            </SheetTitle>
          </SheetHeader>
          <div className="py-6">
            <p className="text-sm text-muted-foreground mb-4">Data selecionada: {dateString}</p>
            <ServiceOrderForm 
               mode={editingOrder ? 'edit-so-details' : 'create-new-so'}
               initialSoData={{
                 af: editingOrder?.af || '',
                 os: editingOrder ? parseInt(editingOrder.os) : undefined,
                 hora_inicio: editingOrder?.hora_inicio,
                 hora_final: editingOrder?.hora_final,
                 servico_executado: editingOrder?.servico_executado,
                 createdAt: selectedDate
               }}
               onItemAdded={handleFormSaved}
               onNewServiceOrder={() => {}}
               listItems={[]}
               onClose={() => setIsFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;