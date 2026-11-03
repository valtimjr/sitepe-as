import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { getAfsFromService, type Af } from '@/services/partListService';

const cache = new Map<string, Af[]>();

/** AFs da empresa para o AfSearchInput (em cache depois da 1ª carga). */
export const useAfs = (enabled = true) => {
  const { company } = useCompany();
  const [afs, setAfs] = useState<Af[]>(() => cache.get(company) ?? []);

  useEffect(() => {
    if (!enabled) return;
    const cached = cache.get(company);
    if (cached) {
      setAfs(cached);
      return;
    }
    let cancelled = false;
    getAfsFromService(company)
      .then((list) => {
        cache.set(company, list);
        if (!cancelled) setAfs(list);
      })
      .catch((e) => console.error('Error loading AFs:', e));
    return () => {
      cancelled = true;
    };
  }, [enabled, company]);

  return afs;
};
