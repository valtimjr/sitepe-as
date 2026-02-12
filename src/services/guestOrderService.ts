import { v4 as uuidv4 } from 'uuid';
import { localDb, ServiceOrderItem } from './localDbService';
import { saveDailyServiceOrder } from './partListService';
import { format } from 'date-fns';
import { DailyServiceOrder, ServiceOrderData } from '@/types/supabase';

const GUEST_ORDERS_STORAGE_KEY = 'autoboard_guest_orders';

export const getGuestOrders = (): ServiceOrderData[] => {
  const saved = localStorage.getItem(GUEST_ORDERS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const saveGuestOrders = (orders: ServiceOrderData[]) => {
  localStorage.setItem(GUEST_ORDERS_STORAGE_KEY, JSON.stringify(orders));
};

export const syncGuestOrdersToSupabase = async (userId: string) => {
  const guestOrders = getGuestOrders();
  if (guestOrders.length === 0) return;

  console.log('[GuestOrderService] Iniciando sincronização de ordens guest para o usuário:', userId);

  // Agrupar ordens por data (mesmo que no guest a maioria seja do dia atual)
  // Por simplicidade, vamos assumir a data atual para ordens criadas como guest
  const today = format(new Date(), 'yyyy-MM-dd');
  
  try {
    // Busca ordens existentes do usuário para hoje
    const { data: existingDaily } = await await import('@/integrations/supabase/client').then(m => 
      m.supabase.from('daily_service_orders').select('*').eq('user_id', userId).eq('date', today).single()
    );

    const existingOsList = (existingDaily?.os_list as ServiceOrderData[]) || [];
    
    // Mescla as ordens (evitando duplicatas básicas por ID)
    const mergedOsList = [...existingOsList];
    guestOrders.forEach(guestOrder => {
      if (!mergedOsList.find(o => o.id === guestOrder.id)) {
        mergedOsList.push(guestOrder);
      }
    });

    const dailyOrder: Omit<DailyServiceOrder, 'id'> = {
      user_id: userId,
      date: today,
      user_badge: null, // Será preenchido pelo perfil no sync
      user_name: null,
      os_list: mergedOsList,
      updated_at: new Date().toISOString()
    };

    const { error } = await import('@/integrations/supabase/client').then(m => 
      m.supabase.from('daily_service_orders').upsert(dailyOrder, { onConflict: 'user_id,date' })
    );

    if (!error) {
      console.log('[GuestOrderService] Sincronização concluída. Limpando ordens guest.');
      localStorage.removeItem(GUEST_ORDERS_STORAGE_KEY);
    }
  } catch (error) {
    console.error('[GuestOrderService] Falha ao sincronizar:', error);
  }
};