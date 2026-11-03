import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { localDb } from '@/services/localDbService';
import { LOCAL_COVER_PREFIX } from '@/types/listCover';

const FUNCTION_URL = 'https://vtwlcaikxfnhngisgfgu.supabase.co/functions/v1/list-covers';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2xjYWlreGZuaG5naXNnZmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODU3MjMsImV4cCI6MjA3MTA2MTcyM30.1ltDW9yIuOjvd7qLGHlGZAlFlPGh3sGK8-o-jaogJmg';

export const MAX_COVER_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface DefaultCoverCategory {
  name: string;
  images: { url: string; name: string }[];
}

export interface PexelsPhoto {
  id: number;
  alt: string;
  photographer: string;
  photographer_url: string;
  src: { landscape: string; medium: string; large2x?: string };
}

const getJson = async <T,>(params: string): Promise<T> => {
  const res = await fetch(`${FUNCTION_URL}?${params}`, { headers: { apikey: ANON_KEY } });
  if (!res.ok) throw new Error(`Falha (${res.status})`);
  return res.json() as Promise<T>;
};

export const fetchDefaultCovers = async (): Promise<DefaultCoverCategory[]> => {
  const data = await getJson<{ categories?: DefaultCoverCategory[] }>('action=defaults');
  return data.categories ?? [];
};

export const searchPexels = async (q: string, page = 1): Promise<{ photos: PexelsPhoto[]; hasMore: boolean }> => {
  const data = await getJson<{ photos?: PexelsPhoto[]; hasMore?: boolean }>(
    `action=pexels&q=${encodeURIComponent(q)}&page=${page}`,
  );
  return { photos: data.photos ?? [], hasMore: !!data.hasMore };
};

/** Envia ao Backblaze (só admin/moderador). Devolve a URL pública. */
export const uploadCoverToB2 = async (blob: Blob, onProgress?: (pct: number) => void): Promise<string> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Faça login para enviar a capa.');

  const form = new FormData();
  form.append('file', blob, `capa.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${FUNCTION_URL}?action=upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', ANON_KEY);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // resposta sem JSON
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) resolve(body.url);
      else reject(new Error(body.error || 'Falha ao enviar a imagem.'));
    };
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar a imagem.'));
    xhr.send(form);
  });
};

/** Salva a imagem no aparelho (IndexedDB) e devolve o valor "local:<id>". */
export const saveLocalCoverImage = async (blob: Blob): Promise<string> => {
  const id = uuidv4();
  await localDb.coverImages.put({ id, blob, created_at: new Date() });
  return `${LOCAL_COVER_PREFIX}${id}`;
};

export const deleteLocalCoverImage = async (value: string): Promise<void> => {
  if (!value.startsWith(LOCAL_COVER_PREFIX)) return;
  await localDb.coverImages.delete(value.slice(LOCAL_COVER_PREFIX.length));
};

export const getLocalCoverBlob = async (value: string): Promise<Blob | undefined> => {
  if (!value.startsWith(LOCAL_COVER_PREFIX)) return undefined;
  return (await localDb.coverImages.get(value.slice(LOCAL_COVER_PREFIX.length)))?.blob;
};

/** Redimensiona para no máximo 1600px de largura e comprime em WebP. */
export const compressImage = async (file: Blob, maxWidth = 1600, quality = 0.82): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      el.src = url;
    });
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.type === 'image/webp') return blob;
    // Navegadores sem WebP: cai para JPEG
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!jpeg) throw new Error('Não foi possível comprimir a imagem.');
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Confere se uma URL de imagem carrega. */
export const checkImageLoads = (url: string, timeoutMs = 10000): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
