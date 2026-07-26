import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma data/hora real em sua data operacional de acordo com a regra da empresa:
 * - O dia operacional começa às 07:00 da manhã.
 * - O dia operacional termina às 06:59 do dia seguinte.
 * - Qualquer hora entre 00:00 e 06:59 pertence ao dia operacional anterior.
 */
export function getOperationalDate(date: Date = new Date()): Date {
  const hour = date.getHours();
  const operationalDate = new Date(date);
  if (hour < 7) {
    operationalDate.setDate(operationalDate.getDate() - 1);
  }
  operationalDate.setHours(12, 0, 0, 0);
  return operationalDate;
}

/**
 * Calcula a duração entre duas strings de horário HH:MM em minutos.
 */
export function calculateDuration(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Trata virada de dia (overnight)
  }
  
  return endMinutes - startMinutes;
}

/**
 * Formata minutos para o padrão HH:MM, preenchendo com zeros à esquerda.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

/**
 * Verifica se um elemento do DOM pertence ao contexto interativo do seletor de listas,
 * inclusive quando renderizado via React Portal (Radix Select, Popover, etc.).
 */
export function isInsideListSelector(target: EventTarget | null | undefined): boolean {
  if (!target) return false;
  const el = (target instanceof HTMLElement || target instanceof Element) ? (target as HTMLElement) : null;
  if (!el) return false;

  return !!(
    el.closest('.list-selector-portal') ||
    el.closest('.list-selector-content') ||
    el.closest('.list-selector-dropdown') ||
    el.closest('.create-list-panel') ||
    el.closest('[data-list-selector]') ||
    el.closest('[data-create-list]')
  );
}

/**
 * Função utilitária centralizada para calcular horas de OS e Percurso de uma lista de registros.
 */
export function calculateOsAndPercursoTimes(osList: any[]) {
  let osMinutes = 0;
  let percursoMinutes = 0;
  
  if (Array.isArray(osList)) {
    osList.forEach(os => {
      const duration = calculateDuration(os.hora_inicio, os.hora_final);
      if (os.is_percurso) {
        percursoMinutes += duration;
      } else {
        osMinutes += duration;
      }
    });
  }
  
  return {
    osMinutes,
    percursoMinutes,
    totalMinutes: osMinutes + percursoMinutes
  };
}
