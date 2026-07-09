import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Label } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PieChart as PieChartIcon, BarChart3, Loader2 } from 'lucide-react';
import { ServiceOrderData } from '@/services/partListService';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

import { useCompany } from '@/context/CompanyContext';
import { calculateDuration, formatDuration, calculateOsAndPercursoTimes } from '@/lib/utils';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#1e40af', '#1e3a8a'];

const MonthlyPerformanceContent: React.FC<{ currentDate: Date; company: string }> = ({ currentDate, company }) => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ date: string; day: string; minutes: number; percursoMinutes: number; hours: number }[]>([]);
  const [totalMonthlyOsMinutes, setTotalMonthlyOsMinutes] = useState(0);
  const [totalMonthlyPercursoMinutes, setTotalMonthlyPercursoMinutes] = useState(0);

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

        // Process data
        const daysMap = new Map<string, { minutes: number; percursoMinutes: number }>();
        let totalOs = 0;
        let totalPercurso = 0;

        // Initialize all days with 0
        const daysInMonth = eachDayOfInterval({
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        });

        daysInMonth.forEach(day => {
          daysMap.set(format(day, 'yyyy-MM-dd'), { minutes: 0, percursoMinutes: 0 });
        });

        // Fill with actual data
        data?.forEach(record => {
          const osList = record.os_list as any[]; // Type assertion needed for JSONB
          if (Array.isArray(osList)) {
            let dayMinutes = 0;
            let dayPercursoMinutes = 0;
            osList.forEach((os: any) => {
              const dur = calculateDuration(os.hora_inicio, os.hora_final);
              if (os.is_percurso) {
                dayPercursoMinutes += dur;
                totalPercurso += dur;
              } else {
                dayMinutes += dur;
                totalOs += dur;
              }
            });
            
            daysMap.set(record.date, { minutes: dayMinutes, percursoMinutes: dayPercursoMinutes });
          }
        });

        const chartData = Array.from(daysMap.entries()).map(([date, val]) => ({
          date,
          day: format(parseISO(date), 'dd'),
          minutes: val.minutes,
          percursoMinutes: val.percursoMinutes,
          hours: Number(((val.minutes + val.percursoMinutes) / 60).toFixed(1)) // For tooltip
        }));

        setMonthlyData(chartData);
        setTotalMonthlyOsMinutes(totalOs);
        setTotalMonthlyPercursoMinutes(totalPercurso);

      } catch (err) {
        console.error('Error fetching monthly data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [user, currentDate]);

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-center">
          Desempenho de {format(currentDate, 'MMMM', { locale: ptBR })}
        </DialogTitle>
      </DialogHeader>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Horas em OS</p>
              <p className="text-lg sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {formatDuration(totalMonthlyOsMinutes)}
              </p>
            </div>
            <div className="text-center bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Percurso</p>
              <p className="text-lg sm:text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                {formatDuration(totalMonthlyPercursoMinutes)}
              </p>
            </div>
            <div className="text-center bg-green-50/50 dark:bg-green-950/20 p-3 rounded-lg border border-green-100/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Geral</p>
              <p className="text-lg sm:text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">
                {formatDuration(totalMonthlyOsMinutes + totalMonthlyPercursoMinutes)}
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
                  formatter={(value: number, name: string) => [formatDuration(value), name === 'minutes' ? 'Ordem de Serviço' : 'Percurso']}
                  labelFormatter={(label) => `Dia ${label}`}
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
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);

  // Prepare data for Daily Donut Chart
  const dailyData = useMemo(() => {
    const data = osList
      .filter(os => os.hora_inicio && os.hora_final)
      .map(os => ({
        name: os.is_percurso
          ? (os.af ? `Deslocamento (AF: ${os.af})` : 'Deslocamento')
          : (os.os || os.af || 'Sem ID'),
        value: calculateDuration(os.hora_inicio, os.hora_final),
        fullData: os
      }))
      .filter(item => item.value > 0);

    return data;
  }, [osList]);

  const totalDailyMinutes = useMemo(() => {
    return dailyData.reduce((acc, curr) => acc + curr.value, 0);
  }, [dailyData]);

  const dailyTimes = useMemo(() => {
    let osMinutes = 0;
    let percursoMinutes = 0;
    osList.forEach(os => {
      const dur = calculateDuration(os.hora_inicio, os.hora_final);
      if (os.is_percurso) {
        percursoMinutes += dur;
      } else {
        osMinutes += dur;
      }
    });
    return {
      osMinutes,
      percursoMinutes,
      totalMinutes: osMinutes + percursoMinutes
    };
  }, [osList]);

  // Custom label for Pie Chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value, fullData }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show if slice is big enough
    if (percent < 0.05) return null;

    const timeStr = fullData ? `${fullData.hora_inicio} - ${fullData.hora_final}` : formatDuration(value);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} className="font-bold drop-shadow-md">
        <tspan x={x} dy="-0.5em" textAnchor="middle">{name}</tspan>
        <tspan x={x} dy="1.2em" textAnchor="middle">{timeStr}</tspan>
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
      <PopoverContent className="w-80 p-4" align="end">
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
                      {dailyData.map((entry, index) => {
                        const isPercurso = !!entry.fullData?.is_percurso;
                        const cellColor = isPercurso ? '#ef4444' : COLORS[index % COLORS.length];
                        return (
                          <Cell key={`cell-${index}`} fill={cellColor} />
                        );
                      })}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatDuration(value)}
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

          {dailyData.length > 0 && (
            <div className="w-full grid grid-cols-3 gap-2 p-2 bg-muted/40 rounded-lg border text-xs">
              <div className="text-center">
                <span className="text-[9px] text-muted-foreground uppercase font-bold">Horas em OS</span>
                <p className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{formatDuration(dailyTimes.osMinutes)}</p>
              </div>
              <div className="text-center border-l border-r border-border px-1">
                <span className="text-[9px] text-muted-foreground uppercase font-bold">Percurso</span>
                <p className="font-extrabold text-red-600 dark:text-red-400 mt-0.5">{formatDuration(dailyTimes.percursoMinutes)}</p>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-muted-foreground uppercase font-bold">Total Geral</span>
                <p className="font-extrabold text-green-600 dark:text-green-400 mt-0.5">{formatDuration(dailyTimes.totalMinutes)}</p>
              </div>
            </div>
          )}

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
