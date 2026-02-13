import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getDailyServiceOrders, ServiceOrderData, saveDailyServiceOrder, clearDailyServiceOrders } from '@/services/partListService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, ChevronLeft, ChevronRight, CalendarIcon, AlertCircle, Trash2, Copy, Share2, FileDown, ArrowUpDown } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { lazyGenerateServiceOrderPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const ServiceOrderList: React.FC = () => {
  const { user, session } = useSession();
  const isMobile = useIsMobile();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [osList, setOsList] = useState<ServiceOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOs, setEditingOs] = useState<ServiceOrderData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  useEffect(() => {
    document.title = "Ordens de Serviço - AutoBoard";
  }, []);

  const loadDailyOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDailyServiceOrders(user?.id, dateStr);
      setOsList(data);
    } catch (error) {
      showError('Erro ao carregar ordens do dia.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dateStr]);

  useEffect(() => {
    loadDailyOrders();
  }, [loadDailyOrders]);

  // Lógica de ordenação: dia começa às 07:00
  const sortedOsList = useMemo(() => {
    const getSortValue = (time?: string) => {
      if (!time) return sortDirection === 'asc' ? Infinity : -Infinity;
      
      const [h, m] = time.split(':').map(Number);
      // Ajusta as horas para que 07:00 seja o ponto 0
      let adjustedH = h - 7;
      if (adjustedH < 0) adjustedH += 24;
      
      return adjustedH * 60 + m;
    };

    return [...osList].sort((a, b) => {
      const valA = getSortValue(a.hora_inicio);
      const valB = getSortValue(b.hora_inicio);
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [osList, sortDirection]);

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  const handleOpenForm = (os?: ServiceOrderData) => {
    setEditingOs(os || null);
    setIsFormOpen(true);
  };

  const handleSaveOS = async (updatedOs: ServiceOrderData) => {
    const newList = editingOs 
      ? osList.map(o => o.id === editingOs.id ? updatedOs : o)
      : [...osList, updatedOs];
    
    try {
      await saveDailyServiceOrder(user?.id, dateStr, newList);
      setOsList(newList);
      setIsFormOpen(false);
      showSuccess(editingOs ? 'OS atualizada!' : 'OS adicionada!');
    } catch (error) {
      showError('Erro ao salvar as ordens.');
    }
  };

  const handleDeleteOS = async (id: string) => {
    const newList = osList.filter(o => o.id !== id);
    try {
      await saveDailyServiceOrder(user?.id, dateStr, newList);
      setOsList(newList);
      showSuccess('OS removida.');
    } catch (error) {
      showError('Erro ao remover OS.');
    }
  };

  const handleClearDay = async () => {
    try {
      await clearDailyServiceOrders(user?.id, dateStr);
      setOsList([]);
      showSuccess('Todas as ordens do dia foram removidas.');
    } catch (error) {
      showError('Erro ao limpar o dia.');
    }
  };

  const formatListText = () => {
    if (sortedOsList.length === 0) return '';

    let text = `Ordens de Serviço - ${format(selectedDate, 'dd/MM/yyyy')}\n\n`;

    sortedOsList.forEach((group, idx) => {
      text += `AF: ${group.af}${group.os ? ` OS: ${group.os}` : ''}\n`;
      if (group.hora_inicio || group.hora_final) {
        text += `${group.hora_inicio || '??'}-${group.hora_final || '??'}\n`;
      }
      if (group.servico_executado) {
        text += `${group.servico_executado}\n`;
      }
      if (group.parts && group.parts.length > 0) {
        text += `Peças:\n`;
        group.parts.forEach(p => {
          text += `${p.quantidade} - ${p.descricao}\n`;
          if (p.codigo_peca) {
            text += `Cód: ${p.codigo_peca}\n`;
          }
        });
      }
      if (idx < sortedOsList.length - 1) text += `\n`;
    });

    return text.trim();
  };

  const handleCopyList = async () => {
    const textToCopy = formatListText();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Ordens copiadas para a área de transferência!');
    } catch (err) {
      showError('Falha ao copiar.');
    }
  };

  const handleShareOnWhatsApp = () => {
    const textToShare = formatListText();
    if (!textToShare) return;

    const encodedText = encodeURIComponent(textToShare);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    showSuccess('Pronto para compartilhar no WhatsApp!');
  };

  const handleExportPdf = async () => {
    if (sortedOsList.length === 0) {
      showError('Nenhuma OS para exportar neste dia.');
      return;
    }
    const title = `Ordens de Serviço - ${format(selectedDate, 'dd/MM/yyyy')}`;
    await lazyGenerateServiceOrderPdf(sortedOsList.map(os => ({
      ...os,
      createdAt: selectedDate,
      parts: os.parts
    })), title);
    showSuccess('PDF gerado com sucesso!');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-4xl font-extrabold mt-8 text-center text-primary flex items-center justify-center gap-3">
          <ClipboardList className="h-10 w-10" />
          Ordens de Serviço
        </h1>

        {!session && (
          <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Modo Visitante</AlertTitle>
            <AlertDescription>
              Você não está logado. Suas ordens serão salvas apenas neste dispositivo. 
              <Link to="/login" className="font-bold underline ml-1 text-primary">Faça login</Link> para salvar na nuvem.
            </AlertDescription>
          </Alert>
        )}

        {/* Navegação por Data com Calendário */}
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Botão com calendário */}
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "flex items-center gap-2 min-w-[200px] justify-start text-left font-normal",
                      !isDatePickerOpen && "h-10"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="icon" onClick={() => handleDateChange(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
              <Button className="flex-1 sm:flex-none gap-2" onClick={() => handleOpenForm()}>
                <ClipboardList className="h-4 w-4" /> Nova OS
              </Button>

              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className={cn(sortDirection === 'desc' && "bg-primary text-white border-primary")}
                    >
                      <ArrowUpDown className={cn("h-4 w-4", sortDirection === 'desc' && "rotate-180 transition-transform")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Inverter Ordem (Início às 07:00)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleCopyList} 
                      disabled={osList.length === 0}
                      className="bg-white text-primary border-primary hover:bg-primary hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar Ordens</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      onClick={handleShareOnWhatsApp} 
                      disabled={osList.length === 0}
                      className="h-10 w-10 p-0 rounded-full"
                    >
                      <img src="/icons/whatsapp.png" alt="WhatsApp" className="h-10 w-10" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compartilhar no WhatsApp</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleExportPdf} disabled={osList.length === 0}>
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar PDF</TooltipContent>
                </Tooltip>

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={osList.length === 0}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Limpar Dia</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar dia inteiro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso excluirá todas as ordens de serviço do dia {format(selectedDate, 'dd/MM/yyyy')}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearDay}>Limpar Tudo</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : sortedOsList.length === 0 ? (
          <Card className="border-dashed py-16">
            <CardContent className="flex flex-col items-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhuma ordem de serviço para esta data.</p>
              <Button variant="link" onClick={() => handleOpenForm()}>Começar agora</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedOsList.map(os => (
              <ServiceOrderListDisplay 
                key={os.id}
                group={os}
                onEdit={() => handleOpenForm(os)}
                onDelete={() => handleDeleteOS(os.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingOs ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</SheetTitle>
          </SheetHeader>
          <div className="py-6">
            <ServiceOrderForm 
              initialData={editingOs}
              onSave={handleSaveOS}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
      
      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;