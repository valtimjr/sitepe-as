/** Remove acentos/diacríticos ("Válvula" → "Valvula"). */
export const stripAccents = (s: string): string =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Normaliza para busca: sem acento, minúsculo e sem espaços nas pontas. */
export const normalizeSearch = (s: string | null | undefined): string =>
  stripAccents(s ?? '').toLowerCase().trim();

/**
 * Verifica se todos os termos da busca aparecem (sem acento) em algum dos campos,
 * na ordem em que foram digitados quando estão no mesmo campo.
 */
export const matchesQuery = (fields: (string | null | undefined)[], query: string): boolean => {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fields.map(f => normalizeSearch(f)).join(' ');
  return terms.every(t => haystack.includes(t));
};

/** `includes` sem acento e sem diferenciar maiúsculas. */
export const includesNormalized = (text: string | null | undefined, query: string): boolean =>
  normalizeSearch(text).includes(normalizeSearch(query));
