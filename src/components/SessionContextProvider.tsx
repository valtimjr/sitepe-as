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

  // Inicializa sessão, perfil e regras de acesso
  useEffect(() => {
    console.log('SessionContextProvider: Initializing session, profile, and page access rules.');
    const getInitialData = async () => {
      setIsLoadingSessionAndProfile(true); // Inicia o carregamento
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('SessionContextProvider: Error getting initial session:', sessionError);
        }
        setSession(initialSession);
        setUser(initialSession?.user || null);
        console.log('SessionContextProvider: Initial session after update:', initialSession, 'Initial user after update:', initialSession?.user);

        let fetchedProfile: UserProfile | null = null;
        if (initialSession?.user) {
          fetchedProfile = await fetchUserProfile(initialSession.user.id);
          setProfile(fetchedProfile);
        } else {
          setProfile(null);
          console.log('SessionContextProvider: Initial load - No user, profile set to null.');
        }
        
        const fetchedRules = await fetchPageAccessRules();
        setPageAccessRules(fetchedRules);

      } catch (e) {
        console.error('SessionContextProvider: Error during initial data fetch:', e);
      } finally {
        console.log('SessionContextProvider: Before setting isLoadingSessionAndProfile to false. Current profile state:', profile); // NOVO LOG
        setIsLoadingSessionAndProfile(false); // Finaliza o carregamento apenas após tentar carregar sessão e perfil
        console.log('SessionContextProvider: Initial data loading finished. isLoadingSessionAndProfile set to false.');
      }
    };

    getInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider: Auth state changed. Event:', event, 'Current Session:', currentSession);
        setIsLoadingSessionAndProfile(true); // Inicia o carregamento novamente na mudança de estado de autenticação
        setSession(currentSession);
        setUser(currentSession?.user || null);
        console.log('SessionContextProvider: State updated by auth listener. Current session:', currentSession, 'Current user:', currentSession?.user);

        let fetchedProfile: UserProfile | null = null;
        if (currentSession?.user) {
          fetchedProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(fetchedProfile);
        } else {
          setProfile(null);
          console.log('SessionContextProvider: Auth listener - No user, profile set to null.');
        }
        
        const fetchedRules = await fetchPageAccessRules();
        setPageAccessRules(fetchedRules);

        console.log('SessionContextProvider: Before setting isLoadingSessionAndProfile to false in auth listener. Current profile state:', profile); // NOVO LOG
        setIsLoadingSessionAndProfile(false); // Finaliza o carregamento
        console.log('SessionContextProvider: Auth state change processing finished. isLoadingSessionAndProfile set to false.');
      }
    );

    return () => {
      console.log('SessionContextProvider: Cleaning up auth state change listener.');
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, fetchPageAccessRules]);

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