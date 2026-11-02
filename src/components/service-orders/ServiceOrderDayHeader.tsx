import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ServiceOrderCharts } from '@/components/ServiceOrderCharts';
import { ServiceOrderData } from '@/services/partListService';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { cn, formatDuration } from '@/lib/utils';

interface DailyTimes {
  osMinutes: number;
  percursoMinutes: number;
  waitingMinutes: number;
  totalMinutes: number;
}

interface ServiceOrderDayHeaderProps {
  selectedDate: Date;
  isToday: boolean;
  showDateNav: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (date: Date | undefined) => void;
  osList: ServiceOrderData[];
  dailyTimes: DailyTimes;
  selectedCount: number;
  allSelected: boolean;
  onShare: () => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

/** Cabeçalho fixo do dia (celular): título, ações, navegação de data e resumo. */
const ServiceOrderDayHeader: React.FC<ServiceOrderDayHeaderProps> = ({
  selectedDate,
  isToday,
  showDateNav,
  onPrev,
  onNext,
  onToday,
  onDateChange,
  osList,
  dailyTimes,
  selectedCount,
  allSelected,
  onShare,
  onClearSelection,
  onSelectAll,
}) => {
  // Acompanha o header do app, que se esconde ao rolar
  const appHeaderHidden = useHideOnScroll();
  const dateLabel = format(selectedDate, "EEE, dd 'de' MMMM", { locale: ptBR });
  const showSummary = osList.length > 0 || dailyTimes.waitingMinutes > 0;

  const summary = [
    { label: 'OS', value: dailyTimes.osMinutes, className: 'text-blue-600 dark:text-blue-400' },
    { label: 'Percurso', value: dailyTimes.percursoMinutes, className: 'text-red-600 dark:text-red-400' },
    { label: 'Espera', value: dailyTimes.waitingMinutes, className: 'text-green-600 dark:text-green-400' },
    { label: 'Total', value: dailyTimes.totalMinutes, className: 'text-slate-800 dark:text-slate-200' },
  ];

  return (
    <div
      className="sticky z-30 -mx-4 -mt-4 mb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-2 pb-2 transition-[top] duration-300 ease-out"
      style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      data-testid="os-day-header"
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-primary truncate">Ordens de Serviço</h1>
        <div className="flex items-center gap-2 shrink-0">
          <ServiceOrderCharts osList={osList} currentDate={selectedDate} />
          <Button
            variant="outline"
            className="relative h-10 px-3 text-primary border-primary/30"
            onClick={onShare}
            aria-label="Compartilhar"
            data-testid="os-share-button"
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Compartilhar
            {selectedCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow"
                data-testid="os-share-count"
              >
                {selectedCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {showDateNav && (
        <div className="mt-1.5 flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onPrev} aria-label="Dia anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 flex-1 min-w-0 px-2 font-semibold text-base capitalize"
                data-testid="os-date-label"
              >
                <span className="truncate">{dateLabel}</span>
                <ChevronDown className="h-4 w-4 ml-1 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar mode="single" selected={selectedDate} onSelect={onDateChange} locale={ptBR} initialFocus />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onNext} aria-label="Próximo dia">
            <ChevronRight className="h-5 w-5" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={onToday}>
              Hoje
            </Button>
          )}
        </div>
      )}

      {showSummary && (
        <div
          className="mt-1.5 -mx-4 px-4 flex gap-4 overflow-x-auto no-scrollbar text-sm whitespace-nowrap"
          data-no-swipe
          data-testid="os-day-summary"
        >
          {summary.map(item => (
            <span key={item.label} className="shrink-0">
              <span className="text-muted-foreground text-xs uppercase font-semibold mr-1">{item.label}</span>
              <span className={cn('font-extrabold tabular-nums', item.className)}>{formatDuration(item.value)}</span>
            </span>
          ))}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-sm" data-testid="os-selection-bar">
          <span className="font-semibold text-blue-700 dark:text-blue-400">
            {selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <span className="text-muted-foreground">·</span>
          <Button variant="link" size="sm" className="h-8 px-1" onClick={onClearSelection}>
            Limpar
          </Button>
          {!allSelected && (
            <>
              <span className="text-muted-foreground">·</span>
              <Button variant="link" size="sm" className="h-8 px-1" onClick={onSelectAll}>
                Selecionar todas
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDayHeader;
