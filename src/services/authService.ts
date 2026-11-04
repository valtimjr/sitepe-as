import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isEmailLike, normalizeBadge } from '@/lib/badge';

export type SignInErrorKind = 'invalid' | 'locked' | 'unconfirmed' | 'unexpected';

export type SignInResult =
  | { ok: true; user: User; method: 'email' | 'badge' }
  | { ok: false; kind: SignInErrorKind; method: 'email' | 'badge' };

const signInWithEmail = async (email: string, password: string): Promise<SignInResult> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message.toLowerCase();
    const kind: SignInErrorKind = msg.includes('invalid login credentials')
      ? 'invalid'
      : msg.includes('email not confirmed')
        ? 'unconfirmed'
        : error.status === 429
          ? 'locked'
          : 'unexpected';
    return { ok: false, kind, method: 'email' };
  }
  return { ok: true, user: data.user, method: 'email' };
};

const signInWithBadge = async (rawBadge: string, password: string): Promise<SignInResult> => {
  const badge = normalizeBadge(rawBadge);
  if (!badge || badge.length > 20) return { ok: false, kind: 'invalid', method: 'badge' };

  const { data, error } = await supabase.functions.invoke('badge-login', { body: { badge, password } });
  if (error) {
    const status: number | undefined = (error as { context?: Response }).context?.status;
    const kind: SignInErrorKind =
      status === 401 ? 'invalid' : status === 429 ? 'locked' : status === 403 ? 'unconfirmed' : 'unexpected';
    return { ok: false, kind, method: 'badge' };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError || !sessionData.user) return { ok: false, kind: 'unexpected', method: 'badge' };
  return { ok: true, user: sessionData.user, method: 'badge' };
};

/** Entra com e-mail (se tiver `@`) ou com o número do crachá. */
export const signInWithIdentifier = (identifier: string, password: string): Promise<SignInResult> => {
  const value = identifier.trim();
  return isEmailLike(value) ? signInWithEmail(value, password) : signInWithBadge(value, password);
};
