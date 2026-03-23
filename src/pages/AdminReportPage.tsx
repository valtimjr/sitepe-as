"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
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
  ClipboardList
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<any[]>([]); // To store records from the month for charts

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      showError('Acesso negado: Esta página é restrita a administradores e moderadores.');
      navigate(`/${company}`);
    }
  }, [loading, isAdmin, navigate, company]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch all users including badge
        console.log("[AdminReportPage] Fetching users as", user.id);
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, badge');
        
        if (userError) {
          console.error("[AdminReportPage] Error fetching users:", userError);
          throw userError;
        }
        console.log("[AdminReportPage] Found users:", userData?.length, userData);
        setUsers(userData || []);

        // 2. Fetch all service orders for the current month across ALL users
        const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

        console.log("[AdminReportPage] Fetching orders for range", start, "to", end);
        const { data: records, error: recordError } = await supabase
          .from('daily_service_orders')
          .select('id, user_id, date, os_list')
          .eq('company', company)
          .gte('date', start)
          .lte('date', end);

        if (recordError) {
          console.error("[AdminReportPage] Error fetching records:", recordError);
          throw recordError;
        }
        console.log("[AdminReportPage] Found records:", records?.length);
        setAllData(records || []);

      } catch (err) {
        console.error('Error fetching admin report data:', err);
        showError('Erro ao carregar dados do relatório.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, company, user]);

  // Daily Data for Donut Chart (Selected Date + Filtered by User)
  const dailyChartData = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayRecords = allData.filter(r => r.date === dateStr && (selectedUserId === 'all' || r.user_id === selectedUserId));
    
    const osDataMap = new Map<string, any>();
    
    dayRecords.forEach(record => {
      const osList = record.os_list as any[];
      if (Array.isArray(osList)) {
        osList.forEach(os => {
          if (os.hora_inicio && os.hora_final) {
            const duration = calculateDuration(os.hora_inicio, os.hora_final);
            const key = os.os || os.af || 'Sem ID';
            
            if (osDataMap.has(key)) {
              const existing = osDataMap.get(key);
              existing.value += duration;
            } else {
              osDataMap.set(key, {
                name: key,
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
  }, [allData, selectedDate, selectedUserId]);

  const totalDailyMinutes = dailyChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Monthly Data for Bar Chart (Filtered by User)
  const monthlyChartData = useMemo(() => {
    const daysMap = new Map<string, number>();
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate)
    });

    daysInMonth.forEach(day => {
      daysMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    allData.filter(r => selectedUserId === 'all' || r.user_id === selectedUserId).forEach(record => {
      const osList = record.os_list as any[];
      if (Array.isArray(osList)) {
        const dayMinutes = osList.reduce((acc, os) => acc + calculateDuration(os.hora_inicio, os.hora_final), 0);
        daysMap.set(record.date, (daysMap.get(record.date) || 0) + dayMinutes);
      }
    });

    return Array.from(daysMap.entries()).map(([date, minutes]) => ({
      date,
      day: format(parseISO(date), 'dd'),
      minutes,
      hours: Number((minutes / 60).toFixed(1))
    }));
  }, [allData, selectedDate, selectedUserId]);

  const totalMonthlyMinutes = monthlyChartData.reduce((acc, curr) => acc + curr.minutes, 0);

  // Filtered List of OS for Display (Selected Date + Filtered by User)
  const filteredOSList = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayRecords = allData.filter(r => r.date === dateStr && (selectedUserId === 'all' || r.user_id === selectedUserId));
    
    console.log("[AdminReportPage] Filtering list for", dateStr, "SelectedUser:", selectedUserId, "Records found:", dayRecords.length);
    
    const osList: (ServiceOrderData & { userDisplayName: string })[] = [];
    dayRecords.forEach(record => {
      const userProfile = users.find(u => u.id === record.user_id);
      const userDisplayName = userProfile
        ? `${userProfile.badge ? userProfile.badge + ' - ' : ''}${userProfile.first_name} ${userProfile.last_name || ''}`
        : 'Desconhecido';
      
      const recordOsList = record.os_list as any[];
      if (Array.isArray(recordOsList)) {
        recordOsList.forEach((os: any) => {
          osList.push({ ...os, userDisplayName });
        });
      }
    });

    return osList;
  }, [allData, selectedDate, selectedUserId, users]);

  const handlePrevDay = () => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 1)));
  const handleNextDay = () => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 1)));

  if (loading) {
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
              <CalendarIcon className="h-4 w-4" /> Seleção de Data
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center font-bold text-lg">
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* User Selector */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> Filtrar por Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.badge ? `${u.badge} - ` : ''}{u.first_name} {u.last_name || ''} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Daily Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> Desempenho Diário
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-64 w-full relative">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dailyChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderCustomPieLabel}
                      labelLine={false}
                    >
                      {dailyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>

                    <RechartsTooltip formatter={(value: number) => formatDuration(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                  Sem dados para este dia
                </div>
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
              <BarChart3 className="h-4 w-4" /> Desempenho Mensal ({format(selectedDate, 'MMMM', { locale: ptBR })})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(val) => `${Math.floor(val / 60)}h`} />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatDuration(value), 'Tempo']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="minutes" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground mr-2">Total no mês:</span>
              <span className="font-bold text-blue-600">{formatDuration(totalMonthlyMinutes)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OS List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Ordens de Serviço do Dia
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
                      Usuário: {os.userDisplayName}
                    </span>
                  </div>

                  <ServiceOrderListDisplay
                    group={os}
                    readOnly={true}
                  />
                </div>
              ))}

            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma ordem de serviço registrada para este dia.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportPage;