import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        // Se o usuário faz logout e está em uma rota de admin, redireciona para login
        if ((event === 'SIGNED_OUT' || event === 'USER_DELETED') && location.pathname.startsWith('/admin')) {
          navigate('/login');
        }
        // A lógica de redirecionamento para /admin após login será tratada pelo redirectTo do Auth component
        // e pelo useEffect de proteção de rotas abaixo.
      }
    );

    // Verifica a sessão inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Este useEffect é responsável por proteger rotas de administração
  // e redirecionar usuários autenticados da página de login.
  useEffect(() => {
    if (!isLoading) {
      if (session) {
        // Se o usuário está autenticado e tenta acessar a página de login, redireciona para /admin
        if (location.pathname === '/login') {
          navigate('/admin');
        }
      } else {
        // Se o usuário NÃO está autenticado e tenta acessar uma rota de admin, redireciona para /login
        if (location.pathname.startsWith('/admin')) {
          navigate('/login');
        }
      }
    }
  }, [isLoading, session, location.pathname, navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
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