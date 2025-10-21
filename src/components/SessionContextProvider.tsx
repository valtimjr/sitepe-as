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
    console.log('SessionContextProvider: fetchUserProfile called for userId:', userId);
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
      console.log('SessionContextProvider: User profile fetched:', data);
      return data as UserProfile || null;
    } catch (error: any) {
      console.error('SessionContextProvider: Error fetching user profile (catch block):', error);
      return null;
    }
  }, []);

  // Função para buscar as regras de acesso às páginas
  const fetchPageAccessRules = useCallback(async (): Promise<PageAccessRule[]> => {
    console.log('SessionContextProvider: fetchPageAccessRules called.');
    try {
      const { data, error } = await supabase
        .from('page_access')
        .select('*');

      if (error) {
        console.error('SessionContextProvider: Error fetching page access rules from DB:', error);
        throw error;
      }
      console.log('SessionContextProvider: Page access rules fetched:', data);
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
          console.error('SessionContextProvider: Error getting initial session:', sessionError);
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
      console.log('SessionContextProvider: All data loaded. isLoadingSessionAndProfile set to false.');
    }
  }, [fetchUserProfile, fetchPageAccessRules]);


  // Inicializa sessão, perfil e regras de acesso
  useEffect(() => {
    console.log('SessionContextProvider: Initializing session, profile, and page access rules.');
    loadAllData(true); // Chamada inicial

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider: Auth state changed. Event:', event, 'Current Session:', currentSession);
        // Para mudanças de estado de autenticação, re-executamos a lógica de carregamento
        loadAllData(false, currentSession);
      }
    );

    return () => {
      console.log('SessionContextProvider: Cleaning up auth state change listener.');
      authListener.subscription.unsubscribe();
    };
  }, [loadAllData]); // Dependência de loadAllData

  // Função para verificar o acesso à página
  const checkPageAccess = useCallback((path: string): boolean => {
    console.log(`SessionContextProvider: checkPageAccess called for path: ${path}, current user role: ${profile?.role || 'guest'}`);
    const normalizedPath = path.split('/')[1] === 'signup' ? '/signup' : path;

    const rule = pageAccessRules.find(r => r.page_path === normalizedPath);

    if (!rule) {
      console.warn(`SessionContextProvider: No access rule found for path: ${normalizedPath}. Denying access.`);
      return false;
    }

    if (!session) {
      console.log(`SessionContextProvider: Guest user trying to access ${normalizedPath}. Guest access: ${rule.guest_access}`);
      return rule.guest_access;
    }

    if (!profile?.role) {
      console.warn(`SessionContextProvider: Authenticated user without loaded profile trying to access ${normalizedPath}. Denying access until profile is loaded.`);
      return false;
    }

    switch (profile.role) {
      case 'admin':
        console.log(`SessionContextProvider: Admin user trying to access ${normalizedPath}. Admin access: ${rule.admin_access}`);
        return rule.admin_access;
      case 'moderator':
        console.log(`SessionContextProvider: Moderator user trying to access ${normalizedPath}. Moderator access: ${rule.moderator_access}`);
        return rule.moderator_access;
      case 'user':
        console.log(`SessionContextProvider: Regular user trying to access ${normalizedPath}. User access: ${rule.user_access}`);
        return rule.user_access;
      default:
        console.log(`SessionContextProvider: Unknown role '${profile.role}' trying to access ${normalizedPath}. Denying access.`);
        return false;
    }
  }, [pageAccessRules, profile, session]);

  // Efeito para redirecionamento baseado no acesso
  useEffect(() => {
    console.log('SessionContextProvider: Redirection effect triggered. isLoading (context):', isLoadingSessionAndProfile, 'session (context):', session, 'profile (context):', profile, 'path:', location.pathname);
    if (!isLoadingSessionAndProfile) {
      const currentPath = location.pathname;
      const isLoginPage = currentPath === '/login';
      const isSignupPage = currentPath.startsWith('/signup');
      const isResetPasswordPage = currentPath === '/reset-password';
      const isForgotPasswordPage = currentPath === '/forgot-password';

      if (isLoginPage || isSignupPage || isResetPasswordPage || isForgotPasswordPage) {
        if (session && isLoginPage) {
          console.log('SessionContextProvider: Logged in user on login page, redirecting to /');
          navigate('/');
          showError('Você já está logado.');
        }
        return;
      }

      if (!checkPageAccess(currentPath)) {
        showError('Você não tem permissão para acessar esta página.');
        if (!session) {
          console.log('SessionContextProvider: Unauthenticated user without access, redirecting to /login');
          navigate('/login');
        } else {
          console.log('SessionContextProvider: Authenticated user without access, redirecting to /');
          navigate('/');
        }
      } else {
        console.log('SessionContextProvider: User has access to', currentPath);
      }
    } else {
      console.log('SessionContextProvider: Redirection effect skipped because isLoading is true.');
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