import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { showError } from '@/utils/toast';
import { PageAccessRule, UserProfile } from '@/types/supabase';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean; // Este será true até que a sessão E o perfil sejam carregados
  pageAccessRules: PageAccessRule[];
  checkPageAccess: (path: string) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Rotas que devem ser sempre acessíveis a convidados, independentemente das regras do DB
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/search-parts', '/parts-list', '/service-orders', '/schedule-view', '/custom-list', '/custom-menu-view'];
// Rotas que exigem autenticação, mas são acessíveis a todos os usuários logados (user, moderator, admin)
const AUTH_REQUIRED_ROUTES = ['/time-tracking', '/settings', '/my-custom-lists'];

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageAccessRules, setPageAccessRules] = useState<PageAccessRule[]>([]);
  const [isLoadingSessionAndProfile, setIsLoadingSessionAndProfile] = useState(true); // Novo estado para carregamento combinado
  const navigate = useNavigate();
  const location = useLocation();

  // Função para buscar o perfil do usuário
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, updated_at, role, badge')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.error('SessionContextProvider: Error fetching user profile from DB:', error);
        throw error;
      }
      return data as UserProfile || null;
    } catch (error: any) {
      console.error('SessionContextProvider: Error fetching user profile (catch block):', error);
      return null;
    }
  }, []);

  // Função para buscar as regras de acesso às páginas
  const fetchPageAccessRules = useCallback(async (): Promise<PageAccessRule[]> => {
    try {
      const { data, error } = await supabase
        .from('page_access')
        .select('*');

      if (error) {
        console.error('SessionContextProvider: Error fetching page access rules from DB:', error);
        throw error;
      }
      return data as PageAccessRule[] || [];
    } catch (error: any) {
      console.error('SessionContextProvider: Error fetching page access rules (catch block):', error);
      return [];
    }
  }, []);

  // Função centralizada para carregar todos os dados
  const loadAllData = useCallback(async (initialCall: boolean, currentSession?: Session | null) => {
    setIsLoadingSessionAndProfile(true);
    let sessionToUse = currentSession;
    let userToUse: User | null = null;

    try {
      if (initialCall) {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          // console.error('SessionContextProvider: Error getting initial session:', sessionError); // Removido log
        }
        sessionToUse = initialSession;
      }

      setSession(sessionToUse);
      userToUse = sessionToUse?.user || null;
      setUser(userToUse);

      let fetchedProfile: UserProfile | null = null;
      if (userToUse) {
        fetchedProfile = await fetchUserProfile(userToUse.id);
      }
      setProfile(fetchedProfile); // Este setProfile agora é aguardado antes de isLoading ser false

      const fetchedRules = await fetchPageAccessRules();
      setPageAccessRules(fetchedRules);

    } catch (e) {
      console.error('SessionContextProvider: Error during data fetch in loadAllData:', e);
    } finally {
      // Define isLoadingSessionAndProfile como false APENAS depois que todos os estados foram atualizados
      setIsLoadingSessionAndProfile(false);
    }
  }, [fetchUserProfile, fetchPageAccessRules]);


  // Inicializa sessão, perfil e regras de acesso
  useEffect(() => {
    loadAllData(true); // Chamada inicial

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Para mudanças de estado de autenticação, re-executamos a lógica de carregamento
        loadAllData(false, currentSession);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadAllData]); // Dependência de loadAllData

  // Função para verificar o acesso à página
  const checkPageAccess = useCallback((path: string): boolean => {
    const normalizedPath = path.split('/')[1] === 'signup' ? '/signup' : path.split('/')[1] === 'custom-list' ? '/custom-list' : path;
    const isAuthRequiredRoute = AUTH_REQUIRED_ROUTES.includes(normalizedPath);

    // 1. Se a sessão estiver carregando, permite apenas rotas públicas
    if (isLoadingSessionAndProfile) {
      return PUBLIC_ROUTES.includes(normalizedPath);
    }

    // 2. Se o usuário não está logado
    if (!session) {
      if (PUBLIC_ROUTES.includes(normalizedPath)) {
        return true;
      }
      // Verifica se há regra de convidado no DB
      const rule = pageAccessRules.find(r => r.page_path === normalizedPath);
      return rule?.guest_access || false;
    }

    // 3. Se o usuário está logado
    if (isAuthRequiredRoute) {
      return true; // Todos os usuários logados têm acesso a estas rotas
    }

    // 4. Verifica acesso baseado em regras do DB (para rotas não públicas/não AUTH_REQUIRED)
    const rule = pageAccessRules.find(r => r.page_path === normalizedPath);

    if (!rule) {
      // Se não houver regra no DB, e não for rota pública/AUTH_REQUIRED, nega por padrão
      return PUBLIC_ROUTES.includes(normalizedPath);
    }

    // 5. Verifica o acesso baseado na regra e no perfil
    switch (profile?.role) {
      case 'admin':
        return rule.admin_access;
      case 'moderator':
        return rule.moderator_access;
      case 'user':
        return rule.user_access;
      default:
        // Se o perfil não tem role (o que não deveria acontecer se o perfil foi carregado), nega.
        return false;
    }
  }, [pageAccessRules, profile, session, isLoadingSessionAndProfile]);

  // Efeito para redirecionamento baseado no acesso
  useEffect(() => {
    if (!isLoadingSessionAndProfile) {
      const currentPath = location.pathname;
      const normalizedPath = currentPath.split('/')[1] === 'signup' ? '/signup' : currentPath.split('/')[1] === 'custom-list' ? '/custom-list' : currentPath;
      const isLoginPage = normalizedPath === '/login';
      const isSignupPage = normalizedPath === '/signup';
      const isResetPasswordPage = normalizedPath === '/reset-password';
      const isForgotPasswordPage = normalizedPath === '/forgot-password';
      const isAuthPage = isLoginPage || isSignupPage || isResetPasswordPage || isForgotPasswordPage;

      // Se o usuário está logado, redireciona de páginas de autenticação
      if (session && isAuthPage) {
        navigate('/');
        showError('Você já está logado.');
        return;
      }

      // Verifica o acesso para todas as outras páginas
      if (!checkPageAccess(currentPath)) {
        showError('Você não tem permissão para acessar esta página.');
        if (!session) {
          navigate('/login');
        } else {
          navigate('/');
        }
      }
    }
  }, [isLoadingSessionAndProfile, session, location.pathname, navigate, checkPageAccess, profile]);


  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading: isLoadingSessionAndProfile, pageAccessRules, checkPageAccess }}>
      {children}
      <Toaster />
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};