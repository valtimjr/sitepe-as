"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, parseISO, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownUp,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  GripVertical,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, getOperationalDate, calculateDuration, formatDuration } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { tap } from '@/lib/haptics';
import { showSuccess, showError } from '@/utils/toast';
import { getAfsFromService, Af } from '@/services/partListService';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import ReportFilterPanel, { DEFAULT_REPORT_FILTERS, type ReportFilters } from '@/components/admin-report/ReportFilterPanel';
import ReportCharts from '@/components/admin-report/ReportCharts';
import {
  RawSnapshot,
  processSnapshot
} from '@/services/adminReportSnapshotService';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

const getAfDescription = (afNumber: string, availableAfs: Af[]): string => {
  return availableAfs.find(a => a.af_number === afNumber)?.descricao || '-';
};

const DIGITADO_LABELS = { sim: 'Digitadas', nao: 'Pendentes' } as const;

const toSnapshotFilter = (f: ReportFilters) => ({
  userId: f.userId,
  professionCode: f.professionCode,
  shiftCode: f.shiftCode,
  digitadoFilter: f.digitado,
  afSearchTerm: f.afSearch,
});

const AdminReportPage = () => {
  const { user, profile } = useSession();
  const { company, branding } = useCompany();
  const navigate = useNavigate();
  const isCompact = useIsCompact();
  const appHeaderHidden = useHideOnScroll({ enabled: isCompact });

  // Data / período
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<Date>(getOperationalDate(new Date()));
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(getOperationalDate(new Date())),
    to: getOperationalDate(new Date()),
  });

  // Filtros aplicados (o painel mantém o rascunho)
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [sortDaysDirection, setSortDaysDirection] = useState<'asc' | 'desc'>('desc');

  // Atributos dinâmicos para os filtros
  const [availableProfessions, setAvailableProfessions] = useState<AttributeItem[]>([]);
  const [availableShifts, setAvailableShifts] = useState<any[]>([]);
  const [availableAfs, setAvailableAfs] = useState<Af[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Snapshot bruto em memória (dados do intervalo baixado)
  const [rawSnapshot, setRawSnapshot] = useState<RawSnapshot | null>(null);

  // Indicadores de estado de UI
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const fetchIdRef = useRef(0);

  // Estados dos diálogos de relatório e confirmação
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<boolean>(false);
  const [reportGroupBy, setReportGroupBy] = useState<string>('none');
  const [includeDonutChart, setIncludeDonutChart] = useState<boolean>(false);
  const [includeBarChart, setIncludeBarChart] = useState<boolean>(false);
  const [includeTypedStatus, setIncludeTypedStatus] = useState<boolean>(true);

  const [unconfirmOrderId, setUnconfirmOrderId] = useState<string | null>(null);
  const [isUnconfirmDialogOpen, setIsUnconfirmDialogOpen] = useState<boolean>(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  // Verificação de permissões
  useEffect(() => {
    if (!isFetching && !isAdmin && profile) {
      showError('Acesso negado.');
      navigate(`/${company}`);
    }
  }, [isFetching, isAdmin, navigate, company, profile]);

  // Intervalo baixado: mês da data (modo Dia) ou o período escolhido
  const fetchStart = dateMode === 'single'
    ? format(startOfMonth(selectedDate), 'yyyy-MM-dd')
    : format(dateRange?.from ?? startOfMonth(getOperationalDate(new Date())), 'yyyy-MM-dd');
  const fetchEnd = dateMode === 'single'
    ? format(endOfMonth(selectedDate), 'yyyy-MM-dd')
    : format(dateRange?.to ?? dateRange?.from ?? getOperationalDate(new Date()), 'yyyy-MM-dd');

  // Download em lote: só depende do intervalo; filtros são reprocessados em memória
  const loadBatchData = useCallback(async () => {
    if (!user) return;

    const fetchId = ++fetchIdRef.current;
    setIsFetching(true);

    try {
      const [profilesRes, shiftsRes, profsRes, afsData, ordersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, role, badge, profession_code, shift_code')
          .order('first_name', { ascending: true }),
        supabase
          .from('shifts')
          .select('name, ref_code, entry_time, exit_time')
          .eq('company', company)
          .order('name'),
        supabase
          .from('professions')
          .select('name, ref_code')
          .eq('company', company)
          .order('name'),
        getAfsFromService(company),
        supabase
          .from('daily_service_orders')
          .select('*')
          .gte('date', fetchStart)
          .lte('date', fetchEnd)
          .eq('company', company)
      ]);

      // Uma busca mais nova já está a caminho
      if (fetchId !== fetchIdRef.current) return;

      const fetchedUsers = (profilesRes.data as UserProfile[]) || [];
      const fetchedShifts = shiftsRes.data || [];
      const fetchedProfessions = profsRes.data || [];
      const fetchedAfs = afsData || [];

      setUsers(fetchedUsers);
      setAvailableShifts(fetchedShifts);
      setAvailableProfessions(fetchedProfessions);
      setAvailableAfs(fetchedAfs);

      setRawSnapshot({
        meta: {
          generatedAt: new Date().toISOString(),
          filter: {
            ...toSnapshotFilter(DEFAULT_REPORT_FILTERS),
            dateMode: 'range',
            selectedDate: fetchStart,
            startDate: fetchStart,
            endDate: fetchEnd,
          },
          version: 1
        },
        profiles: fetchedUsers,
        shifts: fetchedShifts,
        dailyServiceOrders: ordersRes.data || [],
        professions: fetchedProfessions,
        afs: fetchedAfs
      });
    } catch (err) {
      console.error('[AdminReportPage] Erro ao carregar dados em lote:', err);
      showError('Erro ao carregar dados do relatório.');
    } finally {
      if (fetchId === fetchIdRef.current) setIsFetching(false);
    }
  }, [user, company, fetchStart, fetchEnd]);

  useEffect(() => {
    loadBatchData();
  }, [loadBatchData]);

  // Processamento determinístico local (sem rede) para um conjunto de filtros
  const processWith = useCallback((f: ReportFilters) => {
    if (!rawSnapshot) return null;
    return processSnapshot({
      ...rawSnapshot,
      meta: {
        ...rawSnapshot.meta,
        filter: {
          ...toSnapshotFilter(f),
          dateMode,
          selectedDate: format(selectedDate, 'yyyy-MM-dd'),
          startDate: fetchStart,
          endDate: fetchEnd,
          sortDaysDirection
        }
      }
    });
  }, [rawSnapshot, dateMode, selectedDate, fetchStart, fetchEnd, sortDaysDirection]);

  const processedSnapshot = useMemo(() => processWith(filters), [processWith, filters]);
  const previewCount = useCallback((draft: ReportFilters) => processWith(draft)?.flatOSList.length ?? 0, [processWith]);

  // Dados derivados do ProcessedSnapshot para consumo imediato dos gráficos/tabelas
  const filteredOSList = useMemo(() => {
    return processedSnapshot?.flatOSList || [];
  }, [processedSnapshot]);

  const summaryTotals = useMemo(() => {
    return processedSnapshot?.summaryTotals || {
      osMinutes: 0,
      percursoMinutes: 0,
      aguardandoMinutes: 0,
      totalMinutes: 0,
      totalOsCount: 0,
      pendingOsCount: 0
    };
  }, [processedSnapshot]);

  const dailyChartData = useMemo(() => {
    return processedSnapshot?.dailyChartSlices || [];
  }, [processedSnapshot]);

  const monthlyChartData = useMemo(() => {
    return processedSnapshot?.monthlyChartSlices || [];
  }, [processedSnapshot]);

  // Totais do Resumo Diário (dias primários filtrados)
  const dailyTimes = useMemo(() => {
    let osMinutes = 0;
    let percursoMinutes = 0;
    let waitingMinutes = 0;

    dailyChartData.forEach(slice => {
      if (slice.is_waiting) {
        waitingMinutes += slice.value;
      } else if (slice.is_percurso) {
        percursoMinutes += slice.value;
      } else {
        osMinutes += slice.value;
      }
    });

    return {
      osMinutes,
      percursoMinutes,
      waitingMinutes,
      totalMinutes: osMinutes + percursoMinutes + waitingMinutes
    };
  }, [dailyChartData]);

  // Chips dos filtros ativos (também dão a contagem do ícone)
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof ReportFilters; label: string }> = [];
    if (filters.userId !== 'all') {
      const u = users.find(x => x.id === filters.userId);
      chips.push({ key: 'userId', label: `Usuário: ${u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Sem nome' : '—'}` });
    }
    if (filters.professionCode !== 'all') {
      const p = availableProfessions.find(x => x.ref_code?.toString() === filters.professionCode);
      chips.push({ key: 'professionCode', label: `Profissão: ${p?.name ?? filters.professionCode}` });
    }
    if (filters.shiftCode !== 'all') {
      const s = availableShifts.find(x => x.ref_code?.toString() === filters.shiftCode);
      chips.push({ key: 'shiftCode', label: `Turno: ${s?.name ?? filters.shiftCode}` });
    }
    if (filters.digitado !== 'all') chips.push({ key: 'digitado', label: DIGITADO_LABELS[filters.digitado] });
    if (filters.afSearch.trim()) chips.push({ key: 'afSearch', label: `AF: ${filters.afSearch.trim()}` });
    return chips;
  }, [filters, users, availableProfessions, availableShifts]);

  const removeFilter = (key: keyof ReportFilters) => {
    tap();
    setFilters(f => ({ ...f, [key]: DEFAULT_REPORT_FILTERS[key] }));
  };

  const openFilters = () => {
    tap();
    setIsFilterPanelOpen(true);
  };

  const openReport = () => {
    tap();
    setIsReportDialogOpen(true);
  };

  const showDaySummary = (date: Date) => {
    setDateMode('single');
    setSelectedDate(date);
  };

  // Ações de Confirmação e Atualização de Status Digitado em Memória
  const confirmOrder = async (orderId: string) => {
    if (!rawSnapshot) return;
    try {
      const record = rawSnapshot.dailyServiceOrders.find((r: any) =>
        Array.isArray(r.os_list) && r.os_list.some((os: any, idx: number) => (os.id || `old-${r.id}-${idx}`) === orderId)
      );

      if (!record) return;

      const updatedOsList = record.os_list.map((os: any, idx: number) =>
        (os.id || `old-${record.id}-${idx}`) === orderId ? { ...os, confirmed: true } : os
      );

      const { error } = await supabase
        .from('daily_service_orders')
        .update({ os_list: updatedOsList })
        .eq('id', record.id);

      if (error) throw error;

      showSuccess('Ordem marcada como digitada!');

      // Atualizar snapshot bruto local e reprocessar imediatamente em memória
      const updatedOrders = rawSnapshot.dailyServiceOrders.map((r: any) =>
        r.id === record.id ? { ...r, os_list: updatedOsList } : r
      );

      const updatedRawSnapshot: RawSnapshot = {
        ...rawSnapshot,
        dailyServiceOrders: updatedOrders
      };

      setRawSnapshot(updatedRawSnapshot);
    } catch (err) {
      console.error('Erro ao confirmar ordem:', err);
      showError('Erro ao confirmar ordem.');
    }
  };

  const unconfirmOrder = async (orderId: string) => {
    if (!rawSnapshot) return;
    try {
      const record = rawSnapshot.dailyServiceOrders.find((r: any) =>
        Array.isArray(r.os_list) && r.os_list.some((os: any, idx: number) => (os.id || `old-${r.id}-${idx}`) === orderId)
      );

      if (!record) return;

      const updatedOsList = record.os_list.map((os: any, idx: number) =>
        (os.id || `old-${record.id}-${idx}`) === orderId ? { ...os, confirmed: false } : os
      );

      const { error } = await supabase
        .from('daily_service_orders')
        .update({ os_list: updatedOsList })
        .eq('id', record.id);

      if (error) throw error;

      showSuccess('Status removido!');

      const updatedOrders = rawSnapshot.dailyServiceOrders.map((r: any) =>
        r.id === record.id ? { ...r, os_list: updatedOsList } : r
      );

      const updatedRawSnapshot: RawSnapshot = {
        ...rawSnapshot,
        dailyServiceOrders: updatedOrders
      };

      setRawSnapshot(updatedRawSnapshot);
      setIsUnconfirmDialogOpen(false);
    } catch (err) {
      console.error('Erro ao desmarcar ordem:', err);
      showError('Erro ao desmarcar ordem.');
    }
  };

  // Agrupamento para Relatórios (PDF / CSV) consumindo o ProcessedSnapshot
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

  // Exportação CSV
  const handleGenerateCSV = () => {
    const grouped = groupReportData();
    const headers = ['Data', 'Usuário', 'AF', 'OS', 'Agregado', 'Equipamento', 'Serviço', 'Início', 'Fim', 'Duração'];
    if (includeTypedStatus) headers.push('Status');
    let csvContent = headers.join(',') + '\n';
    Object.values(grouped).forEach(data => {
      data.forEach((os: any) => {
        const agregadoVal = (!os.is_percurso && os.agregado && os.numero_agregado) ? os.numero_agregado : '-';
        const row = [
          format(parseISO(os.recordDate), 'dd/MM/yyyy'),
          `"${os.userDisplayName}"`,
          `"${os.af || '-'}"`,
          `"${os.os || '-'}"`,
          `"${agregadoVal}"`,
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

  // Exportação PDF
  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      let yPos = 40;

      // Cabeçalho
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      doc.text(`Relatório de Ordens de Serviço - ${branding.name}`, 40, yPos);
      yPos += 20;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 40, yPos);
      yPos += 15;
      const periodStr = processedSnapshot?.meta.periodStr || '';
      doc.text(`Período: ${periodStr}`, 40, yPos);
      yPos += 15;
      doc.text(`Total Geral de OS: ${filteredOSList.length}`, 40, yPos);
      yPos += 15;

      const pendingCount = summaryTotals.pendingOsCount;
      if (includeTypedStatus && pendingCount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`(${pendingCount} OS ainda não foram digitadas no ERP)`, 40, yPos);
        yPos += 20;
      } else {
        yPos += 10;
      }

      // Resumo do Período
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'bold');
      doc.text("Resumo do Período", 40, yPos);
      yPos += 15;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Horas em OS:`, 40, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(formatDuration(summaryTotals.osMinutes), 160, yPos);
      yPos += 12;

      doc.setFont(undefined, 'normal');
      doc.text(`Horas de Percurso:`, 40, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(formatDuration(summaryTotals.percursoMinutes), 160, yPos);
      yPos += 12;

      doc.setFont(undefined, 'normal');
      doc.text(`Aguardando Serviço:`, 40, yPos);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(formatDuration(summaryTotals.aguardandoMinutes), 160, yPos);
      yPos += 12;

      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Geral:`, 40, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(formatDuration(summaryTotals.totalMinutes), 160, yPos);
      yPos += 25;

      doc.setTextColor(100, 100, 100);

      // Inclusão de Gráficos no PDF
      if (includeDonutChart || includeBarChart) {
        const chartWidth = 240;
        let currentX = 40;
        let maxChartHeight = 0;

        if (includeDonutChart) {
          const donutEl = document.getElementById('print-donut-chart');
          if (donutEl) {
            const canvas = await html2canvas(donutEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const aspectRatio = canvas.width / canvas.height;
            const targetHeight = chartWidth / aspectRatio;
            doc.addImage(imgData, 'PNG', currentX, yPos, chartWidth, targetHeight);
            maxChartHeight = Math.max(maxChartHeight, targetHeight);
            currentX += chartWidth + 20;
          }
        }

        if (includeBarChart) {
          const barEl = document.getElementById('print-bar-chart');
          if (barEl) {
            const canvas = await html2canvas(barEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const aspectRatio = canvas.width / canvas.height;
            const targetHeight = chartWidth / aspectRatio;
            doc.addImage(imgData, 'PNG', currentX, yPos, chartWidth, targetHeight);
            maxChartHeight = Math.max(maxChartHeight, targetHeight);
          }
        }

        yPos += maxChartHeight + 25;
      }

      // Tabelas de dados agrupados
      const grouped = groupReportData();
      
      Object.keys(grouped).forEach((key) => {
        const data = grouped[key];
        let total = 0;

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
          
          const isPercurso = !!os.is_percurso;
          let serviceName = isPercurso ? 'Percurso (Tempo de Deslocamento)' : (os.servico_executado || '-');
          if (!isPercurso && os.agregado && os.numero_agregado) {
            serviceName = `[Agregado: ${os.numero_agregado}] ${serviceName}`;
          }
          
          const row: any = [
            format(parseISO(os.recordDate), 'dd/MM/yyyy'),
            os.userDisplayName,
            os.af || '-',
            isPercurso ? '-' : (os.os || '-'),
            serviceName,
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
          
          row.is_percurso = isPercurso;
          return row;
        });

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
            0: { cellWidth: 50 },
            1: { cellWidth: 80 },
            2: { cellWidth: 50 },
            3: { cellWidth: 50 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 50 },
            6: { cellWidth: 50 },
          },
          didParseCell: (hookData) => {
            const rawRow: any = hookData.row.raw;
            if (rawRow && rawRow.is_percurso) {
              hookData.cell.styles.fillColor = [254, 242, 242];
              hookData.cell.styles.textColor = [220, 38, 38];
              hookData.cell.styles.fontStyle = 'bold';
            }
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

  const filterCount = activeFilterChips.length;
  const filterCountBadge = filterCount > 0 && (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow"
      data-testid="report-filter-count"
    >
      {filterCount}
    </span>
  );

  const filterChips = filterCount > 0 && (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar" data-testid="report-filter-chips">
      {activeFilterChips.map(chip => (
        <span
          key={chip.key}
          className="flex shrink-0 items-center rounded-full bg-primary/10 pl-2.5 text-xs font-semibold text-primary"
          data-testid="report-filter-chip"
        >
          <span className="max-w-[180px] truncate">{chip.label}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/10"
            aria-label={`Remover filtro ${chip.label}`}
            onClick={() => removeFilter(chip.key)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );

  const singleCalendar = (
    <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} initialFocus />
  );
  const rangeCalendar = (
    <Calendar mode="range" selected={dateRange} onSelect={setDateRange} locale={ptBR} initialFocus />
  );

  const reportDescription = (
    <>
      O relatório usará as <strong>{filteredOSList.length} Ordens de Serviço</strong> filtradas.
      {summaryTotals.pendingOsCount > 0 && <span className="block mt-1 text-red-600 font-medium italic">({summaryTotals.pendingOsCount} OS pendentes de digitação)</span>}
    </>
  );

  const reportOptions = (
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
  );

  const reportButtons = (
    <>
      <Button variant="outline" className="flex-1 h-11 lg:h-10" onClick={handleGenerateCSV}>Exportar CSV</Button>
      <Button className="flex-1 h-11 lg:h-10" onClick={handleGeneratePDF} disabled={isGeneratingPdf}>
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
    </>
  );

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background max-w-7xl mx-auto w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      {isCompact ? (
        <div
          className="sticky z-30 -mx-4 -mt-4 mb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-2 pb-2 transition-[top] duration-300 ease-out"
          style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
          data-testid="report-mobile-header"
        >
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2" asChild>
              <Link to={`/${company}/service-orders`} aria-label="Voltar para Ordens de Serviço" onClick={() => tap()}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="flex-1 min-w-0 truncate text-lg font-bold text-primary">Relatório Geral</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => { tap(); loadBatchData(); }}
              disabled={isFetching}
              aria-label="Recarregar"
              data-testid="report-refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10 shrink-0 text-primary border-primary/30"
              onClick={openFilters}
              aria-label="Filtros"
              data-testid="report-filter-button"
            >
              <Filter className="h-4 w-4" />
              {filterCountBadge}
            </Button>
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={openReport}
              aria-label="Gerar relatório"
              data-testid="report-generate"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-1.5 flex items-center gap-1">
            <ToggleGroup
              type="single"
              value={dateMode}
              onValueChange={(v) => { if (v) { tap(); setDateMode(v as 'single' | 'range'); } }}
              className="shrink-0 gap-0 rounded-md bg-muted p-0.5"
              aria-label="Modo de data"
            >
              <ToggleGroupItem value="single" className="h-9 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm">Dia</ToggleGroupItem>
              <ToggleGroupItem value="range" className="h-9 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm">Período</ToggleGroupItem>
            </ToggleGroup>
            {dateMode === 'single' ? (
              <div className="flex flex-1 min-w-0 items-center">
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setSelectedDate(subDays(selectedDate, 1))} aria-label="Dia anterior">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="h-10 flex-1 min-w-0 px-1 font-bold tabular-nums" data-testid="report-date-label">
                      {format(selectedDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">{singleCalendar}</PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Próximo dia">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-10 flex-1 min-w-0 px-1 font-bold tabular-nums" data-testid="report-date-label">
                    {dateRange?.from ? format(dateRange.from, 'dd/MM') : 'Início'} – {dateRange?.to ? format(dateRange.to, 'dd/MM') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">{rangeCalendar}</PopoverContent>
              </Popover>
            )}
          </div>

          {filterChips && <div className="mt-1.5">{filterChips}</div>}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-primary">
              <img src="/icons/tela_inicial/7.png" alt="" className="h-12 w-auto object-contain" />
              Relatório Administrativo ({branding.name})
            </h1>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={loadBatchData}
                disabled={isFetching}
                title="Recarregar snapshot"
                aria-label="Recarregar"
                data-testid="report-refresh"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
              <Button variant="outline" onClick={openFilters} className="relative" data-testid="report-filter-button">
                <Filter className="mr-2 h-4 w-4" /> Filtros{filterCount > 0 && ` (${filterCount})`}
              </Button>
              <Button variant="default" onClick={openReport} className="flex items-center gap-2" data-testid="report-generate">
                <FileText className="h-4 w-4" /> Gerar Relatório
              </Button>
              <Button variant="outline" onClick={() => navigate(`/${company}/service-orders`)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
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
                      <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
                      <Popover><PopoverTrigger asChild><Button variant="ghost" className="flex-1 font-bold" data-testid="report-date-label">{format(selectedDate, "dd/MM/yyyy")}</Button></PopoverTrigger><PopoverContent className="w-auto p-0">{singleCalendar}</PopoverContent></Popover>
                      <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="range">
                    <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full text-left">{dateRange?.from ? format(dateRange.from, "dd/MM/yyyy") : 'Início'} - {dateRange?.to ? format(dateRange.to, "dd/MM/yyyy") : 'Fim'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0">{rangeCalendar}</PopoverContent></Popover>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            {filterChips && <div className="lg:col-span-2 self-end">{filterChips}</div>}
          </div>
        </>
      )}

      <ReportCharts
        dateMode={dateMode}
        selectedDate={selectedDate}
        dailyChartData={dailyChartData}
        monthlyChartData={monthlyChartData}
        dailyTimes={dailyTimes}
        summaryTotals={summaryTotals}
        onSelectDay={showDaySummary}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 lg:p-6">
          <CardTitle className="text-base lg:text-xl">Ordens de Serviço ({filteredOSList.length})</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortDaysDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="h-10 px-2 text-xs font-medium flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label="Inverter ordem por data"
            data-testid="report-sort"
          >
            <ArrowDownUp className="h-4 w-4" />
            {sortDaysDirection === 'asc' ? 'Antigas' : 'Recentes'}
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-4 lg:px-6 lg:pb-6">
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

          <div className="space-y-4 lg:space-y-6">
            {filteredOSList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-base font-semibold">Nenhuma Ordem de Serviço encontrada.</p>
                <p className="text-xs mt-1">Tente ajustar os filtros ou selecionar outro período.</p>
              </div>
            ) : (
              filteredOSList.map(os => (
                <ServiceOrderListDisplay
                  key={os.id}
                  group={os}
                  readOnly={true}
                  additionalHeader={
                    <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 space-y-1.5" data-testid="report-os-header">
                      <p className="text-base font-bold text-foreground leading-tight">{os.userDisplayName}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground tabular-nums">{format(parseISO(os.recordDate), 'dd/MM/yyyy')}</span>
                        {os.confirmed ? (
                          <span className="flex items-center rounded-full bg-green-600/10 pl-3 text-xs font-bold text-green-700 dark:text-green-400">
                            <Check className="mr-1 h-3.5 w-3.5" /> Digitado
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-full text-green-700 dark:text-green-400 hover:bg-green-600/10"
                              onClick={() => { setUnconfirmOrderId(os.id); setIsUnconfirmDialogOpen(true); }}
                              aria-label="Remover status Digitado"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </span>
                        ) : (
                          <Button variant="outline" className="h-10" onClick={() => { tap(); confirmOrder(os.id); }}>
                            Marcar Digitado
                          </Button>
                        )}
                      </div>
                    </div>
                  }
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ReportFilterPanel
        open={isFilterPanelOpen}
        onOpenChange={setIsFilterPanelOpen}
        value={filters}
        onApply={setFilters}
        users={users}
        professions={availableProfessions}
        shifts={availableShifts}
        previewCount={previewCount}
      />

      {isCompact ? (
        <Drawer open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} shouldScaleBackground={false}>
          <DrawerContent className="max-h-[92vh] rounded-none">
            <div className="overflow-y-auto overscroll-contain">
              <DrawerHeader className="text-left">
                <DrawerTitle>Gerar Relatório</DrawerTitle>
                <DrawerDescription>{reportDescription}</DrawerDescription>
              </DrawerHeader>
              <div className="px-4">{reportOptions}</div>
            </div>
            <DrawerFooter className="flex-row border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">{reportButtons}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Gerar Relatório</DialogTitle>
              <DialogDescription>{reportDescription}</DialogDescription>
            </DialogHeader>
            {reportOptions}
            <DialogFooter className="gap-2">{reportButtons}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
