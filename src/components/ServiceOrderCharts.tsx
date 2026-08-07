import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PieChart as PieChartIcon, BarChart3, Loader2 } from 'lucide-react';
import { ServiceOrderData } from '@/services/partListService';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

import { useCompany } from '@/context/CompanyContext';
import { calculateDuration, formatDuration } from '@/lib/utils';
import { calculateDailyTimesAndGaps } from '@/services/shiftService';

const BLUE_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#1e40af', '#1e3a8a'];

const BarChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
  }
  return null;
};

const MonthlyPerformanceContent: React.FC<{ currentDate: Date; company: string }> = ({ currentDate, company }) => {
  const { user, profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [userShift, setUserShift] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<{ date: string; day: string; minutes: number; percursoMinutes: number; waitingMinutes: number; total: number }[]>([]);
  const [totalMonthlyOsMinutes, setTotalMonthlyOsMinutes] = useState(0);
  const [totalMonthlyPercursoMinutes, setTotalMonthlyPercursoMinutes] = useState(0);
  const [totalMonthlyWaitingMinutes, setTotalMonthlyWaitingMinutes] = useState(0);

  useEffect(() => {
    const fetchUserShift = async () => {
      if (!profile?.shift_code) return;
      try {
        const { data } = await supabase
          .from('shifts')
          .select('id, name, ref_code, entry_time, exit_time')
          .eq('ref_code', profile.shift_code)
          .eq('company', company)
          .maybeSingle();
        if (data) setUserShift(data);
      } catch (err) {
        console.error('Error fetching shift:', err);
      }
    };
    fetchUserShift();
  }, [profile?.shift_code, company]);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      if (!user) return;
      
      setLoading(true);
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      try {
        const { data, error } = await supabase
          .from('daily_service_orders')
          .select('date, os_list')
          .eq('user_id', user.id)
          .eq('company', company)
          .gte('date', start)
          .lte('date', end);

        if (error) throw error;

        const recordsMap = new Map<string, any[]>();
        data?.forEach(record => {
          if (Array.isArray(record.os_list)) {
            recordsMap.set(record.date, record.os_list);
          }
        });

        let totalOs = 0;
        let totalPercurso = 0;
        let totalWaiting = 0;

        const daysInMonth = eachDayOfInterval({
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        });

        const chartData = daysInMonth.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const osListForDay = recordsMap.get(dateStr) || [];
          
          const shiftRef = userShift || profile?.shift_code;
          const breakdown = calculateDailyTimesAndGaps(osListForDay, day, shiftRef);

          totalOs += breakdown.osMinutes;
          totalPercurso += breakdown.percursoMinutes;
          totalWaiting += breakdown.waitingMinutes;

          return {
            date: dateStr,
            day: format(day, 'dd'),
            minutes: breakdown.osMinutes,
            percursoMinutes: breakdown.percursoMinutes,
            waitingMinutes: breakdown.waitingMinutes,
            total: breakdown.totalMinutes
          };
        });

        setMonthlyData(chartData);
        setTotalMonthlyOsMinutes(totalOs);
        setTotalMonthlyPercursoMinutes(totalPercurso);
        setTotalMonthlyWaitingMinutes(totalWaiting);

      } catch (err) {
        console.error('Error fetching monthly data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [user, currentDate, company, userShift, profile?.shift_code]);

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-center capitalize">
          Desempenho de {format(currentDate, 'MMMM', { locale: ptBR })}
        </DialogTitle>
      </DialogHeader>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="text-center bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Horas em OS</p>
              <p className="text-base sm:text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {formatDuration(totalMonthlyOsMinutes)}
              </p>
            </div>
            <div className="text-center bg-red-50/50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Percurso</p>
              <p className="text-base sm:text-xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                {formatDuration(totalMonthlyPercursoMinutes)}
              </p>
            </div>
            <div className="text-center bg-green-50/50 dark:bg-green-950/20 p-2.5 rounded-lg border border-green-100/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Aguardando</p>
              <p className="text-base sm:text-xl font-extrabold text-green-600 dark:text-green-400 mt-1">
                {formatDuration(totalMonthlyWaitingMinutes)}
              </p>
            </div>
            <div className="text-center bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Geral</p>
              <p className="text-base sm:text-xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                {formatDuration(totalMonthlyOsMinutes + totalMonthlyPercursoMinutes + totalMonthlyWaitingMinutes)}
              </p>
            </div>
          </div>

          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${Math.floor(value / 60)}h`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  content={<BarChartTooltip />}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar
                  dataKey="minutes"
                  name="Ordem de Serviço"
                  fill="#2563eb"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={25}
                />
                <Bar
                  dataKey="percursoMinutes"
                  name="Percurso"
                  fill="#dc2626"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={25}
                />
                <Bar
                  dataKey="waitingMinutes"
                  name="Aguardando Serviço"
                  fill="#16a34a"
                  stackId="a"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={25}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

interface ServiceOrderChartsProps {
  osList: ServiceOrderData[];
  currentDate: Date;
}

export const ServiceOrderCharts: React.FC<ServiceOrderChartsProps> = ({ osList, currentDate }) => {
  const { company } = useCompany();
  const { profile } = useSession();
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);
  const [userShift, setUserShift] = useState<any>(null);

  useEffect(() => {
    const fetchUserShift = async () => {
      if (!profile?.shift_code) return;
      try {
        const { data } = await supabase
          .from('shifts')
          .select('id, name, ref_code, entry_time, exit_time')
          .eq('ref_code', profile.shift_code)
          .eq('company', company)
          .maybeSingle();
        if (data) setUserShift(data);
      } catch (err) {
        console.error('Error fetching shift:', err);
      }
    };
    fetchUserShift();
  }, [profile?.shift_code, company]);

  const dailyBreakdown = useMemo(() => {
    const shiftRef = userShift || profile?.shift_code;
    return calculateDailyTimesAndGaps(osList, currentDate, shiftRef);
  }, [osList, currentDate, userShift, profile?.shift_code]);

  // Prepare data for Daily Donut Chart including OS, Percurso and Aguardando gaps
  const dailyData = useMemo(() => {
    const slices: Array<{
      name: string;
      value: number;
      timeStr?: string;
      color: string;
      isPercurso?: boolean;
      isWaiting?: boolean;
    }> = [];

    // Add OS and Percurso
    osList
      .filter(os => os.hora_inicio && os.hora_final)
      .forEach((os, idx) => {
        const duration = calculateDuration(os.hora_inicio, os.hora_final);
        if (duration <= 0) return;

        const isPercurso = !!os.is_percurso;
        const name = isPercurso
          ? (os.af ? `Percurso (AF: ${os.af})` : 'Percurso')
          : (os.os || os.af || 'Sem ID');

        slices.push({
          name,
          value: duration,
          timeStr: `${os.hora_inicio} - ${os.hora_final}`,
          color: isPercurso ? '#dc2626' : BLUE_COLORS[idx % BLUE_COLORS.length],
          isPercurso
        });
      });

    // Add Aguardando Serviço intervals
    dailyBreakdown.waitingIntervals.forEach((interval) => {
      if (interval.durationMinutes > 0) {
        slices.push({
          name: 'Aguardando Serviço',
          value: interval.durationMinutes,
          timeStr: `${interval.start} - ${interval.end}`,
          color: '#16a34a',
          isWaiting: true
        });
      }
    });

    return slices;
  }, [osList, dailyBreakdown]);

  const totalDailyMinutes = dailyBreakdown.totalMinutes;

  // Custom label for Pie Chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, timeStr }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.08) return null;

    const displayTime = timeStr || formatDuration(value);

    return (
      <text x={x} y={y} fill="#1e293b" textAnchor="middle" dominantBaseline="central" className="font-semibold text-[10px] fill-slate-800 dark:fill-slate-200">
        <tspan x={x} dy="-0.5em">{name}</tspan>
        <tspan x={x} dy="1.2em">{displayTime}</tspan>
      </text>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50">
          <PieChartIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-4" align="end">
        <div className="flex flex-col items-center space-y-4">
          <h3 className="font-semibold text-lg text-center">Desempenho Diário</h3>
          
          <div className="relative w-64 h-64">
            {dailyData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dailyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {dailyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number, name: string, item: any) => [
                        `${formatDuration(value)} (${item.payload.timeStr || ''})`,
                        item.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">{formatDuration(totalDailyMinutes)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sem dados de horas
              </div>
            )}
          </div>

          <div className="w-full grid grid-cols-4 gap-1.5 p-2 bg-muted/40 rounded-lg border text-[10px] sm:text-xs">
            <div className="text-center">
              <span className="text-[9px] text-muted-foreground uppercase font-bold">Horas OS</span>
              <p className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{formatDuration(dailyBreakdown.osMinutes)}</p>
            </div>
            <div className="text-center border-l border-r border-border px-0.5">
              <span className="text-[9px] text-muted-foreground uppercase font-bold">Percurso</span>
              <p className="font-extrabold text-red-600 dark:text-red-400 mt-0.5">{formatDuration(dailyBreakdown.percursoMinutes)}</p>
            </div>
            <div className="text-center border-r border-border pr-0.5">
              <span className="text-[9px] text-muted-foreground uppercase font-bold">Aguardando</span>
              <p className="font-extrabold text-green-600 dark:text-green-400 mt-0.5">{formatDuration(dailyBreakdown.waitingMinutes)}</p>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-muted-foreground uppercase font-bold">Total</span>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{formatDuration(dailyBreakdown.totalMinutes)}</p>
            </div>
          </div>

          <Dialog open={isMonthlyOpen} onOpenChange={setIsMonthlyOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <BarChart3 className="mr-2 h-4 w-4" />
                Desempenho Mensal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <MonthlyPerformanceContent currentDate={currentDate} company={company} />
            </DialogContent>
          </Dialog>
        </div>
      </PopoverContent>
    </Popover>
  );
};