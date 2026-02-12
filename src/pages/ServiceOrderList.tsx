import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import { getDailyServiceOrdersByDate, saveDailyServiceOrder } from '@/services/partListService';
import { getGuestOrders, saveGuestOrders } from '@/services/guestOrderService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, ClipboardList, FilePlus, Loader2, Trash2, Edit, Info, LogIn } from 'lucide-react';
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
import { Link } from 'react-router-dom';

const ServiceOrderList: React.FC = () => {
  const { user, profile, isLoading: isSessionLoading } = useSession();
  const isMobile = useIsMobile();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orders, setOrders] = useState<ServiceOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrderData | null>(null);

  const dateString = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        const data = await getDailyServiceOrdersByDate(user.id, dateString);
        setOrders(data || []);
      } else {
        // Modo Visitante: Carrega do localStorage
        setOrders(getGuestOrders());
      }
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      showError('Erro ao carregar ordens de serviço.');
    } finally {
      setIsLoading(false);
    }
  }, [user, dateString]);

  useEffect(() => {
    if (!isSessionLoading) {
      document.title = "Ordens de Serviço - AutoBoard";
      loadOrders();
    }
  }, [loadOrders, isSessionLoading]);

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
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleEditOrder = (order: ServiceOrderData) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta ordem?')) return;
    
    const updatedOrders = orders.filter(o => o.id !== orderId);
    
    try {
      if (user) {
        const loadingId = showLoading('Excluindo ordem...');
        const dailyOrder: DailyServiceOrder = {
          id: uuidv4(),
          user_id: user.id,
          date: dateString,
          user_badge: profile?.badge || null,
          user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || null,
          os_list: updatedOrders,
        };
        await saveDailyServiceOrder(dailyOrder);
        dismissToast(loadingId);
      } else {
        saveGuestOrders(updatedOrders);
      }
      setOrders(updatedOrders);
      showSuccess('Ordem excluída com sucesso!');
    } catch (error) {
      showError('Erro ao excluir ordem.');
    }
  };

  const handleFormSaved = () => {
    setIsFormOpen(false);
    loadOrders();
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-4 mt-8 text-center text-primary flex items-center justify-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        {user ? 'Ordens de Serviço' : 'Lista de Ordens'}
      </h1>

      {!user && (
        <div className="w-full max-w-4xl mb-6">
          <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">Modo Visitante</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              Você não está logado. Suas ordens serão salvas localmente e sincronizadas após o <Link to="/login" className="underline font-bold">login</Link>.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Navegação de Data - Somente para usuários logados */}
      {user && (
        <Card className="w-full max-w-4xl mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => handleDateChange('prev')} size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 font-bold text-lg hover:bg-accent px-4 py-2 rounded-md">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar mode="single" selected={selectedDate} onSelect={handleSelectDate} locale={ptBR} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" onClick={() => handleDateChange('next')} size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-4xl mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">{user ? 'Ordens do Dia' : 'Minhas Ordens'}</CardTitle>
          <Button onClick={handleOpenCreateForm} className="flex items-center gap-2">
            <FilePlus className="h-4 w-4" /> Nova OS
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Nenhuma ordem registrada.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className={cn("border-l-4", user ? "border-l-primary" : "border-l-muted-foreground")}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-primary">AF: {order.af} {order.os ? `| OS: ${order.os}` : ''}</h3>
                        <p className="text-sm text-muted-foreground">{order.hora_inicio} {order.hora_final ? `- ${order.hora_final}` : ''}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditOrder(order)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteOrder(order.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <p className="text-sm"><strong>Serviço:</strong> {order.servico_executado}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingOrder ? 'Editar Ordem' : 'Nova Ordem'}</SheetTitle>
          </SheetHeader>
          <div className="py-6">
            <ServiceOrderForm 
               mode={editingOrder ? 'edit-so-details' : 'create-new-so'}
               initialSoData={editingOrder ? {
                 af: editingOrder.af,
                 os: parseInt(editingOrder.os || '0'),
                 hora_inicio: editingOrder.hora_inicio,
                 hora_final: editingOrder.hora_final,
                 servico_executado: editingOrder.servico_executado,
                 createdAt: selectedDate
               } : { af: '', createdAt: selectedDate }}
               onItemAdded={handleFormSaved}
               onNewServiceOrder={() => {}}
               listItems={[]}
               onClose={() => setIsFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ServiceOrderList;