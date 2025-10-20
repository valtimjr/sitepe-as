"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner'; // Importar Toaster para mensagens

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

        // Redirecionamento baseado no estado de autenticação
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          if (location.pathname.startsWith('/admin')) {
            navigate('/login');
          }
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (location.pathname === '/login') {
            navigate('/admin'); // Redireciona para o admin se logado e na página de login
          }
        }
      }
    );

    // Verifica a sessão inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);
      if (!initialSession && location.pathname.startsWith('/admin')) {
        navigate('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Protege rotas de administração
  useEffect(() => {
    if (!isLoading && !session && location.pathname.startsWith('/admin')) {
      navigate('/login');
    }
  }, [isLoading, session, location.pathname, navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
      <Toaster /> {/* Adiciona o Toaster para mensagens globais */}
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