import { format, isSameDay, parseISO, startOfDay, differenceInDays, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Apontamento } from './partListService'; // Importando Apontamento para tipagem

// 1. Definição dos Horários de Trabalho por Escala (Dia da Semana: 0=Dom, 1=Seg, ..., 6=Sáb)
const SHIFT_SCHEDULES = {
  Dia: {
    0: { entry: '07:00', exit: '19:00' }, // Domingo
    1: { entry: '07:00', exit: '15:00' }, // Segunda
    2: { entry: '07:00', exit: '15:00' }, // Terça
    3: { entry: '07:00', exit: '15:00' }, // Quarta
    4: { entry: '07:00', exit: '15:00' }, // Quinta
    5: { entry: '07:00', exit: '19:00' }, // Sexta
    6: { entry: '07:00', exit: '19:00' }, // Sábado
  },
  Intermediario: {
    0: { status: 'Folga' }, // Domingo folga
    1: { entry: '15:00', exit: '23:00' }, // Segunda
    2: { entry: '15:00', exit: '23:00' }, // Terça
    3: { entry: '15:00', exit: '23:00' }, // Quarta
    4: { entry: '15:00', exit: '23:00' }, // Quinta
    5: { status: 'Folga' }, // Sexta folga
    6: { entry: '19:00', exit: '07:00', overnight: true }, // Sábado
  },
  Noite: {
    0: { entry: '19:00', exit: '07:00', overnight: true }, // Domingo
    1: { entry: '23:00', exit: '07:00', overnight: true }, // Segunda
    2: { entry: '23:00', exit: '07:00', overnight: true }, // Terça
    3: { entry: '23:00', exit: '07:00', overnight: true }, // Quarta
    4: { entry: '23:00', exit: '07:00', overnight: true }, // Quinta
    5: { entry: '19:00', exit: '07:00', overnight: true }, // Sexta
    6: { status: 'Folga' }, // Sábado (Folga)
  },
};

// 2. Definição da Rotação
const SHIFT_ORDER = ['Dia', 'Intermediario', 'Noite'];
const TURNS = ['Turno A', 'Turno B', 'Turno C'];

// Mapeamento de Turno para o índice da escala na Semana 1 (2024-01-01)
// Turno A = Noite (Índice 2)
// Turno B = Dia (Índice 0)
// Turno C = Intermediário (Índice 1)
const TURN_BASE_INDEX: { [key: string]: number } = {
  'Turno A': 2, // Noite
  'Turno B': 0, // Dia
  'Turno C': 1, // Intermediário
};

// Data de Referência (Ponto de partida do ciclo)
// 2024-01-01 é uma Segunda-feira (dayOfWeek = 1)
const REFERENCE_DATE = parseISO('2024-01-01T00:00:00');

/**
 * Calcula o índice do ciclo de 3 semanas (0, 1, ou 2) para uma dada data.
 * @param date A data para calcular o ciclo.
 * @returns O índice do ciclo (0, 1 ou 2).
 */
const calculateCycleIndex = (date: Date): number => {
  const daysSinceReference = differenceInDays(startOfDay(date), startOfDay(REFERENCE_DATE));
  // O ciclo se repete a cada 21 dias (3 semanas)
  // O índice da semana é (dias / 7) % 3
  return Math.floor(daysSinceReference / 7) % 3;
};

/**
 * Determina o horário de trabalho para um turno específico em uma data.
 * @param date The date to check.
 * @param turn The shift turn (Turno A, Turno B, Turno C).
 * @returns The entry and exit times (or status for day off).
 */
export const getShiftSchedule = (date: Date, turn: string): { entry?: string; exit?: string; status?: string } => {
  const cycleIndex = calculateCycleIndex(date); // 0, 1, ou 2
  const dayOfWeek = getDay(date); // 0 (Dom) a 6 (Sáb)

  // 1. Determinar qual escala (Dia, Intermediário, Noite) o turno está nesta semana
  const turnBaseIndex = TURN_BASE_INDEX[turn];
  if (typeof turnBaseIndex === 'undefined') return {};

  // O índice da escala de horário para o turno é (BaseIndex + cycleIndex) % 3
  const scheduleIndex = (turnBaseIndex + cycleIndex) % 3;
  const scheduleName = SHIFT_ORDER[scheduleIndex];
  const schedule = SHIFT_SCHEDULES[scheduleName as keyof typeof SHIFT_SCHEDULES];

  // 2. Aplicar as regras de horário/folga
  const shift = schedule[dayOfWeek as keyof typeof schedule];

  if (shift) {
    if (shift.status === 'Folga') {
      return { status: 'Folga' };
    }
    // Retorna os horários de entrada e saída
    return { entry: shift.entry, exit: shift.exit };
  }

  // Se não houver regra definida para o dia da semana na escala atual, é folga.
  return { status: 'Folga' };
};

/**
 * Gera os apontamentos automáticos para um mês inteiro.
 * @param monthDate Qualquer data dentro do mês desejado.
 * @param turn O turno selecionado (Turno A, Turno B, Turno C).
 * @param userId O ID do usuário para preencher o apontamento.
 * @returns Uma lista de objetos Apontamento.
 */
export const generateMonthlyApontamentos = (monthDate: Date, turn: string, userId: string): Apontamento[] => {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start, end });

  return days.map(day => {
    const schedule = getShiftSchedule(day, turn);
    const dateString = format(day, 'yyyy-MM-dd');

    return {
      id: uuidv4(),
      user_id: userId,
      date: dateString,
      entry_time: schedule.entry,
      exit_time: schedule.exit,
      status: schedule.status,
      created_at: new Date(),
    };
  });
};

export type ShiftTurn = 'Turno A' | 'Turno B' | 'Turno C';
export const ALL_TURNS: ShiftTurn[] = TURNS as ShiftTurn[];