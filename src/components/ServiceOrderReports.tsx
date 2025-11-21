"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Search, Filter, Clock, User as UserIcon, Tag, Loader2, CalendarDays, ArrowRight } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isValid, differenceInMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { getServiceOrderReports, Af } from '@/services/partListService';
import { DailyServiceOrderEntry, DailyServiceOrder, UserProfile } from '@/types/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface ServiceOrderReportsProps {
  // No props needed for now, as it fetches its own data
}

const ServiceOrderReports: React.FC<ServiceOrderReportsProps> = () => {
  const { user, profile, isLoading: isSessionLoading, checkPageAccess } = useSession();
  const isMobile = useIsMobile();

  const [reportData, setReportData] = useState<DailyServiceOrderEntry[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Filter states
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);
  const [filterMonth, setFilterMonth] = useState<Date | undefined>(undefined);
  const [filterAf, setFilterAf] = useState('');
  const [filterUser, setFilterUser] = useState<string | undefined>(undefined); // user_id
  const [filterUserBadge, setFilterUserBadge] = useState('');
  const [filterUserName, setFilterUserName] = useState('');

  // Data for select filters
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [availableAfs, setAvailableAfs] = useState<Af[]>([]);

  const isAdminOrModerator = useMemo(() => {
    return profile?.role === 'admin' || profile?.role === 'moderator';
  }, [profile]);

  // Fetch available users (for admin/moderator)
  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdminOrModerator) {
        const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, badge');
        if (error) {
          console.error('Error fetching users for filter:', error);
          showError('Erro ao carregar lista de usuários para filtro.');
        } else {
          setAvailableUsers(data as UserProfile[]);
        }
      }
    };
    fetchUsers();
  }, [isAdminOrModerator]);

  // Fetch available AFs
  useEffect(() => {
    const fetchAfs = async () => {
      const { data, error } = await supabase.from('afs').select('af_number').order('af_number', { ascending: true });
      if (error) {
        console.error('Error fetching AFs for filter:', error);
        showError('Erro ao carregar lista de AFs para filtro.');
      } else {
        setAvailableAfs(data as Af[]);
      }
    };
    fetchAfs();
  }, []);

  const fetchReportData = useCallback(async () => {
    if (isSessionLoading) return;

    setIsLoadingReports(true);
    try {
      const filters: any = {};

      // Apply user filter based on role
      if (!isAdminOrModerator && user) {
        filters.userId = user.id;
      } else if (isAdminOrModerator && filterUser) {
        filters.userId = filterUser;
      }

      if (filterDate) {
        filters.date = format(filterDate, 'yyyy-MM-dd');
      } else if (filterStartDate && filterEndDate) {
        filters.startDate = format(filterStartDate, 'yyyy-MM-dd');
        filters.endDate = format(filterEndDate, 'yyyy-MM-dd');
      } else if (filterMonth) {
        filters.month = format(filterMonth, 'yyyy-MM');
      }

      if (filterAf) {
        filters.af = filterAf;
      }
      if (filterUserBadge) {
        filters.userBadge = filterUserBadge;
      }
      if (filterUserName) {
        filters.userName = filterUserName;
      }

      const data = await getServiceOrderReports(filters);
      setReportData(data);
    } catch (error) {
      showError('Erro ao carregar relatórios de ordens de serviço.');
      setReportData([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, [isSessionLoading, user, isAdminOrModerator, filterDate, filterStartDate, filterEndDate, filterMonth, filterAf, filterUser, filterUserBadge, filterUserName]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const calculateTotalTime = useMemo(() => {
    let totalMinutes = 0;

    reportData.forEach(entry => {
      entry.os_list.forEach(osItem => {
        if (osItem.hora_inicio && osItem.hora_final) {
          try {
            const [startH, startM] = osItem.hora_inicio.split(':').map(Number);
            const [endH, endM] = osItem.hora_final.split(':').map(Number);

            let startTime = setHours(setMinutes(new Date(), startM), startH);
            let endTime = setHours(setMinutes(new Date(), endM), endH);

            // Handle overnight shifts
            if (endTime < startTime) {
              endTime = addDays(endTime, 1);
            }

            totalMinutes += differenceInMinutes(endTime, startTime);
          } catch (e) {
            console.warn('Invalid time format in OS item:', osItem, e);
          }
        }
      });
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  }, [reportData]);

  if (isSessionLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando...</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Relatórios de Ordens de Serviço</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Filter by Date */}
          <div className="space-y-2">
            <Label htmlFor="filter-date">Data Específica</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filter by Date Range */}
          <div className="space-y-2">
            <Label>Intervalo de Datas</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filterStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterStartDate ? format(filterStartDate, "PPP", { locale: ptBR }) : <span>Início</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterStartDate}
                    onSelect={setFilterStartDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filterEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterEndDate ? format(filterEndDate, "PPP", { locale: ptBR }) : <span>Fim</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterEndDate}
                    onSelect={setFilterEndDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filter by Month */}
          <div className="space-y-2">
            <Label htmlFor="filter-month">Mês</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterMonth ? format(filterMonth, "MMMM yyyy", { locale: ptBR }) : <span>Selecione um mês</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  captionLayout="dropdown-buttons"
                  selected={filterMonth}
                  onSelect={setFilterMonth}
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 5}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filter by AF */}
          <div className="space-y-2">
            <Label htmlFor="filter-af">AF (Número de Frota)</Label>
            <Select value={filterAf} onValueChange={setFilterAf}>
              <SelectTrigger id="filter-af">
                <SelectValue placeholder="Todos os AFs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os AFs</SelectItem>
                {availableAfs.map(af => (
                  <SelectItem key={af.id} value={af.af_number}>{af.af_number} {af.descricao ? `- ${af.descricao}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter by User (only for Admin/Moderator) */}
          {isAdminOrModerator && (
            <div className="space-y-2">
              <Label htmlFor="filter-user">Funcionário</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger id="filter-user">
                  <SelectValue placeholder="Todos os Funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os Funcionários</SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.badge ? `${u.badge} - ` : ''}{u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filter by User Badge (for all) */}
          <div className="space-y-2">
            <Label htmlFor="filter-user-badge">Crachá do Funcionário</Label>
            <Input
              id="filter-user-badge"
              type="text"
              value={filterUserBadge}
              onChange={(e) => setFilterUserBadge(e.target.value)}
              placeholder="Filtrar por crachá"
            />
          </div>

          {/* Filter by User Name (for all) */}
          <div className="space-y-2">
            <Label htmlFor="filter-user-name">Nome do Funcionário</Label>
            <Input
              id="filter-user-name"
              type="text"
              value={filterUserName}
              onChange={(e) => setFilterUserName(e.target.value)}
              placeholder="Filtrar por nome"
            />
          </div>
        </div>

        <Button onClick={fetchReportData} disabled={isLoadingReports} className="w-full md:w-auto flex items-center gap-2">
          {isLoadingReports ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Filter className="h-4 w-4" />
          )}
          Aplicar Filtros
        </Button>

        <h3 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" /> Resultados do Relatório
        </h3>

        {isLoadingReports ? (
          <p className="text-center text-muted-foreground py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando relatórios...
          </p>
        ) : reportData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum relatório encontrado com os filtros aplicados.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Data</TableHead>
                  <TableHead className="w-[120px]">Funcionário</TableHead>
                  <TableHead className="w-[60px]">AF</TableHead>
                  <TableHead className="w-[50px]">OS</TableHead>
                  <TableHead className="w-[80px]">Horário</TableHead>
                  <TableHead className="w-auto">Serviço / Peças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map(entry => (
                  <React.Fragment key={entry.id}>
                    <TableRow className="bg-muted/50 border-t-2 border-primary/50">
                      <TableCell className="font-bold text-primary" rowSpan={entry.os_list.length || 1}>
                        {format(parseISO(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium" rowSpan={entry.os_list.length || 1}>
                        {entry.user_badge ? `${entry.user_badge} - ` : ''}{entry.user_name}
                      </TableCell>
                      {entry.os_list.length === 0 ? (
                        <TableCell colSpan={4} className="text-muted-foreground italic">
                          Nenhuma OS registrada para esta data.
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="font-medium">{entry.os_list[0].af}</TableCell>
                          <TableCell>{entry.os_list[0].os || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {entry.os_list[0].hora_inicio && entry.os_list[0].hora_final
                              ? `${entry.os_list[0].hora_inicio}-${entry.os_list[0].hora_final}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start">
                              {entry.os_list[0].servico_executado && (
                                <span className="font-semibold">{entry.os_list[0].servico_executado}</span>
                              )}
                              {entry.os_list[0].codigo_peca && (
                                <span className="text-sm">
                                  {entry.os_list[0].quantidade_peca}x {entry.os_list[0].codigo_peca} - {entry.os_list[0].descricao_peca}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                    {entry.os_list.slice(1).map((osItem, idx) => (
                      <TableRow key={`${entry.id}-item-${idx}`}>
                        <TableCell className="font-medium">{osItem.af}</TableCell>
                        <TableCell>{osItem.os || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {osItem.hora_inicio && osItem.hora_final
                            ? `${osItem.hora_inicio}-${osItem.hora_final}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start">
                            {osItem.servico_executado && (
                              <span className="font-semibold">{osItem.servico_executado}</span>
                            )}
                            {osItem.codigo_peca && (
                              <span className="text-sm">
                                {osItem.quantidade_peca}x {osItem.codigo_peca} - {osItem.descricao_peca}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-8 p-4 border-t border-primary/50 flex items-center justify-between">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Tempo Total Calculado:
          </h4>
          <span className="text-xl font-extrabold text-primary">{calculateTotalTime}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceOrderReports;