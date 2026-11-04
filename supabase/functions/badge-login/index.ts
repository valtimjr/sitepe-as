import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeBadge = (value: unknown) =>
  typeof value === "string" ? value.replace(/\D/g, "").replace(/^0+/, "") : "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { badge?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }

  const badge = normalizeBadge(body.badge);
  const password = typeof body.password === "string" ? body.password : "";
  if (!badge || badge.length > 20 || !password) return json({ error: "invalid" }, 401);

  const registerFailure = async () => {
    const now = Date.now();
    const { data: row } = await admin
      .from("login_attempts")
      .select("failed_count, first_failed_at")
      .eq("badge_normalized", badge)
      .maybeSingle();

    const withinWindow = row?.first_failed_at && now - new Date(row.first_failed_at).getTime() < WINDOW_MS;
    const failedCount = withinWindow ? row!.failed_count + 1 : 1;
    const firstFailedAt = withinWindow ? row!.first_failed_at : new Date(now).toISOString();
    const lockedUntil = failedCount >= MAX_FAILURES ? new Date(now + LOCK_MS).toISOString() : null;

    await admin.from("login_attempts").upsert({
      badge_normalized: badge,
      failed_count: failedCount,
      first_failed_at: firstFailedAt,
      locked_until: lockedUntil,
    });
    if (lockedUntil) console.warn("[badge-login] crachá bloqueado", { badge, lockedUntil });
  };

  try {
    const { data: attempt } = await admin
      .from("login_attempts")
      .select("locked_until")
      .eq("badge_normalized", badge)
      .maybeSingle();
    if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
      return json({ error: "locked" }, 429);
    }

    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("badge_normalized", badge)
      .limit(2);
    if (profileError) throw profileError;

    if (!profiles || profiles.length !== 1) {
      if (profiles && profiles.length > 1) console.warn("[badge-login] crachá repetido", { badge });
      await registerFailure();
      return json({ error: "invalid" }, 401);
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profiles[0].id);
    const email = userData?.user?.email;
    if (userError || !email) {
      console.error("[badge-login] usuário sem e-mail", { badge, message: userError?.message });
      await registerFailure();
      return json({ error: "invalid" }, 401);
    }

    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });

    if (signInError || !signIn.session) {
      if (signInError?.message?.toLowerCase().includes("email not confirmed")) {
        return json({ error: "email_not_confirmed" }, 403);
      }
      await registerFailure();
      return json({ error: "invalid" }, 401);
    }

    await admin.from("login_attempts").delete().eq("badge_normalized", badge);
    console.log("[badge-login] login ok", { user: signIn.user?.id });
    return json({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    });
  } catch (error) {
    console.error("[badge-login] erro", { message: (error as Error).message });
    return json({ error: "unexpected" }, 500);
  }
});
