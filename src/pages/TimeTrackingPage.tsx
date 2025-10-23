import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Clock, Copy, Download, Trash2, Save, Loader2, MoreHorizontal, Clock3, X, CheckCircle, XCircle, Ban, Info, CalendarCheck, Eraser, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, setHours, setMinutes, addDays, subMonths, addMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Apontamento, getApontamentos, updateApontamento, deleteApontamento, deleteApontamentosByMonth } from '@/services/partListService';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { generateTimeTrackingPdf } from '@/lib/pdfGenerator';
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ALL_TURNS, generateMonthlyApontamentos, ShiftTurn } from '@/services/shiftService'; // Importar serviço de turno
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { localDb } from '@/services/localDbService';
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
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Adicionado

// Mapeamento de Status para Ícone e Estilo
const STATUS_MAP = {
  Folga: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    displayName: 'Folga',
  },
  Falta: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    displayName: 'Falta',
  },
  Suspensao: {
    icon: Ban,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    displayName: 'Suspensão',
  },
  Outros: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    displayName: 'Outros',
  },
};

const TimeTrackingPage: React.FC = () => {
  const { user, profile, isLoading: isSessionLoading } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [otherStatusText, setOtherStatusText] = useState('');
  const [dayForOtherStatus, setDayForOtherStatus] = useState<Date | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<ShiftTurn | ''>('');
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  useEffect(() => {
    document.title = "Apontamento de Horas - AutoBoard";
  }, []);

  const userId = user?.id;

  // Carrega o turno salvo localmente na inicialização
  useEffect(() => {
    const savedTurn = localStorage.getItem('selectedShiftTurn') as ShiftTurn;
    if (savedTurn && ALL_TURNS.includes(savedTurn)) {
      setSelectedTurn(savedTurn);
    } else {
      setSelectedTurn(ALL_TURNS[0]); // Default para Turno A
    }
  }, []);

  const loadApontamentos = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const fetchedApontamentos = await getApontamentos(userId);
      setApontamentos(fetchedApontamentos);
    } catch (error) {
      showError('Erro ao carregar apontamentos.');
      console.error('Failed to load time tracking data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadApontamentos();
  }, [loadApontamentos]);

  const currentMonthStart = startOfMonth(currentDate);
  const currentMonthEnd = endOfMonth(currentDate);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd }), [currentMonthStart, currentMonthEnd]);

  // Função auxiliar para obter o apontamento mais recente (usa o estado atual)
  const getApontamentoForDay = (day: Date): Apontamento | undefined => {
    const dateString = format(day, 'yyyy-MM-dd');
    return apontamentos.find(a => a.date === dateString);
  };

  const updateApontamentoState = (updated: Apontamento) => {
    setApontamentos(prev => {
      const filtered = prev.filter(a => a.id !== updated.id);
      return [...filtered, updated];
    });
  };

  const handleDeleteApontamento = useCallback(async (id: string) => {
    try {
      await deleteApontamento(id);
      setApontamentos(prev => prev.filter(a => a.id !== id));
      showSuccess('Apontamento excluído.');
    } catch (error) {
      showError('Erro ao excluir apontamento.');
      console.error('Failed to delete apontamento:', error);
    }
  }, []);

  const handleTimeChange = useCallback(async (day: Date, field: 'entry_time' | 'exit_time', value: string) => {
    if (!userId) {
      showError('Usuário não autenticado.');
      return;
    }

    const dateString = format(day, 'yyyy-MM-dd');
    const existingApontamento = getApontamentoForDay(day);
    
    const newValue = value.trim() === '' ? undefined : value;

    const newApontamento: Apontamento = existingApontamento
      ? { ...existingApontamento, [field]: newValue, status: undefined } // Limpa o status ao inserir tempo
      : {
          id: uuidv4(),
          user_id: userId,
          date: dateString,
          entry_time: field === 'entry_time' ? newValue : undefined,
          exit_time: field === 'exit_time' ? newValue : undefined,
          created_at: new Date(),
        };

    // Se ambos os campos de tempo e status estiverem vazios, deletamos o apontamento (se existir)
    if (!newApontamento.entry_time && !newApontamento.exit_time && !newApontamento.status && existingApontamento) {
      await handleDeleteApontamento(existingApontamento.id);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateApontamento(newApontamento);
      updateApontamentoState(updated);
      showSuccess('Apontamento salvo!');
    } catch (error) {
      showError('Erro ao salvar apontamento.');
      console.error('Failed to save apontamento:', error);
    } finally {
      setIsSaving(false);
    }
  }, [userId, handleDeleteApontamento, apontamentos]);

  const handleClearStatus = useCallback(async (day: Date) => {
    const existingApontamento = getApontamentoForDay(day);
    if (!existingApontamento) return;

    // Se não houver tempo, deleta o registro. Se houver, apenas limpa o status.
    if (!existingApontamento.entry_time && !existingApontamento.exit_time) {
      await handleDeleteApontamento(existingApontamento.id);
    } else {
      setIsSaving(true);
      try {
        const updated = await updateApontamento({ ...existingApontamento, status: undefined });
        updateApontamentoState(updated);
        showSuccess('Status removido. Campos de hora liberados.');
      } catch (error) {
        showError('Erro ao remover status.');
        console.error('Failed to clear status:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [handleDeleteApontamento, apontamentos]);

  const handleStatusChange = useCallback(async (day: Date, status: string) => {
    if (!userId) {
      showError('Usuário não autenticado.');
      return;
    }

    const dateString = format(day, 'yyyy-MM-dd');
    const existingApontamento = getApontamentoForDay(day);

    const newApontamento: Apontamento = existingApontamento
      ? { ...existingApontamento, status, entry_time: undefined, exit_time: undefined } // Limpa o tempo ao definir status
      : {
          id: uuidv4(),
          user_id: userId,
          date: dateString,
          status,
          created_at: new Date(),
        };

    setIsSaving(true);
    try {
      const updated = await updateApontamento(newApontamento);
      updateApontamentoState(updated);
      showSuccess(`Dia marcado como ${status.split(':')[0]}!`);
    } catch (error) {
      showError('Erro ao marcar status.');
      console.error('Failed to set status:', error);
    } finally {
      setIsSaving(false);
    }
  }, [userId, apontamentos]);

  const handleOpenOtherStatusDialog = (day: Date) => {
    setDayForOtherStatus(day);
    const existing = getApontamentoForDay(day);
    const currentStatus = existing?.status || '';
    const match = currentStatus.match(/^Outros: (.*)/);
    setOtherStatusText(match ? match[1] : '');
    setIsDialogOpen(true);
  };

  const handleSaveOtherStatus = async () => {
    if (!dayForOtherStatus) return;
    const status = otherStatusText.trim() === '' ? 'Outros' : `Outros: ${otherStatusText.trim()}`;
    await handleStatusChange(dayForOtherStatus, status);
    setIsDialogOpen(false);
    setOtherStatusText('');
    setDayForOtherStatus(null);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setCurrentDate(newDate);
  };

  const calculateTotalHours = (entry?: string, exit?: string): string => {
    if (!entry || !exit) return '';
    
    try {
      const [entryH, entryM] = entry.split(':').map(Number);
      const [exitH, exitM] = exit.split(':').map(Number);

      let entryTime = setHours(setMinutes(new Date(), entryM), entryH);
      let exitTime = setHours(setMinutes(new Date(), exitM), exitH);

      // Se a hora de saída for anterior à de entrada, assume que passou da meia-noite
      if (exitTime.getTime() < entryTime.getTime()) {
        exitTime = addDays(exitTime, 1);
      }

      const diffMs = exitTime.getTime() - entryTime.getTime();
      if (diffMs < 0) return 'Inválido';

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return `${hours}h ${minutes}m`;
    } catch {
      return 'Inválido';
    }
  };

  const employeeHeader = useMemo(() => {
    const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    return profile?.badge && fullName
      ? `${profile.badge} - ${fullName}`
      : fullName || 'Usuário Não Identificado';
  }, [profile]);

  const monthYearTitle = useMemo(() => {
    return format(currentDate, 'MMMM yyyy', { locale: ptBR });
  }, [currentDate]);

  const formatListText = () => {
    // Novo formato desejado:
    // Linha 1: Outubro
    // Linha 2: 15042 - Valter Rogerio Paulino Mortagua Junior
    // Linha 3: 01/10 23:00 - 07:00
    // Linha 4: 04/10 Folga
    
    const monthName = format(currentDate, 'MMMM', { locale: ptBR });
    
    let text = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}\n`;
    text += `${employeeHeader}\n`;

    const currentMonthApontamentos = apontamentos
      .filter(a => {
        const date = parseISO(a.date);
        return date >= currentMonthStart && date <= currentMonthEnd;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    currentMonthApontamentos.forEach(a => {
      const day = format(parseISO(a.date), 'dd/MM');
      
      let line = `${day} `;

      if (a.status) {
        // Se tem status, usa o nome do status (ex: Folga, Falta, Suspensao, Outros: Férias)
        line += a.status.split(':')[0];
      } else {
        // Se não tem status, usa o formato de horas condensado
        const entry = a.entry_time ? a.entry_time.substring(0, 5) : ''; // Remove segundos
        const exit = a.exit_time ? a.exit_time.substring(0, 5) : ''; // Remove segundos
        
        if (entry && exit) {
          line += `${entry} - ${exit}`;
        } else if (entry) {
          line += `${entry} - `;
        } else if (exit) {
          line += ` - ${exit}`;
        } else {
          // Se não há status e nem horas, pula a linha (embora o filtro de apontamentos deva evitar isso)
          return;
        }
      }
      
      text += `${line}\n`;
    });

    return text.trim();
  };

  const handleCopyText = async () => {
    const textToCopy = formatListText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Apontamentos copiados para a área de transferência!');
    } catch (err) {
      showError('Erro ao copiar o texto.');
      console.error('Failed to copy text:', err);
    }
  };

  const handleShareOnWhatsApp = () => {
    const textToShare = formatListText();
    const encodedText = encodeURIComponent(textToShare);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
    showSuccess('Apontamentos prontos para compartilhar no WhatsApp!');
  };

  const handleExportPdf = () => {
    const monthName = format(currentDate, 'MMMM yyyy', { locale: ptBR });
    
    // O título para o PDF mantém o formato mais detalhado para o cabeçalho do documento
    const pdfTitle = `Apontamento de Horas - ${monthYearTitle}\n${employeeHeader}`;

    const currentMonthApontamentos = apontamentos
      .filter(a => {
        const date = parseISO(a.date);
        return date >= currentMonthStart && date <= currentMonthEnd;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    if (currentMonthApontamentos.length === 0) {
      showError('Nenhum apontamento para exportar neste mês.');
      return;
    }

    generateTimeTrackingPdf(currentMonthApontamentos, pdfTitle);
    showSuccess('PDF gerado com sucesso!');
  };

  const handleTurnChange = (turn: ShiftTurn) => {
    setSelectedTurn(turn);
    localStorage.setItem('selectedShiftTurn', turn);
  };

  const handleGenerateSchedule = async () => {
    if (!userId || !selectedTurn) {
      showError('Selecione um turno e faça login.');
      return;
    }

    setIsGeneratingSchedule(true);
    const loadingToastId = showLoading('Gerando escala e sincronizando...');

    try {
      const generatedApontamentos = generateMonthlyApontamentos(currentDate, selectedTurn, userId);
      
      // Filtra apenas os dias que não têm um apontamento manual (com status ou tempo)
      const existingDates = new Set(apontamentos.map(a => a.date));
      const newApontamentosToSave = generatedApontamentos.filter(genA => !existingDates.has(genA.date));

      if (newApontamentosToSave.length === 0) {
        showSuccess('A escala já está preenchida para este mês ou não há novos dias para preencher.');
        return;
      }

      // Salva no IndexedDB e sincroniza com o Supabase
      const syncPromises = newApontamentosToSave.map(a => updateApontamento(a));
      await Promise.all(syncPromises);

      showSuccess(`${newApontamentosToSave.length} dias da escala do ${selectedTurn} foram preenchidos!`);
      loadApontamentos(); // Recarrega todos os dados para atualizar a UI
    } catch (error) {
      showError('Erro ao gerar a escala de horários.');
      console.error('Failed to generate schedule:', error);
    } finally {
      dismissToast(loadingToastId);
      setIsGeneratingSchedule(false);
    }
  };

  const handleClearMonth = async () => {
    if (!userId) {
      showError('Usuário não autenticado.');
      return;
    }

    const loadingToastId = showLoading('Limpando apontamentos do mês...');
    try {
      const deletedCount = await deleteApontamentosByMonth(userId, currentMonthStart, currentMonthEnd);
      
      if (deletedCount > 0) {
        showSuccess(`${deletedCount} apontamentos de ${format(currentDate, 'MMMM', { locale: ptBR })} foram removidos!`);
      } else {
        showSuccess('Nenhum apontamento encontrado para limpar neste mês.');
      }
      
      loadApontamentos(); // Recarrega os dados
    } catch (error) {
      showError('Erro ao limpar apontamentos do mês.');
      console.error('Failed to clear month entries:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  if (isSessionLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4 mt-8">
          <div className="flex flex-col items-start">
            <h1 className="text-4xl font-extrabold text-primary dark:text-primary flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              Apontamento de Horas
            </h1>
            <p className="text-lg font-semibold text-foreground/70 mt-1">
              {employeeHeader}
            </p>
          </div>
          <Link to="/schedule-view">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Visualizar Escala Anual" className="h-10 w-10">
                  <CalendarDays className="h-8 w-8 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualizar Escala Anual</TooltipContent>
            </Tooltip>
          </Link>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl">Gerar Escala Automática</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor="shift-turn">Selecione seu Turno</Label>
              <Select value={selectedTurn} onValueChange={handleTurnChange} disabled={isGeneratingSchedule}>
                <SelectTrigger id="shift-turn" className="w-full">
                  <SelectValue placeholder="Selecione o Turno" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TURNS.map(turn => (
                    <SelectItem key={turn} value={turn}>{turn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2 w-full sm:w-auto" disabled={isSaving || isGeneratingSchedule}>
                    <Eraser className="h-4 w-4" /> Limpar Mês
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover TODOS os apontamentos para o mês de {format(currentDate, 'MMMM yyyy', { locale: ptBR })}. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearMonth}>Limpar Mês</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                onClick={handleGenerateSchedule} 
                disabled={!selectedTurn || isGeneratingSchedule || isSaving}
                className="w-full sm:w-auto"
              >
                {isGeneratingSchedule ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarCheck className="mr-2 h-4 w-4" />
                )}
                Gerar Escala
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => handleMonthChange('prev')} size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl font-semibold capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" onClick={() => handleMonthChange('next')} size="icon">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* NOVO LOCAL PARA OS BOTÕES DE AÇÃO - FORMATO ALINHADO À DIREITA */}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button onClick={handleCopyText} className="flex items-center gap-2">
                <Copy className="h-4 w-4" /> Copiar Texto
              </Button>
              <Button 
                onClick={handleShareOnWhatsApp} 
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-full" 
                aria-label="Compartilhar no WhatsApp" 
              >
                <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-full w-full" />
              </Button>
              <Button onClick={handleExportPdf} className="flex items-center gap-2">
                <Download className="h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Dia</TableHead>
                    <TableHead className="w-auto min-w-[200px]">Entrada / Status</TableHead>
                    <TableHead className="w-[100px]">Total</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysInMonth.map((day) => {
                    const apontamento = getApontamentoForDay(day);
                    const dateString = format(day, 'yyyy-MM-dd');
                    const dayName = format(day, 'EEE', { locale: ptBR });
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                    const hasStatus = !!apontamento?.status;
                    
                    const statusKey = hasStatus ? (apontamento.status.includes('Outros') ? 'Outros' : apontamento.status) : null;
                    const statusInfo = statusKey ? STATUS_MAP[statusKey as keyof typeof STATUS_MAP] : null;
                    const StatusIcon = statusInfo?.icon;
                    const statusDisplayName = statusInfo?.displayName || 'Status';
                    const statusDescription = apontamento?.status?.includes(':') ? apontamento.status.split(': ')[1] : '';

                    return (
                      <TableRow key={dateString} className={isWeekend ? 'bg-muted/50' : ''}>
                        <TableCell className="font-medium">
                          {format(day, 'dd/MM')} ({dayName})
                        </TableCell>
                        
                        {/* Coluna de Entrada / Status */}
                        <TableCell className="space-y-2">
                          {hasStatus ? (
                            <div className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-md",
                              statusInfo?.bgColor
                            )}>
                              <div className="flex items-center gap-2">
                                {StatusIcon && <StatusIcon className={cn("h-5 w-5", statusInfo?.color)} />}
                                <span className={cn("font-semibold", statusInfo?.color)}>
                                  {statusDisplayName}
                                </span>
                              </div>
                              {statusDescription && (
                                <span className="text-xs text-muted-foreground mt-1 text-center">
                                  {statusDescription}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="flex-1">
                                <Label htmlFor={`entry-${dateString}`} className="sr-only">Entrada</Label>
                                <Input
                                  id={`entry-${dateString}`}
                                  type="time"
                                  value={apontamento?.entry_time || ''}
                                  onChange={(e) => handleTimeChange(day, 'entry_time', e.target.value)}
                                  disabled={isSaving}
                                />
                              </div>
                              <div className="flex-1">
                                <Label htmlFor={`exit-${dateString}`} className="sr-only">Saída</Label>
                                <Input
                                  id={`exit-${dateString}`}
                                  type="time"
                                  value={apontamento?.exit_time || ''}
                                  onChange={(e) => handleTimeChange(day, 'exit_time', e.target.value)}
                                  disabled={isSaving}
                                />
                              </div>
                            </div>
                          )}
                        </TableCell>

                        {/* Coluna Total */}
                        <TableCell className="font-semibold text-sm">
                          {hasStatus ? statusDisplayName : calculateTotalHours(apontamento?.entry_time, apontamento?.exit_time)}
                        </TableCell>

                        {/* Coluna Ações */}
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            {hasStatus ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClearStatus(day)}
                                disabled={isSaving}
                                aria-label="Reverter para Horas"
                              >
                                <Clock3 className="h-4 w-4 text-primary" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(day, 'Folga')}
                                disabled={isSaving}
                                className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                              >
                                Folga
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isSaving}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStatusChange(day, 'Falta')} disabled={hasStatus}>
                                  Falta
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(day, 'Suspensao')} disabled={hasStatus}>
                                  Suspensão
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenOtherStatusDialog(day)} disabled={hasStatus}>
                                  Outros...
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {apontamento && (
                                  <DropdownMenuItem onClick={() => handleDeleteApontamento(apontamento.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir Registro
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />

      {/* Dialog para Outros Status */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Marcar Outro Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="other-status">Descrição (Ex: Férias, Atestado)</Label>
            <Textarea
              id="other-status"
              value={otherStatusText}
              onChange={(e) => setOtherStatusText(e.target.value)}
              placeholder="Descreva o motivo da marcação"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button type="button" onClick={handleSaveOtherStatus} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" /> Salvar Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;