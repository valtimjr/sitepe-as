"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/supabase';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  checkPageAccess: (path: string) => boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  checkPageAccess: () => false,
});

export const useSession = () => useContext(SessionContext);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SessionContext] Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('[SessionContext] Erro inesperado ao buscar perfil:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const checkPageAccess = (path: string): boolean => {
    // Se ainda está carregando, bloqueia por segurança
    if (isLoading) return false;
    
    // Admin sempre tem acesso
    if (profile?.role === 'admin') return true;

    // Regras básicas de acesso por rota
    const accessRules: Record<string, string[]> = {
      '/admin': ['admin', 'moderator'],
      '/menu-manager': ['admin', 'moderator'],
      '/time-tracking': ['admin', 'moderator', 'user'],
      '/custom-menu-view': ['admin', 'moderator', 'user'],
      '/manage-tags': ['admin', 'moderator']
    };

    const allowedRoles = accessRules[path];
    
    // Se não houver regra específica, o acesso é público ou permitido para usuários logados
    if (!allowedRoles) return true;

    // Verifica se o usuário tem uma das roles permitidas
    return profile ? allowedRoles.includes(profile.role) : false;
  };

  useEffect(() => {
    // 1. Verificar sessão inicial de forma segura com Timeout para não travar em loading infinito
    const checkInitialSession = async () => {
      // Criamos um timeout de 5 segundos para a requisição inicial do Supabase
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SESSION_FETCH_TIMEOUT')), 5000)
      );

      try {
        console.log('[SessionContext] Verificando sessão inicial no localStorage/Supabase...');
        
        const fetchPromise = supabase.auth.getSession();
        const result: any = await Promise.race([fetchPromise, timeoutPromise]);
        
        const { data: { session }, error } = result;
        
        if (error) {
          console.error('[SessionContext] Erro ao buscar sessão inicial:', error.message);
          if (error.message?.includes('JWT') || error.message?.includes('token') || error.message?.includes('invalid')) {
            console.warn('[SessionContext] Token corrompido detectado. Limpando dados locais...');
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            });
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        console.error('[SessionContext] Erro ou Timeout na verificação inicial de sessão:', err.message);
        
        // Se der timeout ou erro de conexão, limpa os estados locais para não travar carregando
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialSession();

    // 2. Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[SessionContext] Evento de Auth: ${event}`);
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // Timeout para a busca de perfil para não travar se a conexão cair bem na hora
        const profileTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), 4000)
        );
        
        try {
          await Promise.race([fetchProfile(currentUser.id), profileTimeout]);
        } catch (err: any) {
          console.warn('[SessionContext] Não foi possível carregar o perfil a tempo:', err.message);
        }
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          console.log('[SessionContext] Desconectado. Limpando storage...');
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading, refreshProfile, checkPageAccess }}>
      {children}
    </SessionContext.Provider>
  );
};