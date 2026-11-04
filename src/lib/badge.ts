/** Só os dígitos, sem zeros à esquerda. `004213`, `4213` e `42-13` viram `4213`. */
export const normalizeBadge = (value: string | null | undefined): string => {
  const digits = (value ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return digits;
};

export const isEmailLike = (value: string): boolean => value.includes('@');
