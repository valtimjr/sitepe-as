"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  ChevronsUpDown,
  Check,
  Clock,
  GripVertical,
  FileText,
  Download,
  X,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, getOperationalDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { getAfsFromService, Af } from '@/services/partListService';
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

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

const calculateDuration = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return endMinutes - startMinutes;
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const getAfDescription = (afNumber: string, availableAfs: Af[]): string => {
  return availableAfs.find(a => a.af_number === afNumber)?.descricao || '-';
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
  const [selectedDate, setSelectedDate] = useState<Date>(getOperationalDate(new Date()));
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(getOperationalDate(new Date())),
    to: getOperationalDate(new Date()),
  });
  
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedProfessionCode, setSelectedProfessionCode] = useState<string>('all');
  const [selectedShiftCode, setSelectedShiftCode] = useState<string>('all');
  const [selectedDigitadoFilter, setSelectedDigitadoFilter] = useState<'all' | 'sim' | 'nao'>('all'); // Novo filtro de digitadas
  const [sortDaysDirection, setSortDaysDirection] = useState<'asc' | 'desc'>('desc'); // Ordenação dos dias das OS
  const [afSearchTerm, setAfSearchTerm] = useState<string>('');
  
  const [availableProfessions, setAvailableProfessions] = useState<AttributeItem[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AttributeItem[]>([]);
  const [availableAfs, setAvailableAfs] = useState<Af[]>([]);

  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [allData, setAllData] = useState<any[]>([]); 

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportGroupBy, setReportGroupBy] = useState<string>('none');
  const [includeDonutChart, setIncludeDonutChart] = useState(false);
  const [includeBarChart, setIncludeBarChart] = useState(false);
  const [includeTypedStatus, setIncludeTypedStatus] = useState(true);

  const [unconfirmOrderId, setUnconfirmOrderId] = useState<string | null>(null);
  const [isUnconfirmDialogOpen, setIsUnconfirmDialogOpen] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  useEffect(() => {
    if (!loading && !isAdmin) {
      showError('Acesso negado.');
      navigate(`/${company}`);
    }
  }, [loading, isAdmin, navigate, company, profile]);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const [profRes, shiftRes, afsData] = await Promise.all([
          supabase.from('professions').select('name, ref_code').eq('company', company).order('name'),
          supabase.from('shifts').select('name, ref_code').eq('company', company).order('name'),
          getAfsFromService(company)
        ]);
        
        if (profRes.data) setAvailableProfessions(profRes.data);
        if (shiftRes.data) setAvailableShifts(shiftRes.data);
        if (afsData) setAvailableAfs(afsData);
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
          .select('id, first_name, last_name, role, badge, profession_code, shift_code')
          .order('first_name', { ascending: true });
        
        if (userError) {
          console.error('[AdminReportPage] Erro ao buscar usuários:', userError);
        }
        
        setUsers((userData as UserProfile[]) || []);

        let start, end;
        if (dateMode === 'single') {
          start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
          end = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
        } else {
          start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(getOperationalDate(new Date())), 'yyyy-MM-dd');
          end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(getOperationalDate(new Date()), 'yyyy-MM-dd');
        }

        const { data: records } = await supabase
          .from('daily_service_orders')
          .select('*')
          .gte('date', start)
          .lte('date', end);
        
        setAllData((records || []).filter(r => r.company === company));
      } catch (err) {
        showError('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, dateRange, dateMode, company, user]);

  const matchesFilters = (record: any) => {
    const userProfile = users.find(u => u.id === record.user_id);
    if (selectedUserId !== 'all' && record.user_id !== selectedUserId) return false;
    if (selectedProfessionCode !== 'all' && userProfile?.profession_code?.toString() !== selectedProfessionCode) return false;
    if (selectedShiftCode !== 'all' && userProfile?.shift_code?.toString() !== selectedShiftCode) return false;
    return true;
  };

  const filteredOSList = useMemo(() => {
    let periodRecords;
    if (dateMode === 'single') {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      periodRecords = allData.filter(r => r.date === dateStr && matchesFilters(r));
    } else {
      periodRecords = allData.filter(r => {
        const recordDate = parseISO(r.date);
        const inRange = dateRange?.from && dateRange?.to
          ? isWithinInterval(recordDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })
          : true;
        
        return inRange && matchesFilters(r);
      });
    }

    let osList: any[] = [];
    periodRecords.forEach(record => {
      const userProfile = users.find(u => u.id === record.user_id);
      const badge = userProfile?.badge || '';
      const userDisplayName = userProfile ? `${badge ? badge + ' - ' : ''}${userProfile.first_name} ${userProfile.last_name || ''}` : 'Desconhecido';

      const recordOsList = record.os_list as any[];
      if (Array.isArray(recordOsList)) {
        recordOsList.forEach((os, index) => {
          const isConfirmed = os.confirmed === true;
          
          // Filtro para ordens Digitadas vs Pendentes
          if (selectedDigitadoFilter === 'sim' && !isConfirmed) return;
          if (selectedDigitadoFilter === 'nao' && isConfirmed) return;

          osList.push({
            ...os,
            id: os.id || `old-${record.id}-${index}`,
            userDisplayName,
            recordDate: record.date,
            badge,
            profession_code: userProfile?.profession_code || null,
            shift_code: userProfile?.shift_code || null,
            confirmed: isConfirmed,
          });
        });
      }
    });

    // Filtro de AF (Número ou Descrição)
    if (afSearchTerm) {
      const term = afSearchTerm.toLowerCase();
      osList = osList.filter(os => {
        const afNumber = (os.af || '').toLowerCase();
        const afDesc = getAfDescription(os.af, availableAfs).toLowerCase();
        return afNumber.includes(term) || afDesc.includes(term);
      });
    }

    // Ordenação dos dias (Crescente ou Decrescente)
    return osList.sort((a, b) => {
      if (sortDaysDirection === 'asc') {
        return a.recordDate.localeCompare(b.recordDate);
      } else {
        return b.recordDate.localeCompare(a.recordDate);
      }
    });
  }, [allData, selectedDate, dateRange, dateMode, selectedUserId, selectedProfessionCode, selectedShiftCode, selectedDigitadoFilter, sortDaysDirection, users, afSearchTerm, availableAfs]);

  const dailyChartData = useMemo(() => {
    const osDataMap = new Map<string, any>();
    filteredOSList.forEach(os => {
      if (os.hora_inicio && os.hora_final) {
        const duration = calculateDuration(os.hora_inicio, os.hora_final);
        const isPercurso = !!os.is_percurso;
        const key = isPercurso ? `Percurso-${os.id}` : (os.af || os.os || 'Sem ID');
        const name = isPercurso ? (os.af ? `Percurso (AF: ${os.af})` : 'Percurso') : (os.af ? `AF: ${os.af}` : `OS: ${os.os}`);
        
        if (osDataMap.has(key)) {
          osDataMap.get(key).value += duration;
        } else {
          osDataMap.set(key, {
            name,
            value: duration,
            time: `${os.hora_inicio} - ${os.hora_final}`,
            is_percurso: isPercurso
          });
        }
      }
    });
    return Array.from(osDataMap.values());
  }, [filteredOSList]);

  const totalDailyMinutes = dailyChartData.reduce((acc, curr) => acc + curr.value, 0);

  const monthlyChartData = useMemo(() => {
    const daysMap = new Map<string, { minutes: number; percursoMinutes: number }>();
    const interval = dateMode === 'single' ? { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) } : { start: dateRange?.from || getOperationalDate(new Date()), end: dateRange?.to || getOperationalDate(new Date()) };
    eachDayOfInterval(interval).forEach(day => daysMap.set(format(day, 'yyyy-MM-dd'), { minutes: 0, percursoMinutes: 0 }));

    allData.filter(r => matchesFilters(r)).forEach(record => {
      const osList = record.os_list as any[];
      if (Array.isArray(osList)) {
        let dayMinutes = 0;
        let dayPercursoMinutes = 0;
        osList.forEach((os: any) => {
          const duration = calculateDuration(os.hora_inicio, os.hora_final);
          if (os.is_percurso) {
            dayPercursoMinutes += duration;
          } else {
            dayMinutes += duration;
          }
        });
        
        if (daysMap.has(record.date)) {
          const current = daysMap.get(record.date)!;
          daysMap.set(record.date, {
            minutes: current.minutes + dayMinutes,
            percursoMinutes: current.percursoMinutes + dayPercursoMinutes
          });
        }
      }
    });
    return Array.from(daysMap.entries()).map(([date, val]) => ({
      day: format(parseISO(date), 'dd/MM'),
      minutes: val.minutes,
      percursoMinutes: val.percursoMinutes
    }));
  }, [allData, selectedDate, dateRange, dateMode, users]);

  const pendingCount = filteredOSList.filter(os => !os.confirmed).length;

  const confirmOrder = async (orderId: string) => {
    try {
      const record = allData.find(r => Array.isArray(r.os_list) && r.os_list.some((os: any, idx: number) => (os.id || `old-${r.id}-${idx}`) === orderId));
      if (!record) return;
      const updatedOsList = record.os_list.map((os: any, idx: number) => (os.id || `old-${record.id}-${idx}`) === orderId ? { ...os, confirmed: true } : os);
      const { error } = await supabase.from('daily_service_orders').update({ os_list: updatedOsList }).eq('id', record.id);
      if (error) throw error;
      showSuccess('Ordem marcada como digitada!');
      setAllData(prev => prev.map(r => r.id === record.id ? { ...r, os_list: updatedOsList } : r));
    } catch (err) {
      showError('Erro ao confirmar ordem.');
    }
  };

  const unconfirmOrder = async (orderId: string) => {
    try {
      const record = allData.find(r => Array.isArray(r.os_list) && r.os_list.some((os: any, idx: number) => (os.id || `old-${r.id}-${idx}`) === orderId));
      if (!record) return;
      const updatedOsList = record.os_list.map((os: any, idx: number) => (os.id || `old-${record.id}-${idx}`) === orderId ? { ...os, confirmed: false } : os);
      const { error } = await supabase.from('daily_service_orders').update({ os_list: updatedOsList }).eq('id', record.id);
      if (error) throw error;
      showSuccess('Status removido!');
      setAllData(prev => prev.map(r => r.id === record.id ? { ...r, os_list: updatedOsList } : r));
      setIsUnconfirmDialogOpen(false);
    } catch (err) {
      showError('Erro ao desmarcar ordem.');
    }
  };

  const handleGenerateCSV = () => {
    const grouped = groupReportData();
    const headers = ['Data', 'Usuário', 'AF', 'OS', 'Equipamento', 'Serviço', 'Início', 'Fim', 'Duração'];
    if (includeTypedStatus) headers.push('Status');
    let csvContent = headers.join(',') + '\n';
    Object.values(grouped).forEach(data => {
      data.forEach((os: any) => {
        const row = [
          format(parseISO(os.recordDate), 'dd/MM/yyyy'), 
          `"${os.userDisplayName}"`, 
          `"${os.af || '-'}"`, 
          `"${os.os || '-'}"`, 
          `"${getAfDescription(os.af, availableAfs)}"`, 
          `"${os.servico_executado || '-'}"`,
          os.hora_inicio || '-', 
          os.hora_final || '-', 
          formatDuration(calculateDuration(os.hora_inicio, os.hora_final))
        ];
        if (includeTypedStatus) row.push(os.confirmed ? 'Digitado' : 'Pendente');
        csvContent += row.join(',') + '\n';
      });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${company}.csv`;
    link.click();
  };

  const groupReportData = () => {
    if (reportGroupBy === 'none') return { 'Geral': filteredOSList };
    const grouped: Record<string, any[]> = {};
    filteredOSList.forEach(item => {
      let key = 'Outros';
      if (reportGroupBy === 'date') key = format(parseISO(item.recordDate), 'dd/MM/yyyy');
      else if (reportGroupBy === 'badge') key = item.badge || 'Sem Crachá';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 40;

      // Header Text
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138); // #1e3a8a
      doc.text(`Relatório de Ordens de Serviço - ${branding.name}`, 40, yPos);
      yPos += 20;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 40, yPos);
      yPos += 15;
      const periodStr = dateMode === 'single' ? format(selectedDate, 'dd/MM/yyyy') : `${format(dateRange?.from || getOperationalDate(new Date()), 'dd/MM/yyyy')} a ${format(dateRange?.to || getOperationalDate(new Date()), 'dd/MM/yyyy')}`;
      doc.text(`Período: ${periodStr}`, 40, yPos);
      yPos += 15;
      doc.text(`Total Geral de OS: ${filteredOSList.length}`, 40, yPos);
      yPos += 15;

      if (includeTypedStatus && pendingCount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`(${pendingCount} OS ainda não foram digitadas no ERP)`, 40, yPos);
        yPos += 20;
      } else {
        yPos += 10;
      }

      // Charts
      if (includeDonutChart || includeBarChart) {
        const chartHeight = 160;
        const chartWidth = 220;
        let currentX = 40;

        if (includeDonutChart) {
          const donutEl = document.getElementById('print-donut-chart');
          if (donutEl) {
            const canvas = await html2canvas(donutEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', currentX, yPos, chartWidth, chartHeight);
            currentX += chartWidth + 20;
          }
        }

        if (includeBarChart) {
          const barEl = document.getElementById('print-bar-chart');
          if (barEl) {
            const canvas = await html2canvas(barEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', currentX, yPos, chartWidth, chartHeight);
          }
        }

        yPos += chartHeight + 20;
      }

      // Grouped Data Tables
      const grouped = groupReportData();
      
      Object.keys(grouped).forEach((key, index) => {
        const data = grouped[key];
        let total = 0;

        // Check if we need a new page for the group title
        if (yPos > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          yPos = 40;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text(key, 40, yPos);
        yPos += 10;

        const headers = ['Data', 'Usuário', 'AF', 'OS', 'Serviço', 'Tempo'];
        if (includeTypedStatus) headers.push('Status');

        const bodyData = data.map((os: any) => {
          const d = calculateDuration(os.hora_inicio, os.hora_final);
          total += d;
          
          const row: any[] = [
            format(parseISO(os.recordDate), 'dd/MM/yyyy'),
            os.userDisplayName,
            os.af || '-',
            os.os || '-',
            os.servico_executado || '-',
            formatDuration(d)
          ];
          
          if (includeTypedStatus) {
            row.push({
              content: os.confirmed ? 'Digitado' : 'Pendente',
              styles: {
                textColor: os.confirmed ? [22, 163, 74] : [220, 38, 38],
                fontStyle: 'bold',
                halign: 'center'
              }
            });
          }
          
          return row;
        });

        // Total Row
        const totalRow: any[] = [
          { content: 'Total', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: formatDuration(total), styles: { fontStyle: 'bold' } }
        ];
        if (includeTypedStatus) totalRow.push('');
        bodyData.push(totalRow);

        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: bodyData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
          columnStyles: {
            0: { cellWidth: 50 }, // Data
            1: { cellWidth: 80 }, // Usuário
            2: { cellWidth: 50 }, // AF
            3: { cellWidth: 50 }, // OS
            4: { cellWidth: 'auto' }, // Serviço
            5: { cellWidth: 50 }, // Tempo
            6: { cellWidth: 50 }, // Status
          },
          didDrawPage: (hookData) => {
            yPos = hookData.cursor?.y || yPos;
          }
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 20; 
      });

      doc.save(`relatorio_${company}_${format(new Date(), "dd-MM-yyyy_HH-mm")}.pdf`);
      showSuccess('PDF gerado com sucesso!');
      setIsReportDialogOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background max-w-7xl mx-auto w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-primary">
          <img src="/icons/tela_inicial/7.png" alt="" className="h-12 w-auto object-contain" />
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
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Seleção de Data</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={dateMode} onValueChange={(v: any) => setDateMode(v)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="single">Dia Único</TabsTrigger>
                <TabsTrigger value="range">Período</TabsTrigger>
              </TabsList>
              <TabsContent value="single">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Popover><PopoverTrigger asChild><Button variant="ghost" className="flex-1 font-bold">{format(selectedDate, "dd/MM/yyyy")}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} /></PopoverContent></Popover>
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </TabsContent>
              <TabsContent value="range">
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full text-left">{dateRange?.from ? format(dateRange.from, "dd/MM/yyyy") : 'Início'} - {dateRange?.to ? format(dateRange.to, "dd/MM/yyyy") : 'Fim'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} locale={ptBR} /></PopoverContent></Popover>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold">Usuário</Label>
                 <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       role="combobox"
                       aria-expanded={openUserSelect}
                       className="w-full justify-between"
                     >
                       {selectedUserId === "all"
                         ? "Todos os usuários"
                         : users.find((u) => u.id === selectedUserId)
                           ? `${users.find((u) => u.id === selectedUserId)?.first_name} ${users.find((u) => u.id === selectedUserId)?.last_name}`
                           : "Selecionar usuário..."}
                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                     <Command>
                       <CommandInput placeholder="Pesquisar usuário..." />
                       <CommandList>
                         <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                         <CommandGroup>
                           <CommandItem
                             value="all"
                             onSelect={() => {
                               setSelectedUserId("all");
                               setOpenUserSelect(false);
                             }}
                           >
                             <Check
                               className={cn(
                                 "mr-2 h-4 w-4",
                                 selectedUserId === "all" ? "opacity-100" : "opacity-0"
                               )}
                             />
                             Todos os usuários
                           </CommandItem>
                           {users.map((u) => {
                             const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                             const badgeStr = u.badge ? `(${u.badge})` : '';
                             const searchValue = `${fullName} ${u.badge || ''}`.toLowerCase().trim();
                             
                             return (
                               <CommandItem
                                 key={u.id}
                                 value={searchValue}
                                 onSelect={() => {
                                   setSelectedUserId(u.id);
                                   setOpenUserSelect(false);
                                 }}
                               >
                                 <Check
                                   className={cn(
                                     "mr-2 h-4 w-4",
                                     selectedUserId === u.id ? "opacity-100" : "opacity-0"
                                   )}
                                 />
                                 <span className="flex-1">
                                   {fullName || 'Usuário sem nome'} {badgeStr}
                                 </span>
                               </CommandItem>
                             );
                           })}
                         </CommandGroup>
                       </CommandList>
                     </Command>
                   </PopoverContent>
                 </Popover>
               </div>
               <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold">Pesquisar AF</Label>
                 <div className="relative">
                   <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Número ou descrição..."
                     className="pl-8"
                     value={afSearchTerm}
                     onChange={(e) => setAfSearchTerm(e.target.value)}
                   />
                 </div>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Profissão</Label>
                  <Select value={selectedProfessionCode} onValueChange={setSelectedProfessionCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableProfessions.map(p => <SelectItem key={p.ref_code} value={p.ref_code!.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Turno</Label>
                  <Select value={selectedShiftCode} onValueChange={setSelectedShiftCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableShifts.map(s => <SelectItem key={s.ref_code} value={s.ref_code!.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Status Digitado</Label>
                  <Select value={selectedDigitadoFilter} onValueChange={(v: any) => setSelectedDigitadoFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="sim">Apenas Digitadas</SelectItem>
                      <SelectItem value="nao">Apenas Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Resumo Diário</CardTitle></CardHeader>
          <CardContent className="h-64 relative">
             <div id="print-donut-chart" className="h-full w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={dailyChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={renderCustomPieLabel}>
                     {dailyChartData.map((entry, i) => {
                       const isPercurso = !!entry.is_percurso;
                       const cellColor = isPercurso ? '#ef4444' : COLORS[i % COLORS.length];
                       return <Cell key={i} fill={cellColor} />;
                     })}
                   </Pie>
                   <RechartsTooltip />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-lg font-bold">{formatDuration(totalDailyMinutes)}</span>
               </div>
             </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Histórico do Período</CardTitle></CardHeader>
          <CardContent className="h-64">
             <div id="print-bar-chart" className="h-full w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyChartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="day" />
                   <YAxis tickFormatter={v => `${Math.floor(v/60)}h`} />
                   <RechartsTooltip
                     formatter={(value: number, name: string) => [formatDuration(value), name === 'minutes' ? 'Ordem de Serviço' : 'Percurso']}
                   />
                   <Bar dataKey="minutes" name="Ordem de Serviço" fill="#2563eb" stackId="a" radius={[0, 0, 0, 0]} />
                   <Bar dataKey="percursoMinutes" name="Percurso" fill="#dc2626" stackId="a" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-xl">Ordens de Serviço Filtradas</CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortDaysDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="h-8 px-2 text-xs font-medium flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {sortDaysDirection === 'asc' ? 'Data: Antigas' : 'Data: Recentes'}
            </Button>
            <div className="text-sm font-medium text-muted-foreground border-l pl-3">
              {filteredOSList.length} OS
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 px-4 hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-4 text-sm text-muted-foreground font-medium">
             <div className="flex items-center gap-4">
                <GripVertical className="h-4 w-4 opacity-50" />
                <div className="flex items-center gap-2">
                   <Clock className="h-4 w-4" />
                </div>
             </div>
             <div></div>
             <div className="text-center w-16">Qtd</div>
             <div className="text-right w-20"></div>
          </div>

          <div className="space-y-6">
            {filteredOSList.map(os => (
              <ServiceOrderListDisplay 
                key={os.id} 
                group={os} 
                readOnly={true} 
                additionalHeader={
                  <div className="bg-blue-50/30 p-4 border-b border-blue-100/50 flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">{os.userDisplayName} | {format(parseISO(os.recordDate), 'dd/MM/yyyy')}</span>
                    {os.confirmed ? (
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 text-xs font-bold">Digitado</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setUnconfirmOrderId(os.id); setIsUnconfirmDialogOpen(true); }}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : <Button variant="outline" size="sm" onClick={() => confirmOrder(os.id)}>Marcar Digitado</Button>}
                  </div>
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerar Relatório</DialogTitle>
            <DialogDescription>
              O relatório usará as <strong>{filteredOSList.length} Ordens de Serviço</strong> filtradas.
              {pendingCount > 0 && <span className="block mt-1 text-red-600 font-medium italic">({pendingCount} OS pendentes de digitação)</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Agrupar por:</Label>
              <Select value={reportGroupBy} onValueChange={setReportGroupBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem Agrupamento</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="badge">Crachá</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded border">
              <Checkbox id="inc-typed" checked={includeTypedStatus} onCheckedChange={(c) => setIncludeTypedStatus(c === true)} />
              <Label htmlFor="inc-typed">Incluir coluna de status "Digitado"</Label>
            </div>
            <div className="space-y-2 p-2 bg-muted/30 rounded border">
              <Label className="text-xs font-bold">Incluir Gráficos no PDF:</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="inc-donut" checked={includeDonutChart} onCheckedChange={(c) => setIncludeDonutChart(c === true)} />
                  <Label htmlFor="inc-donut" className="text-xs">Rosca</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="inc-bar" checked={includeBarChart} onCheckedChange={(c) => setIncludeBarChart(c === true)} />
                  <Label htmlFor="inc-bar" className="text-xs">Barra</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={handleGenerateCSV}>Exportar CSV</Button>
            <Button 
              className="flex-1" 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Salvar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isUnconfirmDialogOpen} onOpenChange={setIsUnconfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover status "Digitado"?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnconfirmOrderId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => unconfirmOrderId && unconfirmOrder(unconfirmOrderId)} className="bg-destructive">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReportPage;