import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vtwlcaikxfnhngisgfgu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2xjYWlreGZuaG5naXNnZmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODU3MjMsImV4cCI6MjA3MTA2MTcyM30.1ltDW9yIuOjvd7qLGHlGZAlFlPGh3sGK8-o-jaogJmg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    // Configuração para manter a persistência mesmo após fechar a aba / mudar de foco
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    // Aumenta a resiliência de rede e reduz falhas por timeout ou oscilação de foco do browser
    headers: {
      'x-client-info': 'autoboard-resilient-client'
    }
  }
});
