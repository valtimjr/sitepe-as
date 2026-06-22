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
  return operationalDate;
}
