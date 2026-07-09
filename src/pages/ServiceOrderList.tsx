"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getDailyServiceOrders, ServiceOrderData, saveDailyServiceOrder } from '@/services/partListService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Trash2, Copy, Share2, FileDown, ArrowUpNarrowWide, ArrowDownWideNarrow, PlusCircle, GripVertical, Clock } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showSuccess, showError } from '@/utils/toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { lazyGenerateServiceOrderPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getOperationalDate } from '@/lib/utils';
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

import { ServiceOrderCharts } from '@/components/ServiceOrderCharts';
import { useCompany } from '@/context/CompanyContext';
import { FileChartLine } from 'lucide-react';

const ServiceOrderList: React.FC = () => {
  const { user, session, profile } = useSession();
  const isMobile = useIsMobile();
  const { company, branding } = useCompany();
  
  const [selectedDate, setSelectedDate] = useState<Date>(getOperationalDate(new Date()));
  const [osList, setOsList] = useState<ServiceOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOs, setEditingOs] = useState<ServiceOrderData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [selectedOsIds, setSelectedOsIds] = useState<string[]>([]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  const dateStr = useMemo(() => {
    if (!session) return 'visitor';
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate, session]);

  // Limpa as seleções se o dia mudar
  useEffect(() => {
    setSelectedOsIds([]);
  }, [dateStr]);

  useEffect(() => {
    document.title = `Ordens de Serviço - AutoBoard (${branding.name})`;
  }, [branding.name]);

  // Atualização automática do dia operacional caso mude no relógio do sistema (ex: ao bater 07:00 AM)
  useEffect(() => {
    let prevNowOp = getOperationalDate(new Date());

    const interval = setInterval(() => {
      const currentNowOp = getOperationalDate(new Date());
      if (currentNowOp.toDateString() !== prevNowOp.toDateString()) {
        setSelectedDate(prevSelected => {
          if (prevSelected.toDateString() === prevNowOp.toDateString()) {
            return currentNowOp;
          }
          return prevSelected;
        });
        prevNowOp = currentNowOp;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadDailyOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDailyServiceOrders(user?.id, dateStr, company);
      setOsList(data);
    } catch (error) {
      showError('Erro ao carregar ordens do dia.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dateStr, company]);

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

  const handleToggleSelect = (id: string) => {
    setSelectedOsIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOsIds(sortedOsList.map(os => os.id));
    } else {
      setSelectedOsIds([]);
    }
  };

  // Função reutilizável para recuperar todas as OS ou apenas as selecionadas se houver alguma
  const getTargetOsList = useCallback((onlySelectedIfAny = true) => {
    const selected = sortedOsList.filter(os => selectedOsIds.includes(os.id));
    if (onlySelectedIfAny && selected.length > 0) {
      return selected;
    }
    return sortedOsList;
  }, [sortedOsList, selectedOsIds]);

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
      await saveDailyServiceOrder(user?.id, dateStr, newList, company);
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
      await saveDailyServiceOrder(user?.id, dateStr, newList, company);
      setOsList(newList);
      setSelectedOsIds(prev => prev.filter(item => item !== id));
      showSuccess('OS removida.');
    } catch (error) {
      showError('Erro ao remover OS.');
    }
  };

  const formatListText = (items: ServiceOrderData[]) => {
    if (items.length === 0) return '';

    let text = `Ordens de Serviço (${branding.name}) - ${format(selectedDate, 'dd/MM/yyyy')}\n\n`;

    items.forEach((group, idx) => {
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
      if (idx < items.length - 1) text += `\n`;
    });

    return text.trim();
  };

  const handleCopyList = async () => {
    const targetItems = getTargetOsList();
    const textToCopy = formatListText(targetItems);
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess(selectedOsIds.length > 0
        ? 'Ordens selecionadas copiadas para a área de transferência!'
        : 'Ordens copiadas para a área de transferência!'
      );
    } catch (err) {
      showError('Falha ao copiar.');
    }
  };

  const handleShareOnWhatsApp = () => {
    const targetItems = getTargetOsList();
    const textToShare = formatListText(targetItems);
    if (!textToShare) return;

    const encodedText = encodeURIComponent(textToShare);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    showSuccess('Pronto para compartilhar no WhatsApp!');
  };

  const handleExportPdf = async () => {
    const targetItems = getTargetOsList();
    if (targetItems.length === 0) {
      showError('Nenhuma OS para exportar neste dia.');
      return;
    }
    const isSelectedMode = selectedOsIds.length > 0;
    const title = isSelectedMode
      ? `Ordens de Serviço Selecionadas (${branding.name}) - ${format(selectedDate, 'dd/MM/yyyy')}`
      : `Ordens de Serviço (${branding.name}) - ${format(selectedDate, 'dd/MM/yyyy')}`;

    await lazyGenerateServiceOrderPdf(targetItems.map(os => ({
      ...os,
      createdAt: selectedDate,
      parts: os.parts
    })), title);
    showSuccess(isSelectedMode ? 'PDF com as OS selecionadas gerado com sucesso!' : 'PDF gerado com sucesso!');
  };

  return (
    <div className="min-h-screen p-4 bg-background text-foreground max-w-5xl mx-auto w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      
      {/* Title */}
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-3">
          <img src="/icons/tela_inicial/12.png" alt="" className="h-16 w-auto object-contain" />
          Lista de Ordens de Serviço
        </div>
        <span className="text-2xl font-bold opacity-80">{branding.name}</span>
      </h1>

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

      {isAdmin && (
        <div className="flex justify-center mb-6">
          <Link to={`/${company}/admin-report`} className="w-full">
            <Button
              variant="outline"
              className="w-full text-primary border-primary/20 hover:bg-primary/5"
            >
              <FileChartLine className="mr-2 h-4 w-4" />
              Relatório Geral
            </Button>
          </Link>
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
        
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base font-medium"
          onClick={() => handleOpenForm()}
        >
          <PlusCircle className="mr-2 h-5 w-5" /> Iniciar Nova OS
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-2">
           <ServiceOrderCharts osList={osList} currentDate={selectedDate} />

           <Button
             variant="outline"
             className="text-primary border-primary/20 hover:bg-primary/5 w-10 h-10 p-0 md:w-auto md:h-10 md:px-4 relative"
             onClick={handleCopyList}
             disabled={osList.length === 0}
           >
             <Copy className="h-4 w-4 md:mr-2" />
             <span className="hidden md:inline">
               {selectedOsIds.length > 0 ? `Copiar Selecionadas (${selectedOsIds.length})` : 'Copiar Lista'}
             </span>
             {selectedOsIds.length > 0 && (
               <span className="md:hidden text-[10px] font-bold absolute top-0 right-0 bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center translate-x-1/3 -translate-y-1/3 shadow">
                 {selectedOsIds.length}
               </span>
             )}
           </Button>

           <div className="relative">
             <Button
               className="bg-white hover:bg-gray-50 rounded-full w-10 h-10 p-0 border shadow-sm"
               onClick={handleShareOnWhatsApp}
               disabled={osList.length === 0}
               title={selectedOsIds.length > 0 ? "Compartilhar selecionadas no WhatsApp" : "Compartilhar lista no WhatsApp"}
             >
                <img src="/icons/whatsapp.png" alt="WhatsApp" className="h-10 w-10" />
             </Button>
             {selectedOsIds.length > 0 && (
               <span className="text-[10px] font-bold absolute top-0 right-0 bg-green-500 text-white rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center translate-x-1/3 -translate-y-1/3 shadow">
                 {selectedOsIds.length}
               </span>
             )}
           </div>

           <Button
             className="bg-primary hover:bg-primary/90 text-primary-foreground w-10 h-10 p-0 md:w-auto md:h-10 md:px-4 relative"
             aria-label="Exportar PDF"
             onClick={handleExportPdf}
             disabled={osList.length === 0}
           >
             <FileDown className="h-4 w-4 md:mr-2" />
             <span className="hidden md:inline">
               {selectedOsIds.length > 0 ? `Exportar Selecionadas (${selectedOsIds.length})` : 'Exportar PDF'}
             </span>
             {selectedOsIds.length > 0 && (
               <span className="md:hidden text-[10px] font-bold absolute top-0 right-0 bg-primary-foreground text-primary rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center translate-x-1/3 -translate-y-1/3 shadow">
                 {selectedOsIds.length}
               </span>
             )}
           </Button>
        </div>
      </div>

      {/* List Header Row (Desktop visible) */}
      <div className="mt-8 mb-2 px-4 hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-4 text-sm text-muted-foreground font-medium items-center">
         <div className="flex items-center gap-4">
            <GripVertical className="h-4 w-4 opacity-50 text-transparent" />
            {sortedOsList.length > 0 && (
              <Checkbox
                checked={sortedOsList.length > 0 && sortedOsList.every(os => selectedOsIds.includes(os.id))}
                onCheckedChange={handleToggleSelectAll}
                className="h-5 w-5 rounded border-blue-200"
                aria-label="Selecionar todas as OS"
              />
            )}
            <div
              className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              title="Ordenar por horário"
            >
               <Clock className="h-4 w-4 group-hover:text-primary transition-colors" />
               {sortDirection === 'asc' ? (
                 <ArrowUpNarrowWide className="h-4 w-4 text-primary" />
               ) : (
                 <ArrowDownWideNarrow className="h-4 w-4 text-primary" />
               )}
            </div>
         </div>
         <div>
           {selectedOsIds.length > 0 && (
             <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100">
               {selectedOsIds.length} selecionada(s) para exportação
             </span>
           )}
         </div>
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
          {/* Mobile Select All Bar */}
          {sortedOsList.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/40 border border-blue-100/50 rounded-sm md:hidden mb-4">
              <Checkbox
                checked={sortedOsList.every(os => selectedOsIds.includes(os.id))}
                onCheckedChange={handleToggleSelectAll}
                id="mobile-select-all"
                className="h-5 w-5 rounded border-blue-200"
              />
              <label htmlFor="mobile-select-all" className="text-xs font-semibold text-blue-700 cursor-pointer select-none">
                Selecionar todas as OS ({selectedOsIds.length} selecionadas)
              </label>
            </div>
          )}

          {sortedOsList.map(os => (
            <ServiceOrderListDisplay
              key={os.id}
              group={os}
              onEdit={() => handleOpenForm(os)}
              onDelete={() => handleDeleteOS(os.id)}
              onSave={handleSaveOS}
              isSelected={selectedOsIds.includes(os.id)}
              onSelectChange={() => handleToggleSelect(os.id)}
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
      
      <div className="flex justify-center mt-8 mb-8">
        <Link to={`/${company}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;