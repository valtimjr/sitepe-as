"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter, Search, Clock, FileDown, User as UserIcon, Tag, Loader2 } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator'; // Importar Separator
import { cn } from '@/lib/utils';
import { DailyServiceOrder, UserProfile } from '@/types/supabase';
import { fetchDailyServiceOrders, calculateDurationInMinutes, formatMinutesToHoursAndMinutes } from '@/services/dailyServiceOrderService';
import { getAllUserProfiles } from '@/services/userService';
import { useSession } from '@/components/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { lazyGenerateServiceOrderPdf } from '@/utils/pdfExportUtils';
import DailyServiceOrderTable from '@/components/DailyServiceOrderTable'; // Importar DailyServiceOrderTable
import { DateRange } from 'react-day-picker'; // Importar DateRange

interface ServiceOrderReportsTabProps {
  isEmbedded?: boolean;
}

const ServiceOrderReportsTab: React.FC<ServiceOrderReportsTabProps> = ({ isEmbedded = false }) => {
  const { user, profile, isLoading: isSessionLoading } = useSession();
  const [reports, setReports] = useState<DailyServiceOrder[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allAfs, setAllAfs] = useState<string[]>([]); // Lista de todos os AFs únicos encontrados

  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // Alterado para DateRange | undefined
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedAfNumber, setSelectedAfNumber] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isAdminOrModerator = profile?.role === 'admin' || profile?.role === 'moderator';

  const loadReports = useCallback(async () => {
    if (!user) return;
    setIsLoadingReports(true);
    try {
      const filters: any = {};
      if (selectedDate) {
        filters.startDate = startOfDay(selectedDate);
        filters.endDate = endOfDay(selectedDate);
      } else if (dateRange?.from) { // Acessa dateRange.from com segurança
        filters.startDate = startOfDay(dateRange.from);
        if (dateRange.to) {
          filters.endDate = endOfDay(dateRange.to);
        }
      } else if (selectedMonth) {
        filters.startDate = startOfMonth(selectedMonth);
        filters.endDate = endOfMonth(selectedMonth);
      }

      if (selectedUserId) {
        filters.user_id = selectedUserId;
      }

      if (selectedAfNumber) {
        filters.af_number = selectedAfNumber;
      }

      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      const fetchedReports = await fetchDailyServiceOrders(filters);
      setReports(fetchedReports);

      // Extrai todos os AFs únicos para o filtro de AF
      const uniqueAfs = new Set<string>();
      fetchedReports.forEach(report => {
        report.os_list.forEach(osEntry => {
          uniqueAfs.add(osEntry.af);
        });
      });
      setAllAfs(Array.from(uniqueAfs).sort());

    } catch (error) {
      showError('Erro ao carregar relatórios de ordens de serviço.');
      console.error('Failed to load service order reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  }, [user, selectedDate, dateRange, selectedMonth, selectedUserId, selectedAfNumber, searchQuery]);

  useEffect(() => {
    if (!isSessionLoading && user) {
      loadReports();
      if (isAdminOrModerator) {
        getAllUserProfiles().then(setAllUsers).catch(e => console.error('Failed to load all user profiles:', e));
      } else {
        // Se não for admin/moderador, o filtro de usuário é sempre o próprio
        setSelectedUserId(user.id);
      }
    }
  }, [isSessionLoading, user, isAdminOrModerator, loadReports]);

  const handleApplyFilters = () => {
    loadReports();
  };

  const handleClearFilters = () => {
    setSelectedDate(undefined);
    setDateRange(undefined); // Limpa para undefined
    setSelectedMonth(undefined);
    setSelectedUserId(user?.id); // Volta para o próprio usuário se não for admin/moderador
    setSelectedAfNumber(undefined);
    setSearchQuery('');
    loadReports(); // Recarrega com filtros limpos
  };

  const totalDurationInMinutes = useMemo(() => {
    let total = 0;
    reports.forEach(dailyOrder => {
      dailyOrder.os_list.forEach(osEntry => {
        total += calculateDurationInMinutes(osEntry.hora_inicio, osEntry.hora_final);
      });
    });
    return total;
  }, [reports]);

  const handleExportPdf = async () => {
    if (reports.length === 0) {
      showError('Nenhum relatório para exportar.');
      return;
    }

    const pdfTitle = `Relatório de Ordens de Serviço\n${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
    
    // A função de PDF precisa de um formato agrupado por OS, não por dia.
    // Vamos reestruturar os dados para o PDF.
    const groupedForPdf: any[] = [];
    reports.forEach(dailyOrder => {
      dailyOrder.os_list.forEach(osEntry => {
        groupedForPdf.push({
          af: osEntry.af,
          os: osEntry.os,
          hora_inicio: osEntry.hora_inicio,
          hora_final: osEntry.hora_final,
          servico_executado: osEntry.servico_executado,
          parts: osEntry.parts,
          createdAt: parseISO(osEntry.created_at), // Converte para Date
          date: dailyOrder.date, // Adiciona a data do registro diário
          user_name: dailyOrder.user_name,
          user_badge: dailyOrder.user_badge,
        });
      });
    });

    // Ordena os itens para o PDF (ex: por data, depois por hora de início)
    groupedForPdf.sort((a, b) => {
      const dateComparison = parseISO(a.date).getTime() - parseISO(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      // Comparação de hora de início (assumindo HH:MM)
      const timeA = a.hora_inicio ? parseInt(a.hora_inicio.replace(':', '')) : 0;
      const timeB = b.hora_inicio ? parseInt(b.hora_inicio.replace(':', '')) : 0;
      return timeA - timeB;
    });

    await lazyGenerateServiceOrderPdf(groupedForPdf, pdfTitle);
    showSuccess('PDF do relatório gerado com sucesso!');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Filter className="h-6 w-6" /> Relatórios de Ordens de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Filtro por Data Específica */}
          <div className="space-y-2">
            <Label htmlFor="filter-date">Data Específica</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDateRange(undefined); // Limpa range e mês
                    setSelectedMonth(undefined);
                  }}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro por Intervalo de Datas */}
          <div className="space-y-2">
            <Label htmlFor="filter-date-range">Intervalo de Datas</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange?.from && "text-muted-foreground" // Acessa dateRange.from com segurança
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? ( // Acessa dateRange.from com segurança
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "PPP", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "PPP", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "PPP", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione um intervalo</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range); // Passa o range diretamente
                    setSelectedDate(undefined); // Limpa data específica e mês
                    setSelectedMonth(undefined);
                  }}
                  numberOfMonths={2}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro por Mês */}
          <div className="space-y-2">
            <Label htmlFor="filter-month">Mês</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedMonth ? format(selectedMonth, "MMMM yyyy", { locale: ptBR }) : <span>Selecione um mês</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown-buttons"
                  selected={selectedMonth}
                  onSelect={(date) => {
                    setSelectedMonth(date);
                    setSelectedDate(undefined); // Limpa data específica e range
                    setDateRange(undefined); // Limpa para undefined
                  }}
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 5}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro por Funcionário */}
          {isAdminOrModerator && (
            <div className="space-y-2">
              <Label htmlFor="filter-user">Funcionário</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="filter-user">
                  <SelectValue placeholder="Todos os Funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined}>Todos os Funcionários</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.badge ? `${u.badge} - ${u.first_name} ${u.last_name}` : `${u.first_name} ${u.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro por AF */}
          <div className="space-y-2">
            <Label htmlFor="filter-af">AF (Número de Frota)</Label>
            <Select
              value={selectedAfNumber}
              onValueChange={setSelectedAfNumber}
            >
              <SelectTrigger id="filter-af">
                <SelectValue placeholder="Todos os AFs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>Todos os AFs</SelectItem>
                {allAfs.map(af => (
                  <SelectItem key={af} value={af}>{af}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo de Busca Geral */}
          <div className="space-y-2">
            <Label htmlFor="search-query">Buscar (OS, Serviço, Peça)</Label>
            <Input
              id="search-query"
              type="text"
              placeholder="Buscar em OS, serviço, peças..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters} disabled={isLoadingReports}>
            <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros
          </Button>
        </div>

        <Separator />

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Carregando relatórios...</p>
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum relatório encontrado com os filtros aplicados.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" /> Tempo Total: {formatMinutesToHoursAndMinutes(totalDurationInMinutes)}
              </h3>
              <Button onClick={handleExportPdf} variant="outline">
                <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
            </div>
            <DailyServiceOrderTable reports={reports} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceOrderReportsTab;