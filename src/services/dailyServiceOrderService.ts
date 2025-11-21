import { supabase } from '@/integrations/supabase/client';
import { DailyServiceOrder, UserProfile } from '@/types/supabase';
import { format, parseISO, differenceInMinutes, isValid } from 'date-fns';

interface FetchDailyServiceOrdersFilters {
  startDate?: Date;
  endDate?: Date;
  user_id?: string;
  af_number?: string;
  searchQuery?: string; // Para buscar em AF, OS, serviço, peças
}

/**
 * Busca ordens de serviço diárias do Supabase com base em filtros.
 * @param filters Objeto contendo os critérios de filtro.
 * @returns Uma lista de DailyServiceOrder.
 */
export const fetchDailyServiceOrders = async (filters: FetchDailyServiceOrdersFilters): Promise<DailyServiceOrder[]> => {
  let query = supabase
    .from('daily_service_orders')
    .select('*')
    .order('date', { ascending: false }); // Ordena pela data mais recente primeiro

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters.startDate) {
    query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
  }

  if (filters.endDate) {
    query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
  }

  if (filters.af_number) {
    // Busca dentro do array JSONB 'os_list' por AF
    query = query.contains('os_list', [{ af: filters.af_number }]);
  }

  if (filters.searchQuery) {
    const searchPattern = `%${filters.searchQuery.toLowerCase()}%`;
    // Busca em 'user_badge', 'user_name' e dentro do JSONB 'os_list'
    query = query.or(`user_badge.ilike.${searchPattern},user_name.ilike.${searchPattern},os_list.cs.{"af": "${filters.searchQuery}"},os_list.cs.{"servico_executado": "${filters.searchQuery}"},os_list.cs.{"parts": [{"codigo_peca": "${filters.searchQuery}"}]},os_list.cs.{"parts": [{"descricao": "${filters.searchQuery}"}]}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily service orders:', error);
    throw new Error(`Erro ao buscar ordens de serviço diárias: ${error.message}`);
  }

  return data as DailyServiceOrder[];
};

/**
 * Calcula a duração total em minutos entre dois horários (HH:MM).
 * Lida com horários que cruzam a meia-noite.
 * @param startTime String no formato 'HH:MM'.
 * @param endTime String no formato 'HH:MM'.
 * @returns Duração em minutos, ou 0 se inválido.
 */
export const calculateDurationInMinutes = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 0;

  try {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let startDate = new Date(2000, 0, 1, startH, startM);
    let endDate = new Date(2000, 0, 1, endH, endM);

    // Se a hora final for menor que a inicial, assume que passou da meia-noite
    if (endDate.getTime() < startDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1);
    }

    if (!isValid(startDate) || !isValid(endDate)) return 0;

    return differenceInMinutes(endDate, startDate);
  } catch (e) {
    console.error('Error calculating duration:', e);
    return 0;
  }
};

/**
 * Formata minutos totais para HHh MMm.
 * @param totalMinutes Total de minutos.
 * @returns String formatada.
 */
export const formatMinutesToHoursAndMinutes = (totalMinutes: number): string => {
  if (totalMinutes < 0) return 'Inválido';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};