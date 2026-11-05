import React, { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarSearch } from 'lucide-react';
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
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsCompact } from '@/hooks/use-compact';
import { tap } from '@/lib/haptics';
import { cn, formatDuration } from '@/lib/utils';
import type { ProcessedSnapshot } from '@/services/adminReportSnapshotService';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#1e40af', '#1e3a8a'];
const BARS_PER_SCREEN = 14;

type Panel = 'summary' | 'history';
type DailySlice = ProcessedSnapshot['dailyChartSlices'][number];
type MonthlySlice = ProcessedSnapshot['monthlyChartSlices'][number];

interface Totals {
  os: number;
  percurso: number;
  waiting: number;
  total: number;
}

interface ReportChartsProps {
  dateMode: 'single' | 'range';
  selectedDate: Date;
  dailyChartData: DailySlice[];
  monthlyChartData: MonthlySlice[];
  dailyTimes: { osMinutes: number; percursoMinutes: number; waitingMinutes: number; totalMinutes: number };
  summaryTotals: { osMinutes: number; percursoMinutes: number; aguardandoMinutes: number; totalMinutes: number };
  /** "Ver resumo deste dia": muda para o modo Dia na data tocada. */
  onSelectDay: (date: Date) => void;
}

const BarChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const activePayload = payload.filter((item: any) => item.value > 0);
  if (activePayload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-500 dark:text-slate-400">Dia {label}</p>
      {activePayload.map((item: any, idx: number) => {
        let displayName = 'OS';
        let textColor = 'text-blue-600 dark:text-blue-400';
        if (item.dataKey === 'percursoMinutes') {
          displayName = 'Percurso';
          textColor = 'text-red-600 dark:text-red-400';
        } else if (item.dataKey === 'waitingMinutes') {
          displayName = 'Aguardando Serviço';
          textColor = 'text-green-600 dark:text-green-400';
        }
        return (
          <p key={idx} className={`${textColor} font-bold flex items-center gap-1`}>
            <span>{displayName}:</span>
            <span>{formatDuration(item.value)}</span>
          </p>
        );
      })}
    </div>
  );
};

const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, time }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.10) return null;

  return (
    <text x={x} y={y} fill="#1e293b" textAnchor="middle" dominantBaseline="central" className="font-semibold text-[10px] fill-slate-800 dark:fill-slate-200">
      <tspan x={x} dy="-0.5em">{name}</tspan>
      <tspan x={x} dy="1.2em">{time}</tspan>
    </text>
  );
};

const TotalsRow: React.FC<{ totals: Totals }> = ({ totals }) => {
  const items = [
    { label: 'OS', value: totals.os, className: 'text-blue-600 dark:text-blue-400' },
    { label: 'Percurso', value: totals.percurso, className: 'text-red-600 dark:text-red-400' },
    { label: 'Aguardando', value: totals.waiting, className: 'text-green-600 dark:text-green-400' },
    { label: 'Total', value: totals.total, className: 'text-foreground' },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map(item => (
        <div key={item.label} className="min-w-0 rounded-lg border bg-muted/30 px-1 py-1.5 text-center">
          <span className="block truncate text-[9px] font-bold uppercase text-muted-foreground">{item.label}</span>
          <span className={cn('block truncate text-xs font-extrabold tabular-nums sm:text-sm', item.className)}>
            {formatDuration(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const sliceColor = (entry: DailySlice, i: number) =>
  entry.is_waiting ? '#16a34a' : entry.is_percurso ? '#ef4444' : COLORS[i % COLORS.length];

const ReportCharts: React.FC<ReportChartsProps> = ({
  dateMode,
  selectedDate,
  dailyChartData,
  monthlyChartData,
  dailyTimes,
  summaryTotals,
  onSelectDay,
}) => {
  const isCompact = useIsCompact();
  const [activePanel, setActivePanel] = useState<Panel>('summary');
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null);
  const [selectedBarDate, setSelectedBarDate] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const barScrollRef = useRef<HTMLDivElement>(null);

  const activeSlice = activeSliceIndex !== null ? dailyChartData[activeSliceIndex] : undefined;
  const selectedBar = monthlyChartData.find(d => d.date === selectedBarDate);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const scrollBars = isCompact && monthlyChartData.length > BARS_PER_SCREEN;

  // Dados novos invalidam a fatia tocada
  useEffect(() => {
    setActiveSliceIndex(null);
  }, [dailyChartData]);

  // Atualiza a aba quando o usuário arrasta o carrossel
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.intersectionRatio >= 0.6) setActivePanel((entry.target as HTMLElement).dataset.panel as Panel);
        });
      },
      { root, threshold: 0.6 },
    );
    if (summaryRef.current) observer.observe(summaryRef.current);
    if (historyRef.current) observer.observe(historyRef.current);
    return () => observer.disconnect();
  }, []);

  // Em períodos longos o histórico já abre mostrando o dia selecionado
  useEffect(() => {
    const el = barScrollRef.current;
    if (!el || !scrollBars) return;
    const index = monthlyChartData.findIndex(d => d.date === selectedDateStr);
    if (index < 0) return;
    el.scrollLeft = (index / monthlyChartData.length) * el.scrollWidth - el.clientWidth / 2;
  }, [scrollBars, monthlyChartData, selectedDateStr]);

  const showPanel = (panel: Panel) => {
    setActivePanel(panel);
    const root = scrollerRef.current;
    const target = panel === 'summary' ? summaryRef.current : historyRef.current;
    if (root && target) root.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
  };

  const handleBarClick = (state: any) => {
    const slice: MonthlySlice | undefined = state?.activePayload?.[0]?.payload;
    if (!slice) return;
    tap();
    setSelectedBarDate(prev => (prev === slice.date ? null : slice.date));
  };

  const viewDaySummary = () => {
    if (!selectedBar) return;
    tap();
    onSelectDay(parseISO(selectedBar.date));
    setSelectedBarDate(null);
    showPanel('summary');
  };

  const barOpacity = (entry: MonthlySlice) => (selectedBarDate && entry.date !== selectedBarDate ? 0.35 : 1);

  return (
    <div className="mb-6">
      <Tabs value={activePanel} onValueChange={v => { tap(); showPanel(v as Panel); }} className="mb-2 lg:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        ref={scrollerRef}
        className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible"
        data-no-swipe
        data-testid="report-charts"
      >
        <section
          ref={summaryRef}
          data-panel="summary"
          className="w-full shrink-0 snap-center snap-always lg:col-span-1"
          aria-label="Resumo"
          data-testid="report-chart-summary"
        >
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{dateMode === 'single' ? 'Resumo Diário' : 'Resumo do Período'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <TotalsRow
                totals={{
                  os: dailyTimes.osMinutes,
                  percurso: dailyTimes.percursoMinutes,
                  waiting: dailyTimes.waitingMinutes,
                  total: dailyTimes.totalMinutes,
                }}
              />
              <div id="print-donut-chart" className="relative h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dailyChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      dataKey="value"
                      label={renderCustomPieLabel}
                      onClick={(_: unknown, index: number) => {
                        tap();
                        setActiveSliceIndex(prev => (prev === index ? null : index));
                      }}
                    >
                      {dailyChartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={sliceColor(entry, i)}
                          opacity={activeSliceIndex !== null && activeSliceIndex !== i ? 0.4 : 1}
                          className="cursor-pointer outline-none"
                        />
                      ))}
                    </Pie>
                    {!isCompact && <RechartsTooltip formatter={(value: number) => formatDuration(value)} />}
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" data-testid="report-donut-center">
                  {activeSlice ? (
                    <>
                      <span className="max-w-[96px] truncate text-center text-[10px] font-semibold uppercase text-muted-foreground">
                        {activeSlice.name}
                      </span>
                      <span className="text-base font-bold" style={{ color: sliceColor(activeSlice, activeSliceIndex!) }}>
                        {formatDuration(activeSlice.value)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Total</span>
                      <span className="text-base font-bold text-primary">{formatDuration(dailyTimes.totalMinutes)}</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          ref={historyRef}
          data-panel="history"
          className="w-full shrink-0 snap-center snap-always lg:col-span-2"
          aria-label="Histórico"
          data-testid="report-chart-history"
        >
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histórico do Período</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <TotalsRow
                totals={{
                  os: summaryTotals.osMinutes,
                  percurso: summaryTotals.percursoMinutes,
                  waiting: summaryTotals.aguardandoMinutes,
                  total: summaryTotals.totalMinutes,
                }}
              />
              <div ref={barScrollRef} className={cn('w-full', scrollBars && 'overflow-x-auto')}>
                <div
                  id="print-bar-chart"
                  className="h-56 lg:h-64"
                  style={{ width: scrollBars ? `${(monthlyChartData.length / BARS_PER_SCREEN) * 100}%` : '100%' }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} onClick={handleBarClick} margin={{ left: -16, right: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${Math.floor(v / 60)}h`} tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        content={isCompact ? () => null : <BarChartTooltip />}
                        cursor={{ fill: 'hsl(var(--primary) / 0.08)' }}
                      />
                      <Bar dataKey="minutes" name="Ordem de Serviço" fill="#2563eb" stackId="a" className="cursor-pointer">
                        {monthlyChartData.map(entry => <Cell key={entry.date} fillOpacity={barOpacity(entry)} />)}
                      </Bar>
                      <Bar dataKey="percursoMinutes" name="Percurso" fill="#dc2626" stackId="a" className="cursor-pointer">
                        {monthlyChartData.map(entry => <Cell key={entry.date} fillOpacity={barOpacity(entry)} />)}
                      </Bar>
                      <Bar dataKey="waitingMinutes" name="Aguardando Serviço" fill="#16a34a" stackId="a" radius={[2, 2, 0, 0]} className="cursor-pointer">
                        {monthlyChartData.map(entry => <Cell key={entry.date} fillOpacity={barOpacity(entry)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {selectedBar && (
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5" data-testid="report-bar-detail">
                  <p className="text-xs font-bold text-foreground">Dia {format(parseISO(selectedBar.date), 'dd/MM/yyyy')}</p>
                  <TotalsRow
                    totals={{
                      os: selectedBar.minutes,
                      percurso: selectedBar.percursoMinutes,
                      waiting: selectedBar.waitingMinutes,
                      total: selectedBar.minutes + selectedBar.percursoMinutes + selectedBar.waitingMinutes,
                    }}
                  />
                  <Button variant="outline" size="sm" className="h-10 w-full" onClick={viewDaySummary}>
                    <CalendarSearch className="mr-2 h-4 w-4" /> Ver resumo deste dia
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="mt-2 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
        {(['summary', 'history'] as Panel[]).map(p => (
          <span
            key={p}
            className={cn('h-1.5 rounded-full transition-all', activePanel === p ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30')}
          />
        ))}
      </div>
    </div>
  );
};

export default ReportCharts;
