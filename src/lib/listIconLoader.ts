import { useEffect, useState } from 'react';

export type IconRegistry = typeof import('./listIconRegistry');

let registryPromise: Promise<IconRegistry> | null = null;
let registryCache: IconRegistry | null = null;

export const loadIconRegistry = (): Promise<IconRegistry> => {
  if (!registryPromise) {
    registryPromise = import('./listIconRegistry').then(mod => {
      registryCache = mod;
      return mod;
    });
    registryPromise.catch(() => {
      registryPromise = null;
    });
  }
  return registryPromise;
};

/** Retorna o catálogo de ícones (ou null enquanto carrega). Só carrega quando `enabled`. */
export const useIconRegistry = (enabled = true): IconRegistry | null => {
  const [registry, setRegistry] = useState<IconRegistry | null>(registryCache);

  useEffect(() => {
    if (!enabled || registry) return;
    let cancelled = false;
    loadIconRegistry()
      .then(mod => !cancelled && setRegistry(mod))
      .catch(err => console.error('Erro ao carregar catálogo de ícones:', err));
    return () => {
      cancelled = true;
    };
  }, [enabled, registry]);

  return registry;
};
