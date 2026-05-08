"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval, startOfDay, endOfDay, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
  User as UserIcon,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  ClipboardList,
  CalendarRange,
  Keyboard,
  Check,
  ChevronsUpDown,
  Search,
  Briefcase,
  Clock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { DateRange } from "react-day-picker";
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { ServiceOrderData } from '@/types/supabase';
import { showError } from '@/utils/toast';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#1e40af', '#1e3a8a'];

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  badge: string | null;
  profession: string | null;
  shift: string | null;
}

// Helper to calculate duration in minutes
const calculateDuration = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Handle overnight
  }
  
  return endMinutes - startMinutes;
};

// Helper to format minutes to HH:mm
const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, time }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} className="font-bold drop-shadow-md">
      <tspan x={x} dy="-0.5em" textAnchor="middle">{name}</tspan>
      <tspan x={x} dy="1.2em" textAnchor="middle">{time}</tspan>
    </text>
  );
};

const AdminReportPage = () => {

  const { user, profile } = useSession();
  const { company, branding } = useCompany();
  const navigate = useNavigate();

  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedProfession, setSelectedProfession] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  
  const [availableProfessions, setAvailableProfessions] = useState<string[]>(['Eletricista', 'Mecânico']);
  const [availableShifts, setAvailableShifts] = useState<string[]>(['Turno A', 'Turno B', 'Turno C']);

  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [singleDateInput, setSingleDateInput] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [rangeStartInput, setRangeStartInput] = useState(format(startOfMonth(new Date()), 'dd/MM/yyyy'));
  const [rangeEndInput, setRangeEndInput] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [showRangeInputs, setShowRangeInputs] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<any[]>([]); 

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  useEffect(() => {
    if (!loading && !isAdmin) {
      showError('Acesso negado: Esta página é restrita a administradores e moderadores.');
      navigate(`/${company}`);
    }
  }, [loading, isAdmin, navigate, company, profile]);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const { data } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'user_attributes')
          .eq('company', company)
          .maybeSingle();
          
        if (data && data.value) {
          const val = data.value as any;
          if (val.professions && val.professions.length > 0) setAvailableProfessions(val.professions);
          if (val.shifts && val.shifts.length > 0) setAvailableShifts(val.shifts);
        }
      } catch (e) {
        console.error('Error fetching dynamic attributes:', e);
      }
    };
    if (user) fetchAttributes();
  }, [company, user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, badge, profession, shift');
        
        if (userError) throw userError;
        setUsers(userData || []);

        let start, end;
        if (dateMode === 'single') {
          start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
          end = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
        } else {
          start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
          end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        }

        const { data: records, error: recordError } = await supabase
          .from('daily_service_orders')
          .select('*')
          .gte('date', start)
          .lte('date', end);

        if (recordError) throw recordError;
        
        const filteredRecords = (records || []).filter(r => r.company === company);
        setAllData(filteredRecords);

      } catch (err) {
        console.error('Error fetching admin report data:', err);
        showError('Erro ao carregar dados do relatório.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, dateRange, dateMode, company, user]);

  const matchesFilters = (record: any) => {
    const userProfile = users.find(u => u.id === record.user_id);
    if (selectedUserId !== 'all' && record.user_id !== selectedUserId) return false;
    if (selectedProfession !== 'all') {
      if (!userProfile || userProfile.profession !== selectedProfession) return false;
    }
    if (selectedShift !== 'all') {
      if (!userProfile || userProfile.shift !== selectedShift) return false;
    }
    return true;
  };

  const dailyChartData = useMemo(() => {
    let periodRecords;
    if (dateMode === 'single') {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      periodRecords = allData.filter(r => r.date === dateStr && matchesFilters(r));
    } else {
      periodRecords = allData.filter(r => {
        const recordDate = parseISO(r.date);
        const isInRange = dateRange?.from && dateRange?.to
          ? isWithinInterval(recordDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })
          : true;
        return isInRange && matchesFilters(r);
      });
    }
    
    const osDataMap = new Map<string, any>();
    
    periodRecords.forEach(record => {
      const osList = record.os_list as any[];
      if (Array.isArray(osList)) {
        osList.forEach(os => {
          if (os.hora_inicio && os.hora_final) {
            const duration = calculateDuration(os.hora_inicio, os.hora_final);
            const key = os.af || os.os || 'Sem ID';
            
            if (osDataMap.has(key)) {
              const existing = osDataMap.get(key);
              existing.value += duration;
            } else {
              osDataMap.set(key, {
                name: os.af ? `AF: ${os.af}` : (os.os ? `OS: ${os.os}` : 'Sem ID'),
                value: duration,
                os: os.os,
                af: os.af,
                time: `${os.hora_inicio} - ${os.hora_final}`
              });
            }
          }
        });
      }
    });

    return Array.from(osDataMap.values());
  }, [allData, selectedDate, dateRange, dateMode, selectedUserId, selectedProfession, selectedShift, users]);

  const totalDailyMinutes = dailyChartData.reduce((acc, curr) => acc + curr.value, 0);

  const monthlyChartData = useMemo(() => {
    const daysMap = new Map<string, number>();
    
    let interval;
    if (dateMode === 'single') {
      interval = {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
      };
    } else {
      interval = {
        start: dateRange?.from || startOfMonth(new Date()),
        end: dateRange?.to || new Date()
      };
    }

    const daysInInterval = eachDayOfInterval(interval);
    daysInInterval.forEach(day => {
      daysMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    allData.filter(r => matchesFilters(r)).forEach(record => {
      const osList = record.os_list as any[];
      if (Array.isArray(osList)) {
        const dayMinutes = osList.reduce((acc, os) => acc + calculateDuration(os.hora_inicio, os.hora_final), 0);
        const recordDate = record.date;
        if (daysMap.has(recordDate)) {
          daysMap.set(recordDate, (daysMap.get(recordDate) || 0) + dayMinutes);
        }
      }
    });

    return Array.from(daysMap.entries()).map(([date, minutes]) => ({
      date,
      day: format(parseISO(date), 'dd/MM'),
      minutes,
      hours: Number((minutes / 60).toFixed(1))
    }));
  }, [allData, selectedDate, dateRange, dateMode, selectedUserId, selectedProfession, selectedShift, users]);

  const totalMonthlyMinutes = monthlyChartData.reduce((acc, curr) => acc + curr.minutes, 0);

  const filteredOSList = useMemo(() => {
    let periodRecords;
    if (dateMode === 'single') {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      periodRecords = allData.filter(r => r.date === dateStr && matchesFilters(r));
    } else {
      periodRecords = allData.filter(r => {
        const recordDate = parseISO(r.date);
        const isInRange = dateRange?.from && dateRange?.to
          ? isWithinInterval(recordDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })
          : true;
        return isInRange && matchesFilters(r);
      });
    }
    
    const osList: (ServiceOrderData & { userDisplayName: string; recordDate: string })[] = [];
    periodRecords.forEach(record => {
      const userProfile = users.find(u => u.id === record.user_id);
      const userDisplayName = userProfile
        ? `${userProfile.badge ? userProfile.badge + ' - ' : ''}${userProfile.first_name} ${userProfile.last_name || ''}`
        : 'Desconhecido';
      
      const recordOsList = record.os_list as any[];
      if (Array.isArray(recordOsList)) {
        recordOsList.forEach((os: any) => {
          osList.push({ ...os, userDisplayName, recordDate: record.date });
        });
      }
    });

    return osList.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
  }, [allData, selectedDate, dateRange, dateMode, selectedUserId, selectedProfession, selectedShift, users]);

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };
  
  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleSingleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSingleDateInput(value);
    if (value.length === 10) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) setSelectedDate(parsedDate);
    }
  };

  const handleRangeStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRangeStartInput(value);
    if (value.length === 10) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) setDateRange(prev => ({ from: parsedDate, to: prev?.to }));
    }
  };

  const handleRangeEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRangeEndInput(value);
    if (value.length === 10) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) setDateRange(prev => ({ from: prev?.from, to: parsedDate }));
    }
  };

  useEffect(() => {
    if (dateMode === 'single') setSingleDateInput(format(selectedDate, 'dd/MM/yyyy'));
  }, [selectedDate, dateMode]);

  useEffect(() => {
    if (dateRange?.from) setRangeStartInput(format(dateRange.from, 'dd/MM/yyyy'));
    if (dateRange?.to) setRangeEndInput(format(dateRange.to, 'dd/MM/yyyy'));
  }, [dateRange]);

  if (loading && allData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando relatório administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-primary">
          <Users className="h-8 w-8" />
          Relatório Administrativo ({branding.name})
        </h1>
        <Button variant="outline" onClick={() => navigate(`/${company}/service-orders`)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Date Selector */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarRange className="h-4 w-4" /> Seleção de Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="single" value={dateMode} onValueChange={(v: any) => setDateMode(v)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="single">Dia Único</TabsTrigger>
                <TabsTrigger value="range">Por Período</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="m-0">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={handlePrevDay}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="flex-1 text-center font-bold text-lg hover:bg-accent">
                        {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} />
                    </PopoverContent>
                  </Popover>

                  <Button variant="outline" size="icon" onClick={handleNextDay}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="range" className="m-0">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className="flex-1 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}` : format(dateRange.from, "dd/MM/yyyy")) : <span>Selecione o período</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => setShowRangeInputs(!showRangeInputs)} className={showRangeInputs ? "bg-accent" : ""}><Keyboard className="h-4 w-4" /></Button>
                  </div>
                  {showRangeInputs && (
                    <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1">
                      <Input placeholder="Início" value={rangeStartInput} onChange={handleRangeStartInputChange} className="h-8 text-xs w-28 text-center" />
                      <span className="text-muted-foreground">/</span>
                      <Input placeholder="Fim" value={rangeEndInput} onChange={handleRangeEndInputChange} className="h-8 text-xs w-28 text-center" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Global Filters */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" /> Filtros Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Select */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" /> Usuário
              </label>
              <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9">
                    <div className="flex items-center gap-2 truncate">
                      {selectedUserId === "all" ? "Todos os usuários" : users.find((u) => u.id === selectedUserId)?.first_name + ' ' + (users.find((u) => u.id === selectedUserId)?.last_name || '')}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nome ou crachá..." />
                    <CommandList>
                      <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setSelectedUserId("all"); setOpenUserSelect(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedUserId === "all" ? "opacity-100" : "opacity-0")} />
                          Todos os usuários
                        </CommandItem>
                        {users.map((u) => (
                          <CommandItem key={u.id} onSelect={() => { setSelectedUserId(u.id); setOpenUserSelect(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{u.badge ? `${u.badge} - ` : ''}{u.first_name} {u.last_name || ''}</span>
                              <span className="text-xs text-muted-foreground">{u.profession || 'Sem profissão'} • {u.shift || 'Sem turno'}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Profession Select */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Profissão
                </label>
                <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Profissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableProfessions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Select */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Turno
                </label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableShifts.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Daily Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> {dateMode === 'single' ? 'Desempenho Diário' : 'Desempenho do Período'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-64 w-full relative">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dailyChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={renderCustomPieLabel} labelLine={false}>
                      {dailyChartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatDuration(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">Sem dados para este filtro</div>
              )}
              {dailyChartData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">{formatDuration(totalDailyMinutes)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> {dateMode === 'single' ? `Desempenho Mensal (${format(selectedDate, 'MMMM', { locale: ptBR })})` : 'Desempenho por Dia no Período'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(val) => `${Math.floor(val / 60)}h`} />
                  <RechartsTooltip formatter={(value: number) => [formatDuration(value), 'Tempo']} labelFormatter={(label) => `Dia ${label}`} />
                  <Bar dataKey="minutes" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground mr-2">Total {dateMode === 'single' ? 'no mês' : 'no período'}:</span>
              <span className="font-bold text-blue-600">{formatDuration(totalMonthlyMinutes)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OS List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> {dateMode === 'single' ? 'Ordens de Serviço do Dia' : 'Ordens de Serviço do Período'}
          </CardTitle>
          <div className="text-sm font-medium text-muted-foreground">
            {filteredOSList.length} OS encontrada(s)
          </div>
        </CardHeader>
        <CardContent>
          {filteredOSList.length > 0 ? (
            <div className="space-y-6">
              {filteredOSList.map((os, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 p-2 px-4 border-b flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Usuário: {os.userDisplayName} {dateMode === 'range' && `| Data: ${format(parseISO(os.recordDate), 'dd/MM/yyyy')}`}
                    </span>
                  </div>
                  <ServiceOrderListDisplay group={os} readOnly={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma ordem de serviço registrada para este filtro.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportPage;