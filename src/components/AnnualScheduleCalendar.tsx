import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROTATING_TURNS_ONLY, getShiftSchedule, ShiftTurn } from '@/services/shiftService';
import { 
  format, 
  startOfYear, 
  endOfYear, 
  eachDayOfInterval, 
  getMonth, 
  getYear, 
  isToday, 
  endOfMonth,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

// Mapeamento de cores para os tipos de escala
const SCHEDULE_COLORS: { [key: string]: string } = {
  'Dia': 'bg-green-500 hover:bg-green-600',
  'Intermediario': 'bg-yellow-500 hover:bg-yellow-600',
  'Noite': 'bg-blue-500 hover:bg-blue-600',
  'Folga': 'bg-red-500 hover:bg-red-600',
  'Turno Dia 07:00 - 17:00': 'bg-green-700 hover:bg-green-800',
  'Turno Dia 07:30 - 17:00': 'bg-green-700 hover:bg-green-800',
};

// Mapeamento de nomes de escala para exibição
const SCHEDULE_DISPLAY_NAMES: { [key: string]: string } = {
  'Dia': 'Dia',
  'Intermediario': 'Interm.',
  'Noite': 'Noite',
  'Folga': 'Folga',
  'Turno Dia 07:00 - 17:00': 'Fixo 07-17',
  'Turno Dia 07:30 - 17:00': 'Fixo 07:30-17',
};

// Definição da Legenda para Turnos Rotativos (SIMPLIFICADA)
const ROTATING_LEGEND = [
  { type: 'Dia', label: 'Turno Dia' },
  { type: 'Intermediario', label: 'Turno Interm.' },
  { type: 'Noite', label: 'Turno Noite' },
  { type: 'Folga', label: 'Folga' },
];

// Definição da Legenda para Turnos Fixos (SIMPLIFICADA)
const FIXED_LEGEND = [
  { type: 'Turno Dia 07:00 - 17:00', label: 'Fixo 07:00 - 17:00' },
  { type: 'Turno Dia 07:30 - 17:00', label: 'Fixo 07:30 - 17:00' },
  { type: 'Folga', label: 'Folga' },
];

interface AnnualScheduleCalendarProps {
  initialTurn: ShiftTurn;
  onTurnChange: (turn: ShiftTurn) => void;
}

const AnnualScheduleCalendar: React.FC<AnnualScheduleCalendarProps> = ({ initialTurn, onTurnChange }) => {
  // Garante que selectedTurn seja sempre um ShiftTurn válido
  const [selectedTurn, setSelectedTurn] = useState<ShiftTurn>(initialTurn);
  const [currentYear, setCurrentYear] = useState(getYear(new Date()));
  const [isExporting, setIsExporting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Garante que o turno inicial seja um dos turnos rotativos se o anterior era fixo
    // E que o estado local reflita o prop inicial
    if (!ROTATING_TURNS_ONLY.includes(initialTurn)) {
      const defaultTurn = ROTATING_TURNS_ONLY[0];
      setSelectedTurn(defaultTurn);
      onTurnChange(defaultTurn);
    } else {
      setSelectedTurn(initialTurn);
    }
  }, [initialTurn, onTurnChange]);

  const handleTurnChange = (turn: ShiftTurn) => {
    setSelectedTurn(turn);
    onTurnChange(turn);
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => prev + (direction === 'next' ? 1 : -1));
  };

  const yearStart = useMemo(() => startOfYear(new Date(currentYear, 0, 1)), [currentYear]);
  const yearEnd = useMemo(() => endOfYear(new Date(currentYear, 0, 1)), [currentYear]);
  const daysInYear = useMemo(() => eachDayOfInterval({ start: yearStart, end: yearEnd }), [yearStart, yearEnd]);

  const scheduleData = useMemo(() => {
    const data: { [key: number]: { [key: number]: { type: string; time: string } } } = {}; // monthIndex -> dayOfMonth -> schedule

    daysInYear.forEach(day => {
      const monthIndex = getMonth(day);
      const dayOfMonth = Number(format(day, 'd'));
      
      const schedule = getShiftSchedule(day, selectedTurn);
      
      let type: string;
      let time: string = '';

      if (schedule.status === 'Folga') {
        type = 'Folga';
      } else if (schedule.entry && schedule.exit) {
        time = `${schedule.entry}-${schedule.exit}`;
        
        // Usa o nome da escala retornado pelo serviço
        type = schedule.shiftName; 

        // REGRA ESPECÍFICA 1: Intermediario com horário noturno (Sáb/Dom) deve ser azul (Noite)
        if (type === 'Intermediario' && time === '19:00-07:00') {
          type = 'Noite';
        }
        
        // REGRA ESPECÍFICA 2: Noite com horário diurno (Domingo) deve ser verde (Dia)
        if (type === 'Noite' && time === '07:00-19:00') {
          type = 'Dia';
        }

      } else {
        type = 'Outros';
      }

      if (!data[monthIndex]) {
        data[monthIndex] = {};
      }
      data[monthIndex][dayOfMonth] = { type, time };
    });

    return data;
  }, [daysInYear, selectedTurn]);

  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));

  const renderMonth = (monthStart: Date) => {
    const monthIndex = getMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
    const firstDayOfWeek = getDay(monthStart); // 0 = Dom, 1 = Seg

    // Cria células vazias para preencher o início da semana
    const emptyCells = Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`empty-${i}`} className="h-6 w-6" />);

    return (
      <div key={monthIndex} className="p-2 border rounded-lg shadow-sm bg-white dark:bg-gray-800"> {/* Adicionado fundo branco/escuro explícito */}
        <h3 className="text-center font-semibold mb-2 text-sm">
          {format(monthStart, 'MMM', { locale: ptBR })}
        </h3>
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className={cn("text-center font-medium", i === 0 || i === 6 ? 'text-red-500 dark:text-red-400' : '')}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptyCells}
          {daysInMonth.map(day => {
            const dayOfMonth = Number(format(day, 'd'));
            const schedule = scheduleData[monthIndex]?.[dayOfMonth];
            const isCurrentDay = isToday(day);
            
            const scheduleType = schedule?.type || 'Outros';
            const colorClass = SCHEDULE_COLORS[scheduleType] || 'bg-gray-300 hover:bg-gray-400';
            const displayName = SCHEDULE_DISPLAY_NAMES[scheduleType] || '?';
            const time = schedule?.time || '';

            return (
              <Tooltip key={dayOfMonth}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full text-xs font-medium text-white cursor-default transition-colors duration-100 grid place-items-center", // Usando grid place-items-center para centralização robusta
                      colorClass,
                      isCurrentDay && 'ring-2 ring-offset-1 ring-primary dark:ring-primary',
                    )}
                  >
                    {dayOfMonth}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">{format(day, 'dd/MM/yyyy')}</p>
                  <p>Escala: {displayName}</p>
                  {time && <p>Horário: {time}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  };

  const exportCalendar = async (formatType: 'pdf' | 'jpg') => {
    if (!calendarRef.current) return;

    setIsExporting(true);
    const loadingToastId = showLoading(`Gerando arquivo ${formatType.toUpperCase()}...`);

    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2, // Aumenta a escala para melhor qualidade
        useCORS: true,
        backgroundColor: '#ffffff', // Força o fundo branco para evitar problemas de transparência/tema escuro
        logging: false,
        allowTaint: true,
      });

      const filename = `Escala_Anual_${selectedTurn.replace(/\s/g, '_')}_${currentYear}`;

      if (formatType === 'jpg') {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${filename}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess('Exportação JPG concluída!');
      } else if (formatType === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        const doc = new jsPDF('p', 'mm', 'a4');
        let position = 0;

        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        doc.save(`${filename}.pdf`);
        showSuccess('Exportação PDF concluída!');
      }
    } catch (error) {
      showError('Erro ao exportar o calendário.');
      console.error('Export error:', error);
    } finally {
      dismissToast(loadingToastId);
      setIsExporting(false);
    }
  };

  const currentLegend = ROTATING_TURNS_ONLY.includes(selectedTurn) ? ROTATING_LEGEND : FIXED_LEGEND;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex justify-between items-center">
          Visualização da Escala Anual
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleYearChange('prev')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-xl font-bold">{currentYear}</span>
            <Button variant="ghost" size="icon" onClick={() => handleYearChange('next')}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Label htmlFor="shift-turn" className="shrink-0">Selecione o Turno:</Label>
            <Select value={selectedTurn} onValueChange={handleTurnChange}>
              <SelectTrigger id="shift-turn" className="w-full sm:w-[200px]">
                <SelectValue placeholder="Selecione o Turno" />
              </SelectTrigger>
              <SelectContent>
                {ROTATING_TURNS_ONLY.map(turn => (
                  <SelectItem key={turn} value={turn}>{turn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => exportCalendar('pdf')} 
              disabled={isExporting}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Exportar PDF
            </Button>
            <Button 
              onClick={() => exportCalendar('jpg')} 
              disabled={isExporting}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Exportar JPG
            </Button>
          </div>
        </div>

        {/* Legenda Simplificada */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="text-sm font-semibold mb-2">Legenda de Escalas:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {currentLegend.map(({ type, label }) => {
              const colorClass = SCHEDULE_COLORS[type] || 'bg-gray-300';
              // Usando o nome da escala (Dia, Interm., Noite, Folga) para a exibição simplificada
              const simpleLabel = SCHEDULE_DISPLAY_NAMES[type] || label;
              
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("h-4 w-4 rounded-full shrink-0", colorClass)} />
                  <span className="text-muted-foreground">{simpleLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendário com Responsividade Aprimorada */}
        <div ref={calendarRef} className="p-0 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {months.map(renderMonth)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnualScheduleCalendar;