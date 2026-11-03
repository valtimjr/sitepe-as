import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DEFAULTS_PREFIX = "capas_padrão/";
const UPLOAD_PREFIX = "capas/";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULTS_TTL_MS = 10 * 60 * 1000;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

// ---------- Backblaze B2 ----------

interface B2Auth {
  apiUrl: string;
  downloadUrl: string;
  token: string;
  bucketId: string;
  bucketName: string;
  expiresAt: number;
}

let b2AuthCache: B2Auth | null = null;
let defaultsCache: { at: number; body: unknown } | null = null;

const b2Authorize = async (): Promise<B2Auth> => {
  if (b2AuthCache && b2AuthCache.expiresAt > Date.now()) return b2AuthCache;
  const keyId = Deno.env.get("B2_KEY_ID");
  const appKey = Deno.env.get("B2_APPLICATION_KEY");
  const bucketName = Deno.env.get("B2_BUCKET_NAME") || "ArquivosAutomotivos";
  if (!keyId || !appKey) throw new Error("B2 não configurado");

  const res = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: { Authorization: `Basic ${btoa(`${keyId}:${appKey}`)}` },
  });
  if (!res.ok) throw new Error(`b2_authorize_account falhou (${res.status})`);
  const data = await res.json();

  let bucketId: string | undefined = data.allowed?.bucketId;
  if (!bucketId || (data.allowed?.bucketName && data.allowed.bucketName !== bucketName)) {
    const listRes = await fetch(`${data.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: "POST",
      headers: { Authorization: data.authorizationToken, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: data.accountId, bucketName }),
    });
    if (!listRes.ok) throw new Error(`b2_list_buckets falhou (${listRes.status})`);
    const buckets = await listRes.json();
    bucketId = buckets.buckets?.[0]?.bucketId;
  }
  if (!bucketId) throw new Error("Bucket não encontrado");

  b2AuthCache = {
    apiUrl: data.apiUrl,
    downloadUrl: data.downloadUrl,
    token: data.authorizationToken,
    bucketId,
    bucketName,
    // O token vale 24 h; renova antes
    expiresAt: Date.now() + 20 * 60 * 60 * 1000,
  };
  return b2AuthCache;
};

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

const isPrivateBucket = () => Deno.env.get("B2_BUCKET_PRIVATE") === "true";

const publicUrlFor = (auth: B2Auth, fileName: string) => {
  if (isPrivateBucket()) {
    const base = Deno.env.get("SUPABASE_URL");
    return `${base}/functions/v1/list-covers?action=file&path=${encodeURIComponent(fileName)}`;
  }
  const base = (Deno.env.get("B2_PUBLIC_BASE_URL") || `${auth.downloadUrl}/file/${auth.bucketName}`).replace(/\/+$/, "");
  return `${base}/${encodePath(fileName)}`;
};

const listFiles = async (auth: B2Auth, prefix: string) => {
  const files: { fileName: string }[] = [];
  let startFileName: string | null = null;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: "POST",
      headers: { Authorization: auth.token, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: auth.bucketId, prefix, maxFileCount: 1000, ...(startFileName ? { startFileName } : {}) }),
    });
    if (!res.ok) throw new Error(`b2_list_file_names falhou (${res.status})`);
    const data = await res.json();
    files.push(...(data.files || []));
    startFileName = data.nextFileName;
    if (!startFileName) break;
  }
  return files;
};

const prettyName = (raw: string) => {
  const base = raw.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const handleDefaults = async () => {
  if (defaultsCache && Date.now() - defaultsCache.at < DEFAULTS_TTL_MS) {
    return json(defaultsCache.body, 200, { "Cache-Control": "public, max-age=600" });
  }
  const auth = await b2Authorize();
  let prefix = DEFAULTS_PREFIX.normalize("NFC");
  let files = await listFiles(auth, prefix);
  if (files.length === 0) {
    prefix = DEFAULTS_PREFIX.normalize("NFD");
    files = await listFiles(auth, prefix);
  }

  const groups = new Map<string, { url: string; name: string }[]>();
  for (const f of files) {
    if (!IMAGE_EXT.test(f.fileName)) continue;
    const rest = f.fileName.slice(prefix.length);
    const parts = rest.split("/");
    const category = parts.length > 1 ? prettyName(parts[0]) : "Geral";
    const name = prettyName(parts[parts.length - 1]);
    const list = groups.get(category) ?? [];
    list.push({ url: publicUrlFor(auth, f.fileName), name });
    groups.set(category, list);
  }
  const body = {
    categories: Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([name, images]) => ({ name, images })),
  };
  defaultsCache = { at: Date.now(), body };
  console.log("[list-covers] defaults carregados", { categories: body.categories.length, files: files.length });
  return json(body, 200, { "Cache-Control": "public, max-age=600" });
};

const handleFileProxy = async (path: string | null) => {
  if (!path || path.includes("..") || !(path.startsWith(UPLOAD_PREFIX) || path.normalize("NFC").startsWith(DEFAULTS_PREFIX.normalize("NFC")))) {
    return json({ error: "Caminho inválido" }, 400);
  }
  const auth = await b2Authorize();
  const res = await fetch(`${auth.downloadUrl}/file/${auth.bucketName}/${encodePath(path)}`, {
    headers: { Authorization: auth.token },
  });
  if (!res.ok || !res.body) return json({ error: "Arquivo não encontrado" }, res.status === 404 ? 404 : 502);
  return new Response(res.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

// ---------- Pexels ----------

const handlePexels = async (q: string, page: number) => {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) return json({ error: "Pexels não configurado" }, 503);
  const query = q.trim().slice(0, 100) || "oficina mecânica";
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=24&orientation=landscape&locale=pt-BR`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) {
    console.error("[list-covers] pexels falhou", { status: res.status });
    return json({ error: "Falha na busca do Pexels" }, 502);
  }
  const data = await res.json();
  const photos = (data.photos || []).map((p: any) => ({
    id: p.id,
    alt: p.alt || "",
    photographer: p.photographer,
    photographer_url: p.photographer_url,
    src: { landscape: p.src?.landscape, medium: p.src?.medium, large2x: p.src?.large2x },
  }));
  return json({ photos, page, hasMore: !!data.next_page }, 200, { "Cache-Control": "public, max-age=3600" });
};

// ---------- Upload (admin/moderador) ----------

const sha1Hex = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const handleUpload = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
  const token = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "Sessão inválida" }, 401);

  const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (!profile || !["admin", "moderator"].includes(profile.role)) {
    console.warn("[list-covers] upload negado", { user: userData.user.id });
    return json({ error: "Apenas administradores podem enviar capas" }, 403);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Arquivo ausente" }, 400);
  if (!ALLOWED_TYPES.includes(file.type)) return json({ error: "Envie uma imagem JPG, PNG ou WebP" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "A imagem passa de 10 MB" }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const fileName = `${UPLOAD_PREFIX}${crypto.randomUUID()}.${ext}`;

  const auth = await b2Authorize();
  const upRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: { Authorization: auth.token, "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId: auth.bucketId }),
  });
  if (!upRes.ok) throw new Error(`b2_get_upload_url falhou (${upRes.status})`);
  const upload = await upRes.json();

  const putRes = await fetch(upload.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: upload.authorizationToken,
      "X-Bz-File-Name": encodePath(fileName),
      "Content-Type": file.type,
      "Content-Length": String(bytes.byteLength),
      "X-Bz-Content-Sha1": await sha1Hex(bytes),
    },
    body: bytes,
  });
  if (!putRes.ok) {
    console.error("[list-covers] b2_upload_file falhou", { status: putRes.status, body: await putRes.text() });
    return json({ error: "Falha ao enviar a imagem" }, 502);
  }

  const url = publicUrlFor(auth, fileName);
  console.log("[list-covers] upload concluído", { fileName, user: userData.user.id });
  return json({ url, fileName });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (req.method === "GET" && action === "defaults") return await handleDefaults();
    if (req.method === "GET" && action === "pexels") {
      const page = Math.min(50, Math.max(1, Number(url.searchParams.get("page")) || 1));
      return await handlePexels(url.searchParams.get("q") || "", page);
    }
    if (req.method === "GET" && action === "file") return await handleFileProxy(url.searchParams.get("path"));
    if (req.method === "POST" && action === "upload") return await handleUpload(req);
    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("[list-covers] erro", { action, message: (error as Error).message });
    return json({ error: "Erro interno" }, 500);
  }
});
