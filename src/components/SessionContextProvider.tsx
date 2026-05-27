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

// Chaves para cache local robusto e offline-first
const CACHE_KEYS = {
  SESSION: 'autoboard_cached_session',
  USER: 'autoboard_cached_user',
  PROFILE: 'autoboard_cached_profile',
};

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialização síncrona a partir do cache local para evitar qualquer piscar de tela ou sumiço de componentes
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.SESSION);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.USER);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Se já temos dados no cache, não precisamos travar a interface mostrando "carregando"
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem(CACHE_KEYS.SESSION);
    } catch {
      return true;
    }
  });

  // Função robusta de cache
  const updateLocalStorage = (newSession: Session | null, newUser: User | null, newProfile: UserProfile | null) => {
    try {
      if (newSession) {
        localStorage.setItem(CACHE_KEYS.SESSION, JSON.stringify(newSession));
        localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(newUser || newSession.user));
      } else {
        localStorage.removeItem(CACHE_KEYS.SESSION);
        localStorage.removeItem(CACHE_KEYS.USER);
      }

      if (newProfile) {
        localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(newProfile));
      } else if (!newSession) {
        localStorage.removeItem(CACHE_KEYS.PROFILE);
      }
    } catch (e) {
      console.warn('[SessionContext] Falha ao gravar cache local:', e);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SessionContext] Erro ao buscar perfil:', error.message);
        return;
      }

      if (data) {
        const userProfile = data as UserProfile;
        setProfile(userProfile);
        // Atualiza o cache local com os dados atualizados do banco
        updateLocalStorage(session, user, userProfile);
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
    // Admin sempre tem acesso
    if (profile?.role === 'admin') return true;

    const accessRules: Record<string, string[]> = {
      '/admin': ['admin', 'moderator'],
      '/menu-manager': ['admin', 'moderator'],
      '/time-tracking': ['admin', 'moderator', 'user'],
      '/custom-menu-view': ['admin', 'moderator', 'user'],
      '/manage-tags': ['admin', 'moderator']
    };

    const allowedRoles = accessRules[path];
    if (!allowedRoles) return true;

    return profile ? allowedRoles.includes(profile.role) : false;
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[DEBUG_AUTH] 1. Iniciando initializeAuth...');
        
        // Verifica se há chaves no localStorage do Supabase antes de fazer chamadas
        const storageKeys = Object.keys(localStorage);
        const hasSbKeys = storageKeys.some(k => k.startsWith('sb-') || k.startsWith('supabase.auth'));
        console.log(`[DEBUG_AUTH] 2. Chaves de autenticação encontradas no localStorage? ${hasSbKeys}. Lista:`, storageKeys.filter(k => k.includes('auth') || k.includes('sb')));

        console.log('[DEBUG_AUTH] 3. Chamando supabase.auth.getSession()...');
        const { data: { session: serverSession }, error } = await supabase.auth.getSession();
        
        if (!isMounted) {
          console.log('[DEBUG_AUTH] O componente desmontou antes do getSession terminar.');
          return;
        }

        if (error) {
          console.error('[DEBUG_AUTH] 4. Erro no getSession do Supabase:', error.message, error);
          if (error.message?.includes('JWT') || error.message?.includes('token') || error.message?.includes('invalid')) {
            console.warn('[DEBUG_AUTH] Token corrompido detectado. Resetando estados de segurança...');
            setSession(null);
            setUser(null);
            setProfile(null);
            updateLocalStorage(null, null, null);
          }
        } else if (serverSession) {
          console.log('[DEBUG_AUTH] 4. getSession retornou Sessão Válida do Servidor para o User ID:', serverSession.user.id);
          setSession(serverSession);
          setUser(serverSession.user);
          updateLocalStorage(serverSession, serverSession.user, profile);
          
          console.log('[DEBUG_AUTH] 5. Buscando perfil do banco...');
          await fetchProfile(serverSession.user.id);
          console.log('[DEBUG_AUTH] 6. Perfil carregado com sucesso.');
        } else {
          console.log('[DEBUG_AUTH] 4. getSession retornou NULL (Sem sessão ativa no servidor).');
          // Se o servidor retornou null mas temos cache local, mantemos temporariamente como barreira contra oscilação
          if (session) {
            console.log('[DEBUG_AUTH] Mantendo sessão do cache como plano de contingência para o User ID:', session.user.id);
          } else {
            console.log('[DEBUG_AUTH] Nenhum cache disponível. Usuário realmente deslogado.');
          }
        }
      } catch (err: any) {
        console.error('[DEBUG_AUTH] Erro catastrófico no initializeAuth:', err.message, err);
      } finally {
        if (isMounted) {
          console.log('[DEBUG_AUTH] 7. Finalizando estado de carregamento inicial (isLoading = false)');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuta mudanças reais de estado de autenticação (Login/Logout ativos)
    console.log('[DEBUG_AUTH] Registrando listener onAuthStateChange...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[DEBUG_AUTH] EVENTO DISPARADO: ${event}. Sessão presente? ${!!currentSession}`);
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (currentSession) {
          console.log('[DEBUG_AUTH] Atualizando estados de sessão locais por evento de Auth para o User ID:', currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          updateLocalStorage(currentSession, currentSession.user, profile);
          await fetchProfile(currentSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[DEBUG_AUTH] Desconexão processada no listener. Expurgando dados...');
        setSession(null);
        setUser(null);
        setProfile(null);
        updateLocalStorage(null, null, null);
        
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase.auth')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading, refreshProfile, checkPageAccess }}>
      {children}
    </SessionContext.Provider>
  );
};