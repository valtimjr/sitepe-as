"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getDailyServiceOrders, ServiceOrderData, saveDailyServiceOrder, clearDailyServiceOrders } from '@/services/partListService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Trash2, Copy, Share2, FileDown, ArrowUpDown, PlusCircle, GripVertical, Clock } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showSuccess, showError } from '@/utils/toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { lazyGenerateServiceOrderPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

const ServiceOrderList: React.FC = () => {
  const { user, session } = useSession();
  const isMobile = useIsMobile();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [osList, setOsList] = useState<ServiceOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOs, setEditingOs] = useState<ServiceOrderData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const dateStr = useMemo(() => {
    if (!session) return 'visitor';
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate, session]);

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

  const sortedOsList = useMemo(() => {
    const getSortValue = (time?: string) => {
      if (!time) return sortDirection === 'asc' ? Infinity : -Infinity;
      
      const [h, m] = time.split(':').map(Number);
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

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleOpenForm = (os?: ServiceOrderData) => {
    setEditingOs(os || null);
    setIsFormOpen(true);
  };

  const handleSaveOS = async (updatedOs: ServiceOrderData) => {
    const newList = osList.some(o => o.id === updatedOs.id) 
      ? osList.map(o => o.id === updatedOs.id ? updatedOs : o)
      : [...osList, updatedOs];
    
    try {
      await saveDailyServiceOrder(user?.id, dateStr, newList);
      setOsList(newList);
      if (isFormOpen) {
        setIsFormOpen(false);
        showSuccess(editingOs ? 'OS atualizada!' : 'OS adicionada!');
      } else {
        // Silent success for inline updates
        showSuccess('OS atualizada!');
      }
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
    <div className="min-h-screen p-4 bg-background text-foreground max-w-5xl mx-auto w-full">
      {/* Date Navigation */}
      {session && (
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="font-semibold">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!session && (
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 mb-6">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Modo Visitante</AlertTitle>
          <AlertDescription>
            Você não está logado. Suas ordens serão salvas apenas neste dispositivo. 
            <Link to="/login" className="font-bold underline ml-1 text-primary">Faça login</Link> para salvar na nuvem.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Header & Actions */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-left text-foreground">
          Lista de Ordens de Serviço
        </h1>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
          onClick={() => handleOpenForm()}
        >
          <PlusCircle className="mr-2 h-5 w-5" /> Iniciar Nova OS
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-2">
           <Button 
             variant="outline" 
             className="text-blue-600 border-blue-200 hover:bg-blue-50"
             onClick={handleCopyList}
             disabled={osList.length === 0}
           >
             <Copy className="mr-2 h-4 w-4" /> Copiar Lista
           </Button>

           <Button 
             className="bg-[#ffffff] hover:bg-blue-700  rounded-full w-10 h-10 p-0"
             onClick={handleShareOnWhatsApp}
             disabled={osList.length === 0}
           >
              <img src="/icons/whatsapp.png" alt="WhatsApp" className="h-10 w-10" />
           </Button>

           <Button 
             className="bg-blue-600 hover:bg-blue-700 text-white"
             aria-label="Compartilhar no WhatsApp"
             onClick={handleExportPdf}
             disabled={osList.length === 0}
           >
             <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
           </Button>

           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive" className="bg-red-500 hover:bg-red-600" disabled={osList.length === 0}>
                 <Trash2 className="mr-2 h-4 w-4" /> Limpar Lista
               </Button>
             </AlertDialogTrigger>
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

      {/* List Header Row (Desktop visible) */}
      <div className="mt-8 mb-2 px-4 hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-4 text-sm text-muted-foreground font-medium">
         <div className="flex items-center gap-4">
            <GripVertical className="h-4 w-4 opacity-50" />
            <div className="flex items-center gap-2">
               <Clock className="h-4 w-4" />
            </div>
            <div 
              className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
               <ArrowUpDown className="h-3 w-3" /> Peça
            </div>
         </div>
         <div></div> {/* Spacer for description/service */}
         <div className="text-center w-16">Qtd</div>
         <div className="text-right w-20">Opções</div>
      </div>

      <div className="border-t border-border/50 md:hidden mb-4"></div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : sortedOsList.length === 0 ? (
        <Card className="border-dashed py-16 mt-4">
          <CardContent className="flex flex-col items-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
            <p>Nenhuma ordem de serviço para esta data.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 mt-2">
          {sortedOsList.map(os => (
            <ServiceOrderListDisplay 
              key={os.id}
              group={os}
              onEdit={() => handleOpenForm(os)}
              onDelete={() => handleDeleteOS(os.id)}
              onSave={handleSaveOS}
            />
          ))}
        </div>
      )}

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