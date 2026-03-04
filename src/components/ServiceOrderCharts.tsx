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

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#1e40af', '#1e3a8a'];

const MonthlyPerformanceContent: React.FC<{ currentDate: Date }> = ({ currentDate }) => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ date: string; minutes: number }[]>([]);
  const [totalMonthlyMinutes, setTotalMonthlyMinutes] = useState(0);

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
          .gte('date', start)
          .lte('date', end);

        if (error) throw error;

        // Process data
        const daysMap = new Map<string, number>();
        let total = 0;

        // Initialize all days with 0
        const daysInMonth = eachDayOfInterval({
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        });

        daysInMonth.forEach(day => {
          daysMap.set(format(day, 'yyyy-MM-dd'), 0);
        });

        // Fill with actual data
        data?.forEach(record => {
          const osList = record.os_list as any[]; // Type assertion needed for JSONB
          if (Array.isArray(osList)) {
            const dayMinutes = osList.reduce((acc: number, os: any) => {
              return acc + calculateDuration(os.hora_inicio, os.hora_final);
            }, 0);
            
            daysMap.set(record.date, dayMinutes);
            total += dayMinutes;
          }
        });

        const chartData = Array.from(daysMap.entries()).map(([date, minutes]) => ({
          date,
          day: format(parseISO(date), 'dd'),
          minutes,
          hours: Number((minutes / 60).toFixed(1)) // For tooltip
        }));

        setMonthlyData(chartData);
        setTotalMonthlyMinutes(total);

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
          <div className="text-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Trabalhado</p>
            <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {formatDuration(totalMonthlyMinutes)}
            </p>
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
                  formatter={(value: number) => [formatDuration(value), 'Tempo']}
                  labelFormatter={(label) => `Dia ${label}`}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="#2563eb" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
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
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);

  // Prepare data for Daily Donut Chart
  const dailyData = useMemo(() => {
    const data = osList
      .filter(os => os.hora_inicio && os.hora_final)
      .map(os => ({
        name: os.os || os.af || 'Sem ID',
        value: calculateDuration(os.hora_inicio, os.hora_final),
        fullData: os
      }))
      .filter(item => item.value > 0);

    return data;
  }, [osList]);

  const totalDailyMinutes = useMemo(() => {
    return dailyData.reduce((acc, curr) => acc + curr.value, 0);
  }, [dailyData]);

  // Custom label for Pie Chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show if slice is big enough
    if (percent < 0.05) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} className="font-bold drop-shadow-md">
        <tspan x={x} dy="-0.5em" textAnchor="middle">{name}</tspan>
        <tspan x={x} dy="1.2em" textAnchor="middle">{formatDuration(value)}</tspan>
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
                      {dailyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
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

          <Dialog open={isMonthlyOpen} onOpenChange={setIsMonthlyOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <BarChart3 className="mr-2 h-4 w-4" />
                Desempenho Mensal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <MonthlyPerformanceContent currentDate={currentDate} />
            </DialogContent>
          </Dialog>
        </div>
      </PopoverContent>
    </Popover>
  );
};
