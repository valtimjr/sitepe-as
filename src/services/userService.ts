import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/supabase';

/**
 * Busca todos os perfis de usuário do Supabase.
 * @returns Uma lista de UserProfile.
 */
export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, badge, role')
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching all user profiles:', error);
    throw new Error(`Erro ao buscar perfis de usuário: ${error.message}`);
  }

  return data as UserProfile[];
};