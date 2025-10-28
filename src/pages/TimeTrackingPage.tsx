import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, setHours, setMinutes, addDays, subMonths, addMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Apontamento, getApontamentos, updateApontamento, deleteApontamento, deleteApontamentosByMonth } from '@/services';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { generateMonthlyApontamentos, ShiftTurn } from '@/services/shiftService';
import { v4 as uuidv4 } from 'uuid';
import { ALL_TURNS } from '@/services/shiftService';

// Importando os novos componentes modulares
import TimeTrackingHeader from '@/components/time-tracking/TimeTrackingHeader';
import ScheduleGeneratorForm from '@/components/time-tracking/ScheduleGeneratorForm';
import TimeTrackingTable from '@/components/time-tracking/TimeTrackingTable';
import OtherStatusDialog from '@/components/time-tracking/OtherStatusDialog';
import { generateTimeTrackingPdf } from '@/lib/pdfGenerator';


const TimeTrackingPage: React.FC = () => {
  const { user, profile, isLoading: isSessionLoading } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [otherStatusText, setOtherStatusText] = useState('');
  const [dayForOtherStatus, setDayForOtherStatus] = useState<Date | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<ShiftTurn | undefined>(undefined);
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
      // Define o primeiro turno como padrão se nenhum estiver salvo
      setSelectedTurn(ALL_TURNS[0]);
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

  const calculateTotalHours = useCallback((entry?: string, exit?: string): string => {
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

  const employeeHeader = useMemo(() => {
    const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    return profile?.badge && fullName
      ? `${profile.badge} - ${fullName}`
      : fullName || 'Usuário Não Identificado';
  }, [profile]);

  const monthYearTitle = useMemo(() => {
    return format(currentDate, 'MMMM yyyy', { locale: ptBR });
  }, [currentDate]);

  const formatListText = useCallback(() => {
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
        line += a.status.split(':')[0];
      } else {
        const entry = a.entry_time ? a.entry_time.substring(0, 5) : '';
        const exit = a.exit_time ? a.exit_time.substring(0, 5) : '';
        
        if (entry && exit) {
          line += `${entry} - ${exit}`;
        } else if (entry) {
          line += `${entry} - `;
        } else if (exit) {
          line += ` - ${exit}`;
        } else {
          return;
        }
      }
      
      text += `${line}\n`;
    });

    return text.trim();
  }, [currentDate, employeeHeader, apontamentos, currentMonthStart, currentMonthEnd]);

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
        
        <TimeTrackingHeader employeeHeader={employeeHeader} />

        <ScheduleGeneratorForm
          currentDate={currentDate}
          selectedTurn={selectedTurn}
          isGeneratingSchedule={isGeneratingSchedule}
          isSaving={isSaving}
          handleTurnChange={handleTurnChange}
          handleGenerateSchedule={handleGenerateSchedule}
          handleClearMonth={handleClearMonth}
        />

        <TimeTrackingTable
          currentDate={currentDate}
          daysInMonth={daysInMonth}
          apontamentos={apontamentos}
          monthYearTitle={monthYearTitle}
          isSaving={isSaving}
          handleMonthChange={handleMonthChange}
          handleCopyText={handleCopyText}
          handleShareOnWhatsApp={handleShareOnWhatsApp}
          handleExportPdf={handleExportPdf}
          handleTimeChange={handleTimeChange}
          handleClearStatus={handleClearStatus}
          handleStatusChange={handleStatusChange}
          handleOpenOtherStatusDialog={handleOpenOtherStatusDialog}
          handleDeleteApontamento={handleDeleteApontamento}
          calculateTotalHours={calculateTotalHours}
        />
      </div>
      <MadeWithDyad />

      <OtherStatusDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        otherStatusText={otherStatusText}
        setOtherStatusText={setOtherStatusText}
        handleSaveOtherStatus={handleSaveOtherStatus}
        isSaving={isSaving}
      />
    </div>
  );
};

export default TimeTrackingPage;