const RECENT_KEY = 'autoboard_recent_searches';
const MAX_RECENT = 5;

export const loadRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

export const saveRecent = (term: string): string[] => {
  const value = term.trim();
  if (!value) return loadRecent();
  const next = [value, ...loadRecent().filter(t => t.toLowerCase() !== value.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
};

export const clearRecent = () => {
  localStorage.removeItem(RECENT_KEY);
};
