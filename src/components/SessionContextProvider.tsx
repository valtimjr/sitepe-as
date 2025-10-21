import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { showError } from '@/utils/toast';
import { PageAccessRule, UserProfile } from '@/types/supabase'; // Importar os tipos

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null; // Adicionar perfil ao contexto
  isLoading: boolean;
  pageAccessRules: PageAccessRule[]; // Adicionar regras de acesso às páginas
  checkPageAccess: (path: string) => boolean; // Função para verificar acesso
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // Estado para o perfil
  const [isLoading, setIsLoading] = useState(true);
  const [pageAccessRules, setPageAccessRules] = useState<PageAccessRule[]>([]); // Estado para regras de acesso
  const navigate = useNavigate();
  const location = useLocation();

  // Função para buscar o perfil do usuário
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, updated_at, role, badge')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
        throw error;
      }
      setProfile(data as UserProfile || null);
    } catch (error: any) {
      console.error('SessionContextProvider: Error fetching user profile:', error);
      setProfile(null);
    }
  }, []);

  // Função para buscar as regras de acesso às páginas
  const fetchPageAccessRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('page_access')
        .select('*');

      if (error) {
        throw error;
      }
      setPageAccessRules(data as PageAccessRule[] || []);
    } catch (error: any) {
      console.error('SessionContextProvider: Error fetching page access rules:', error);
      setPageAccessRules([]);
    }
  }, []);

  // Inicializa sessão, perfil e regras de acesso
  useEffect(() => {
    console.log('SessionContextProvider: Initializing session, profile, and page access rules.');
    const getInitialData = async () => {
      setIsLoading(true);
      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('SessionContextProvider: Error getting initial session:', sessionError);
      }
      setSession(initialSession);
      setUser(initialSession?.user || null);

      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user.id);
      } else {
        setProfile(null);
      }
      await fetchPageAccessRules();
      setIsLoading(false);
      console.log('SessionContextProvider: Initial data loaded.');
    };

    getInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider: Auth state changed. Event:', event, 'Session:', currentSession);
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        // Re-fetch page access rules on auth state change just in case (e.g., role change)
        await fetchPageAccessRules();
      }
    );

    return () => {
      console.log('SessionContextProvider: Cleaning up auth state change listener.');
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, fetchPageAccessRules]);

  // Função para verificar o acesso à página
  const checkPageAccess = useCallback((path: string): boolean => {
    // Para rotas dinâmicas como /signup/:uuid, normaliza para /signup
    const normalizedPath = path.split('/')[1] === 'signup' ? '/signup' : path;

    const rule = pageAccessRules.find(r => r.page_path === normalizedPath);

    if (!rule) {
      // Se não houver regra definida, por padrão, nega o acesso para segurança
      console.warn(`SessionContextProvider: No access rule found for path: ${normalizedPath}. Denying access.`);
      return false;
    }

    if (!profile?.role) {
      // Se não há perfil ou role, assume-se que não está autenticado ou perfil incompleto
      // E verifica se a página permite acesso para não autenticados (que não é o caso aqui, mas boa prática)
      // Para páginas públicas, a regra deve ter user_access: true
      return rule.user_access; // Se user_access for true, permite. Caso contrário, nega.
    }

    switch (profile.role) {
      case 'admin':
        return rule.admin_access;
      case 'moderator':
        return rule.moderator_access;
      case 'user':
        return rule.user_access;
      default:
        return false; // Role desconhecido, nega acesso
    }
  }, [pageAccessRules, profile]);

  // Efeito para redirecionamento baseado no acesso
  useEffect(() => {
    if (!isLoading) { // Certifica-se de que a sessão e o perfil foram carregados
      const currentPath = location.pathname;
      const isLoginPage = currentPath === '/login';
      const isSignupPage = currentPath.startsWith('/signup');
      const isResetPasswordPage = currentPath === '/reset-password';
      const isForgotPasswordPage = currentPath === '/forgot-password';

      // Páginas que são sempre acessíveis (login, signup, reset, forgot password)
      if (isLoginPage || isSignupPage || isResetPasswordPage || isForgotPasswordPage) {
        if (session && isLoginPage) {
          // Se logado e na página de login, redireciona para /
          navigate('/');
          showError('Você já está logado.');
        }
        return; // Permite acesso a essas páginas
      }

      // Para todas as outras páginas, verifica o acesso
      if (!checkPageAccess(currentPath)) {
        showError('Você não tem permissão para acessar esta página.');
        navigate('/'); // Redireciona para a página inicial
      }
    }
  }, [isLoading, session, location.pathname, navigate, checkPageAccess]);


  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading, pageAccessRules, checkPageAccess }}>
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