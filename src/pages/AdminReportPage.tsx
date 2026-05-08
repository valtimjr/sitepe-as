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
  Clock,
  FileText,
  Printer,
  Download
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { DateRange } from "react-day-picker";
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { ServiceOrderData } from '@/types/supabase';
import { showSuccess, showError } from '@/utils/toast';
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
  profession_code: number | null;
  shift_code: number | null;
}

type AttributeItem = { name: string; ref_code: number | null };

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
  const [selectedProfessionCode, setSelectedProfessionCode] = useState<string>('all');
  const [selectedShiftCode, setSelectedShiftCode] = useState<string>('all');
  
  const [availableProfessions, setAvailableProfessions] = useState<AttributeItem[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AttributeItem[]>([]);

  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [singleDateInput, setSingleDateInput] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [rangeStartInput, setRangeStartInput] = useState(format(startOfMonth(new Date()), 'dd/MM/yyyy'));
  const [rangeEndInput, setRangeEndInput] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [showRangeInputs, setShowRangeInputs] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<any[]>([]); 

  // Report Generation State
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportGroupBy, setReportGroupBy] = useState<string>('none');

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
        const [profRes, shiftRes] = await Promise.all([
          supabase.from('professions').select('name, ref_code').eq('company', company).order('name'),
          supabase.from('shifts').select('name, ref_code').eq('company', company).order('name')
        ]);
        
        if (profRes.data && profRes.data.length > 0) setAvailableProfessions(profRes.data);
        if (shiftRes.data && shiftRes.data.length > 0) setAvailableShifts(shiftRes.data);
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
        // 1. Fetch all users with profile details
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, badge, profession_code, shift_code');
        
        if (userError) throw userError;
        setUsers(userData as UserProfile[] || []);

        // 2. Fetch all service orders for the range
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

  // Helper to check if a record matches filters
  const matchesFilters = (record: any) => {
    const userProfile = users.find(u => u.id === record.user_id);
    
    // User ID Filter
    if (selectedUserId !== 'all' && record.user_id !== selectedUserId) return false;
    
    // Profession Filter
    if (selectedProfessionCode !== 'all') {
      if (!userProfile || userProfile.profession_code?.toString() !== selectedProfessionCode) return false;
    }
    
    // Shift Filter
    if (selectedShiftCode !== 'all') {
      if (!userProfile || userProfile.shift_code?.toString() !== selectedShiftCode) return false;
    }
    
    return true;
  };

  // Filtered List of OS for Display and Export
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
    
    const osList: (ServiceOrderData & { userDisplayName: string; recordDate: string; badge: string; profession_code: number | null; shift_code: number | null })[] = [];
    
    periodRecords.forEach(record => {
      const userProfile = users.find(u => u.id === record.user_id);
      const badge = userProfile?.badge || '';
      const userDisplayName = userProfile
        ? `${badge ? badge + ' - ' : ''}${userProfile.first_name} ${userProfile.last_name || ''}`
        : 'Desconhecido';
      
      const recordOsList = record.os_list as any[];
      if (Array.isArray(recordOsList)) {
        recordOsList.forEach((os: any) => {
          osList.push({ 
            ...os, 
            userDisplayName, 
            recordDate: record.date,
            badge: badge,
            profession_code: userProfile?.profession_code || null,
            shift_code: userProfile?.shift_code || null
          });
        });
      }
    });

    return osList.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
  }, [allData, selectedDate, dateRange, dateMode, selectedUserId, selectedProfessionCode, selectedShiftCode, users]);

  // Daily/Range Data for Donut Chart
  const dailyChartData = useMemo(() => {
    const osDataMap = new Map<string, any>();
    
    filteredOSList.forEach(os => {
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

    return Array.from(osDataMap.values());
  }, [filteredOSList]);

  const totalDailyMinutes = dailyChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Monthly/Range Data for Bar Chart
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
  }, [allData, selectedDate, dateRange, dateMode, selectedUserId, selectedProfessionCode, selectedShiftCode, users]);

  const totalMonthlyMinutes = monthlyChartData.reduce((acc, curr) => acc + curr.minutes, 0);


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


  // --- Report Generation Logic ---
  const groupReportData = () => {
    if (reportGroupBy === 'none') {
       return { 'Todas as Ordens de Serviço': filteredOSList };
    }

    const grouped: Record<string, any[]> = {};

    filteredOSList.forEach(item => {
      let key = 'Outros';

      if (reportGroupBy === 'date') {
         key = format(parseISO(item.recordDate), 'dd/MM/yyyy');
      } else if (reportGroupBy === 'badge') {
         key = item.badge ? `Crachá: ${item.badge}` : 'Sem Crachá';
      } else if (reportGroupBy === 'profession') {
         const prof = availableProfessions.find(p => p.ref_code === item.profession_code);
         key = prof ? `Profissão: ${prof.name}` : 'Sem Profissão';
      } else if (reportGroupBy === 'shift') {
         const shift = availableShifts.find(s => s.ref_code === item.shift_code);
         key = shift ? `Turno: ${shift.name}` : 'Sem Turno';
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return grouped;
  };

  const handleGenerateJSON = () => {
    const grouped = groupReportData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(grouped, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `relatorio_${company}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setIsReportDialogOpen(false);
    showSuccess("Relatório JSON baixado com sucesso.");
  };

  const handleGeneratePDF = () => {
    const grouped = groupReportData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
       showError("Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.");
       return;
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Administrativo - ${branding.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 5px;}
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; text-align: center; }
          h2 { color: #2563eb; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-size: 18px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .text-right { text-align: right; }
          .summary { font-weight: bold; background-color: #e5e7eb !important; }
          @media print {
            @page { margin: 1cm; }
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Ordens de Serviço - ${branding.name}</h1>
          <div class="meta">
            Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} <br/>
            Período: ${dateMode === 'single' ? format(selectedDate, 'dd/MM/yyyy') : `${format(dateRange?.from || new Date(), 'dd/MM/yyyy')} a ${format(dateRange?.to || new Date(), 'dd/MM/yyyy')}`}<br/>
            Total Geral de OS: ${filteredOSList.length}
          </div>
        </div>
    `;

    Object.keys(grouped).forEach(groupName => {
      const groupData = grouped[groupName];
      let groupTotalMinutes = 0;

      html += `<h2>${groupName} (${groupData.length} OS)</h2>`;

      if (groupData.length > 0) {
        html += `
          <table>
            <thead>
              <tr>
                <th width="80">Data</th>
                <th>Usuário</th>
                <th width="120">AF / OS</th>
                <th>Equipamento</th>
                <th width="60">Início</th>
                <th width="60">Fim</th>
                <th width="80" class="text-right">Duração</th>
              </tr>
            </thead>
            <tbody>
        `;

        groupData.forEach((os: any) => {
          const dur = calculateDuration(os.hora_inicio, os.hora_final);
          groupTotalMinutes += dur;
          
          html += `
            <tr>
              <td>${format(parseISO(os.recordDate), 'dd/MM/yyyy')}</td>
              <td>${os.userDisplayName}</td>
              <td>${os.af ? `AF: ${os.af}` : ''} ${os.os ? `OS: ${os.os}` : ''}</td>
              <td>${os.equipamento || '-'}</td>
              <td>${os.hora_inicio || '-'}</td>
              <td>${os.hora_final || '-'}</td>
              <td class="text-right">${formatDuration(dur)}</td>
            </tr>
          `;
        });

        html += `
            <tr class="summary">
              <td colspan="6" class="text-right">Tempo Total no Grupo:</td>
              <td class="text-right">${formatDuration(groupTotalMinutes)}</td>
            </tr>
            </tbody></table>
        `;
      }
    });

    html += `
        <script>
          window.onload = function() { 
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setIsReportDialogOpen(false);
  };


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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-primary">
          <Users className="h-8 w-8" />
          Relatório Administrativo ({branding.name})
        </h1>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setIsReportDialogOpen(true)} className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Gerar Relatório
          </Button>
          <Button variant="outline" onClick={() => navigate(`/${company}/service-orders`)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
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
                        {users.map((u) => {
                          const profName = availableProfessions.find(p => p.ref_code === u.profession_code)?.name || 'Sem profissão';
                          const shiftName = availableShifts.find(s => s.ref_code === u.shift_code)?.name || 'Sem turno';
                          
                          return (
                            <CommandItem key={u.id} onSelect={() => { setSelectedUserId(u.id); setOpenUserSelect(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{u.badge ? `${u.badge} - ` : ''}{u.first_name} {u.last_name || ''}</span>
                                <span className="text-xs text-muted-foreground">{profName} • {shiftName}</span>
                              </div>
                            </CommandItem>
                          );
                        })}
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
                <Select value={selectedProfessionCode} onValueChange={setSelectedProfessionCode}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Profissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableProfessions.map(p => (
                      <SelectItem key={p.ref_code} value={p.ref_code!.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Select */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Turno
                </label>
                <Select value={selectedShiftCode} onValueChange={setSelectedShiftCode}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableShifts.map(s => (
                      <SelectItem key={s.ref_code} value={s.ref_code!.toString()}>{s.name}</SelectItem>
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
      <Card className="mb-8">
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

      {/* Bottom Action Button */}
      <div className="flex justify-center pb-8">
        <Button size="lg" onClick={() => setIsReportDialogOpen(true)} className="flex items-center gap-2 px-8">
          <FileText className="h-5 w-5" /> Gerar Relatório Completo
        </Button>
      </div>

      {/* Report Generation Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerar Relatório</DialogTitle>
            <DialogDescription>
              O relatório usará as <strong>{filteredOSList.length} Ordens de Serviço</strong> filtradas atualmente na tela. Escolha como deseja agrupar os dados e o formato de saída.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Agrupar relatório por:</label>
              <Select value={reportGroupBy} onValueChange={setReportGroupBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o agrupamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem Agrupamento (Geral)</SelectItem>
                  <SelectItem value="date">Data do Registro</SelectItem>
                  <SelectItem value="profession">Profissão</SelectItem>
                  <SelectItem value="shift">Turno</SelectItem>
                  <SelectItem value="badge">Crachá</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto flex-1" onClick={handleGenerateJSON}>
              <Download className="mr-2 h-4 w-4" /> Gerar JSON
            </Button>
            <Button className="w-full sm:w-auto flex-1" onClick={handleGeneratePDF}>
              <Printer className="mr-2 h-4 w-4" /> Gerar PDF / Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminReportPage;