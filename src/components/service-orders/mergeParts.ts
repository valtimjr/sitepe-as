export interface PickedPart {
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  name?: string;
}

/** Chave de comparação: código sem diferenciar maiúsculas; sem código, a descrição. */
export const partKey = (p: Pick<PickedPart, 'codigo_peca' | 'descricao'>) => {
  const code = (p.codigo_peca || '').trim().toLowerCase();
  if (code) return `c:${code}`;
  return `d:${(p.descricao || '').trim().toLowerCase()}`;
};

/** Junta as peças somando as quantidades das repetidas, mantendo a ordem original. */
export const mergeParts = (existing: PickedPart[], added: PickedPart[]): PickedPart[] => {
  const result = existing.map((p) => ({ ...p }));
  const index = new Map(result.map((p, i) => [partKey(p), i]));
  for (const part of added) {
    const key = partKey(part);
    const at = index.get(key);
    if (at !== undefined) {
      result[at] = { ...result[at], quantidade: result[at].quantidade + part.quantidade };
    } else {
      index.set(key, result.length);
      result.push({ ...part });
    }
  }
  return result;
};
