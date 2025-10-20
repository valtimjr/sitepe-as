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
    console.log('SessionContextProvider: Setting up auth state change listener.');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider: Auth state changed. Event:', event, 'Session:', currentSession);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        if ((event === 'SIGNED_OUT' || event === 'USER_DELETED') && location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: User signed out or deleted, redirecting from /admin to /login.');
          navigate('/login');
        }
      }
    );

    console.log('SessionContextProvider: Checking initial session.');
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider: Initial session data:', initialSession);
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);
    });

    return () => {
      console.log('SessionContextProvider: Cleaning up auth state change listener.');
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!isLoading) {
      console.log('SessionContextProvider: Redirect effect triggered. Session:', session, 'Path:', location.pathname);
      if (session) {
        if (location.pathname === '/login') {
          console.log('SessionContextProvider: Authenticated user on /login, redirecting to /admin.');
          navigate('/admin');
        }
      } else {
        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: Unauthenticated user on /admin, redirecting to /login.');
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