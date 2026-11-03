import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useSession } from '@/components/SessionContextProvider';
import { matchesQuery } from '@/lib/textNormalize';
import {
  searchParts,
  getFrequentPartsForProfession,
  getFavoriteParts,
  addFavoritePart,
  removeFavoritePart,
  Part,
} from '@/services/partListService';

export type PartItemType = 'favorite' | 'frequent' | 'normal';
export type DisplayPart = Part & { itemType: PartItemType };

// Cache em memória para reabrir a gaveta sem nova consulta.
const favoritesCache = new Map<string, Part[]>();
const frequentCache = new Map<string, Part[]>();

const codeOf = (p: Part) => (p.codigo || '').toLowerCase();
const matches = (part: Part, q: string) => matchesQuery([part.codigo, part.descricao, part.name], q);

/** Busca de peças com espera de 300ms, descarte de respostas antigas e favoritos/sugestões em cache. */
export const usePartSearch = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { company } = useCompany();
  const { profile, user } = useSession();

  const favKey = `${user?.id ?? 'guest'}|${company}`;
  const freqKey =
    profile?.suggest_parts === false || !profile?.profession_code || !company
      ? null
      : `${profile.profession_code}|${company}`;

  const [favoriteParts, setFavoriteParts] = useState<Part[]>(() => favoritesCache.get(favKey) ?? []);
  const [frequentParts, setFrequentParts] = useState<Part[]>(() => (freqKey && frequentCache.get(freqKey)) || []);
  const [listsLoading, setListsLoading] = useState(() => !favoritesCache.has(favKey));

  useEffect(() => {
    if (!enabled) return;
    const cached = favoritesCache.get(favKey);
    if (cached) {
      setFavoriteParts(cached);
      setListsLoading(false);
      return;
    }
    let cancelled = false;
    setListsLoading(true);
    getFavoriteParts(user?.id, company)
      .then((parts) => {
        favoritesCache.set(favKey, parts);
        if (!cancelled) setFavoriteParts(parts);
      })
      .catch((e) => console.error('Error loading favorite parts:', e))
      .finally(() => {
        if (!cancelled) setListsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, favKey, user?.id, company]);

  useEffect(() => {
    if (!enabled) return;
    if (!freqKey || !profile?.profession_code) {
      setFrequentParts([]);
      return;
    }
    const cached = frequentCache.get(freqKey);
    if (cached) {
      setFrequentParts(cached);
      return;
    }
    let cancelled = false;
    getFrequentPartsForProfession(profile.profession_code, company)
      .then((parts) => {
        frequentCache.set(freqKey, parts);
        if (!cancelled) setFrequentParts(parts);
      })
      .catch((e) => console.error('Error loading frequent parts:', e));
    return () => {
      cancelled = true;
    };
  }, [enabled, freqKey, profile?.profession_code, company]);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const id = ++requestId.current;
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = (await searchParts(q, company)) || [];
        if (id === requestId.current) setSearchResults(results);
      } catch (error) {
        console.error('Error searching parts', error);
      } finally {
        if (id === requestId.current) setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, company]);

  const favoriteCodes = useMemo(() => new Set(favoriteParts.map(codeOf)), [favoriteParts]);
  const frequentCodes = useMemo(() => new Set(frequentParts.map(codeOf)), [frequentParts]);

  const results = useMemo<DisplayPart[]>(() => {
    const q = query.toLowerCase().trim();
    const fav = (q ? favoriteParts.filter((p) => matches(p, q)) : favoriteParts).map((p) => ({
      ...p,
      itemType: 'favorite' as const,
    }));
    const seen = new Set(fav.map(codeOf));
    const freq = (q ? frequentParts.filter((p) => matches(p, q)) : frequentParts)
      .filter((p) => !seen.has(codeOf(p)))
      .map((p) => ({ ...p, itemType: 'frequent' as const }));
    freq.forEach((p) => seen.add(codeOf(p)));
    const normal = q
      ? searchResults.filter((p) => !seen.has(codeOf(p))).map((p) => ({ ...p, itemType: 'normal' as const }))
      : [];
    return [...fav, ...freq, ...normal];
  }, [query, searchResults, frequentParts, favoriteParts]);

  const isFavorite = useCallback((part: Part) => favoriteCodes.has(codeOf(part)), [favoriteCodes]);

  const toggleFavorite = useCallback(
    async (part: Part) => {
      const isFav = favoriteCodes.has(codeOf(part));
      const next = isFav
        ? favoriteParts.filter((p) => codeOf(p) !== codeOf(part))
        : [...favoriteParts, part];
      setFavoriteParts(next);
      favoritesCache.set(favKey, next);
      if (isFav) await removeFavoritePart(user?.id, company, part.codigo);
      else await addFavoritePart(user?.id, company, part.codigo);
    },
    [favoriteCodes, favoriteParts, favKey, user?.id, company],
  );

  return {
    query,
    setQuery,
    results,
    isSearching,
    listsLoading,
    favoriteParts,
    frequentParts,
    favoriteCodes,
    frequentCodes,
    isFavorite,
    toggleFavorite,
  };
};
