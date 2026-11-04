/** Separa o texto livre de tags (vírgula, ponto e vírgula ou quebra de linha), sem vazias nem repetidas. */
export const parseTags = (tags?: string | null): string[] => {
  if (!tags) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags.split(/[,;\n\r]+/)) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
};
