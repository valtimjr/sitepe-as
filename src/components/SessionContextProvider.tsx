import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { showError } from '@/utils/toast';
import { PageAccessRule, UserProfile } from '@/types/supabase';
import { syncGuestOrdersToSupabase } from '@/services/guestOrderService';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  pageAccessRules: PageAccessRule[];
  checkPageAccess: (path: string) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Rotas que devem ser sempre acessíveis a convidados
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/search-parts', '/parts-list', '/schedule-view', '/custom-list', '/custom-menu-view', '/cookie-policy', '/guest-service-orders', '/service-orders'];
// Rotas que exigem autenticação
const AUTH_REQUIRED_ROUTES = ['/time-tracking', '/settings', '/my-custom-lists', '/admin'];

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageAccessRules, setPageAccessRules] = useState<PageAccessRule[]>([]);
  const [isLoadingSessionAndProfile, setIsLoadingSessionAndProfile] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserProfile || null;
    } catch (error) {
      return null;
    }
  }, []);

  const fetchPageAccessRules = useCallback(async (): Promise<PageAccessRule[]> => {
    try {
      const { data, error } = await supabase.from('page_access').select('*');
      if (error) throw error;
      return data as PageAccessRule[] || [];
    } catch (error) {
      return [];
    }
  }, []);

  const loadAllData = useCallback(async (initialCall: boolean, currentSession?: Session | null) => {
    if (initialCall) setIsLoadingSessionAndProfile(true);
    let sessionToUse = currentSession;

    try {
      if (initialCall) {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        sessionToUse = initialSession;
      }

      setSession(sessionToUse);
      const userToUse = sessionToUse?.user || null;
      setUser(userToUse);

      if (userToUse) {
        const fetchedProfile = await fetchUserProfile(userToUse.id);
        setProfile(fetchedProfile);
        
        // Sincroniza ordens offline ao logar
        try {
          await syncGuestOrdersToSupabase(userToUse.id);
        } catch (e) {
          console.error('Erro ao sincronizar ordens guest:', e);
        }
      } else {
        setProfile(null);
      }

      const fetchedRules = await fetchPageAccessRules();
      setPageAccessRules(fetchedRules);
    } finally {
      setIsLoadingSessionAndProfile(false);
    }
  }, [fetchUserProfile, fetchPageAccessRules]);

  useEffect(() => {
    loadAllData(true);
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      loadAllData(false, currentSession);
    });
    return () => authListener.subscription.unsubscribe();
  }, [loadAllData]);

  const checkPageAccess = useCallback((path: string): boolean => {
    const normalizedPath = path.split('/')[1] === 'signup' ? '/signup' : path.split('/')[1] === 'custom-list' ? '/custom-list' : path;
    
    if (isLoadingSessionAndProfile) return PUBLIC_ROUTES.includes(normalizedPath);
    if (!session) return PUBLIC_ROUTES.includes(normalizedPath);
    
    // Se está logado, tem acesso às rotas de auth e pode ser bloqueado por regras do banco em rotas de admin
    if (AUTH_REQUIRED_ROUTES.includes(normalizedPath)) {
      const rule = pageAccessRules.find(r => r.page_path === normalizedPath);
      if (!rule) return true; // Por padrão logado acessa se não houver restrição
      
      if (profile?.role === 'admin') return rule.admin_access;
      if (profile?.role === 'moderator') return rule.moderator_access;
      return rule.user_access;
    }
    
    return true;
  }, [pageAccessRules, profile, session, isLoadingSessionAndProfile]);

  useEffect(() => {
    if (!isLoadingSessionAndProfile) {
      const currentPath = location.pathname;
      if (!checkPageAccess(currentPath)) {
        if (!session) {
          navigate('/login');
        } else {
          navigate('/');
          showError('Você não tem permissão para acessar esta página.');
        }
      }
    }
  }, [isLoadingSessionAndProfile, session, location.pathname, navigate, checkPageAccess]);

  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading: isLoadingSessionAndProfile, pageAccessRules, checkPageAccess }}>
      {children}
      <Toaster />
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) throw new Error('useSession must be used within a SessionContextProvider');
  return context;
};