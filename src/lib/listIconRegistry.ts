// Carregado apenas via import() dinâmico (ver listIconLoader.ts) para não pesar o bundle principal.
import type { ComponentType, SVGProps } from 'react';
import { icons as lucideIcons } from 'lucide-react';
import * as HeroOutline from '@heroicons/react/24/outline';
import * as HeroSolid from '@heroicons/react/24/solid';

export type AnyIconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; color?: string; strokeWidth?: number | string }>;

const pick = (mod: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(mod).filter(([name, comp]) => name.endsWith('Icon') && comp && (typeof comp === 'object' || typeof comp === 'function'))
  ) as Record<string, AnyIconComponent>;

export const lucide = lucideIcons as unknown as Record<string, AnyIconComponent>;
export const heroOutline = pick(HeroOutline as Record<string, unknown>);
export const heroSolid = pick(HeroSolid as Record<string, unknown>);

export const lucideNames = Object.keys(lucide);
export const heroNames = Object.keys(heroOutline);

/** Apelidos em PT (sem acento) → termos em inglês usados nos nomes dos ícones. */
export const PT_ALIASES: Record<string, string[]> = {
  caminhao: ['truck'],
  veiculo: ['car', 'truck', 'bus'],
  carro: ['car'],
  onibus: ['bus'],
  moto: ['bike'],
  bicicleta: ['bike', 'bicycle'],
  ferramenta: ['wrench', 'hammer', 'tool'],
  chave: ['wrench', 'key'],
  martelo: ['hammer'],
  oficina: ['wrench', 'factory', 'warehouse'],
  manutencao: ['wrench', 'cog', 'settings'],
  engrenagem: ['cog', 'settings'],
  eletrica: ['zap', 'bolt', 'plug'],
  energia: ['zap', 'bolt', 'battery'],
  bateria: ['battery'],
  raio: ['zap', 'bolt'],
  agua: ['droplet', 'droplets', 'waves'],
  oleo: ['droplet', 'fuel'],
  hidraulica: ['droplet', 'gauge'],
  combustivel: ['fuel'],
  pneu: ['circle', 'disc'],
  caixa: ['package', 'box', 'archive', 'cube'],
  pacote: ['package', 'box'],
  estoque: ['archive', 'warehouse', 'package', 'box'],
  armazem: ['warehouse'],
  compra: ['shopping', 'cart'],
  carrinho: ['cart', 'shopping'],
  calendario: ['calendar'],
  data: ['calendar'],
  relogio: ['clock'],
  tempo: ['clock', 'timer'],
  lista: ['list'],
  nota: ['notebook', 'note', 'file'],
  documento: ['file', 'document'],
  arquivo: ['file', 'folder', 'archive'],
  pasta: ['folder'],
  casa: ['house', 'home'],
  fabrica: ['factory'],
  estrela: ['star'],
  coracao: ['heart'],
  alerta: ['alert', 'triangle', 'exclamation'],
  aviso: ['alert', 'triangle', 'bell'],
  sino: ['bell'],
  fogo: ['flame', 'fire'],
  seguranca: ['shield', 'lock'],
  cadeado: ['lock'],
  usuario: ['user'],
  pessoa: ['user'],
  equipe: ['users'],
  dinheiro: ['dollar', 'banknote', 'currency', 'wallet'],
  medidor: ['gauge'],
  luz: ['lightbulb', 'lamp', 'sun'],
  lampada: ['lightbulb', 'lamp'],
  bandeira: ['flag'],
  mapa: ['map'],
  local: ['map', 'pin'],
  pino: ['pin'],
  etiqueta: ['tag'],
  codigo: ['code', 'barcode', 'qr'],
  check: ['check'],
  feito: ['check'],
  trofeu: ['trophy'],
};

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Filtra nomes de ícones por um termo de busca (nome em inglês + apelidos PT). */
export const searchIconNames = (names: string[], query: string): string[] => {
  const q = normalize(query).replace(/\s+/g, '');
  if (!q) return names;
  const terms = new Set<string>([q]);
  Object.entries(PT_ALIASES).forEach(([pt, en]) => {
    if (pt.startsWith(q) || (q.length >= 4 && q.startsWith(pt))) en.forEach(t => terms.add(t));
  });
  const all = [...terms];
  return names.filter(name => {
    const n = name.toLowerCase();
    return all.some(t => n.includes(t));
  });
};
