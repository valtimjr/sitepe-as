import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { ListCover } from '@/types/listCover';
import { searchPexels, type PexelsPhoto } from '@/services/coverService';

interface PexelsTabProps {
  onSelect: (cover: ListCover) => void;
}

const PexelsTab: React.FC<PexelsTabProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = async (q: string, p: number) => {
    const id = ++requestRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await searchPexels(q, p);
      if (id !== requestRef.current) return;
      setPhotos((prev) => (p === 1 ? res.photos : [...prev, ...res.photos]));
      setHasMore(res.hasMore);
      setPage(p);
    } catch {
      if (id === requestRef.current) setError(true);
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load(debounced, 1);
  }, [debounced]);

  const pick = (p: PexelsPhoto) =>
    onSelect({
      kind: 'image',
      source: 'pexels',
      value: p.src.large2x || p.src.landscape,
      credit: { name: p.photographer, url: p.photographer_url },
    });

  return (
    <div className="space-y-3" data-testid="cover-pexels">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar fotos (ex.: caminhão, motor, oficina)"
          aria-label="Buscar no Pexels"
          className="h-10 rounded-none pl-9"
        />
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Busca indisponível no momento.</p>
      ) : loading && photos.length === 0 ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-none" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma foto encontrada.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              title={p.alt || `Foto de ${p.photographer}`}
              className="group relative aspect-video w-full overflow-hidden rounded-none border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="cover-pexels-result"
            >
              <img src={p.src.medium} alt={p.alt} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-left text-[10px] text-white">
                {p.photographer}
              </span>
            </button>
          ))}
        </div>
      )}

      {hasMore && !error && (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-none"
          disabled={loading}
          onClick={() => load(debounced, page + 1)}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Carregar mais
        </Button>
      )}
      <p className="text-[11px] text-muted-foreground">
        Fotos fornecidas pelo{' '}
        <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline">
          Pexels
        </a>
        .
      </p>
    </div>
  );
};

export default PexelsTab;
