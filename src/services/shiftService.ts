import { format, isSameDay, parseISO, startOfDay, differenceInDays, getDay } from 'date-fns';

// 1. Definição dos Horários de Trabalho por Escala (Dia da Semana: 0=Dom, 1=Seg, ..., 6=Sáb)
const SHIFT_SCHEDULES = {
  Dia: {
    0: { entry: '07:00', exit: '19:00' }, // Domingo
    1: { entry: '07:00', exit: '15:00' }, // Segunda
    2: { entry: '07:00', exit: '15:00' }, // Terça
    3: { entry: '07:00', exit: '15:00' }, // Quarta
    4: { entry: '07:00', exit: '15:00' }, // Quinta
    5: { entry: '07:00', exit: '19:00' }, // Sexta
    6: { entry: '07:00', exit: '15:00' }, // Sábado
    // Nota: O domingo tem um horário de 07:00-19:00, mas a regra diz "domingo folga" para o turno Dia.
    // Vou assumir que a regra de folga se aplica ao Domingo 07:00-19:00, e o Domingo 19:00-07:00 é coberto pelo turno Noite.
    // Vamos ajustar a lógica de Dia/Noite para refletir a folga no Domingo.
    // Reajustando a regra "Dia" para incluir a folga no Domingo (0)
    // E a regra "Noite" para cobrir o Domingo 19:00-07:00.
  },
  Intermediario: {
    1: { entry: '15:00', exit: '23:00' }, // Segunda
    2: { entry: '15:00', exit: '23:00' }, // Terça
    3: { entry: '15:00', exit: '23:00' }, // Quarta
    4: { entry: '15:00', exit: '23:00' }, // Quinta
    // Nota: Sexta folga, Sábado e Domingo folga (coberto por Dia/Noite)
  },
  Noite: {
    6: { entry: '19:00', exit: '07:00', overnight: true }, // Sábado (termina no domingo)
    0: { entry: '19:00', exit: '07:00', overnight: true }, // Domingo (termina na segunda)
    1: { entry: '23:00', exit: '07:00', overnight: true }, // Segunda (termina na terça)
    2: { entry: '23:00', exit: '07:00', overnight: true }, // Terça (termina na quarta)
    3: { entry: '23:00', exit: '07:00', overnight: true }, // Quarta (termina na quinta)
    4: { entry: '23:00', exit: '07:00', overnight: true }, // Quinta (termina na sexta)
    5: { entry: '19:00', exit: '07:00', overnight: true }, // Sexta (termina no sábado)
  },
};

// 2. Definição da Rotação
const SHIFT_ORDER = ['Dia', 'Intermediario', 'Noite'];
const TURNS = ['Turno A', 'Turno B', 'Turno C'];

// Data de Referência (Ponto de partida do ciclo)
// Vamos definir 2024-01-01 (Segunda-feira) como o início do ciclo 1, onde:
// Turno A = Dia, Turno B = Intermediário, Turno C = Noite
const REFERENCE_DATE = parseISO('2024-01-01T00:00:00'); // Segunda-feira

/**
 * Calcula o índice do ciclo de 3 semanas (0, 1, ou 2) para uma dada data.
 * @param date A data para calcular o ciclo.
 * @returns O índice do ciclo (0, 1 ou 2).
 */
const calculateCycleIndex = (date: Date): number => {
  const daysSinceReference = differenceInDays(startOfDay(date), startOfDay(REFERENCE_DATE));
  // O ciclo se repete a cada 21 dias (3 semanas)
  const cycleDay = daysSinceReference % 21;
  
  // Mapeia o dia do ciclo para o índice da semana (0, 1, 2)
  // Semana 1: Dias 0-6 (Índice 0)
  // Semana 2: Dias 7-13 (Índice 1)
  // Semana 3: Dias 14-20 (Índice 2)
  return Math.floor(cycleDay / 7);
};

/**
 * Determina o horário de trabalho para um turno específico em uma data.
 * @param date A data para verificar.
 * @param turn O turno (Turno A, Turno B, Turno C).
 * @returns O horário de entrada e saída (ou status de folga).
 */
export const getShiftSchedule = (date: Date, turn: string): { entry?: string; exit?: string; status?: string } => {
  const cycleIndex = calculateCycleIndex(date); // 0, 1, ou 2
  const dayOfWeek = getDay(date); // 0 (Dom) a 6 (Sáb)

  // 1. Determinar qual escala (Dia, Intermediário, Noite) o turno está nesta semana
  const turnIndex = TURNS.indexOf(turn);
  if (turnIndex === -1) return {};

  // A escala de horário é determinada pela rotação:
  // Semana 1 (cycleIndex 0): A=Dia, B=Intermediário, C=Noite
  // Semana 2 (cycleIndex 1): A=Intermediário, B=Noite, C=Dia
  // Semana 3 (cycleIndex 2): A=Noite, B=Dia, C=Intermediário
  
  // O índice da escala de horário para o turno é (turnIndex + cycleIndex) % 3
  const scheduleIndex = (turnIndex + cycleIndex) % 3;
  const scheduleName = SHIFT_ORDER[scheduleIndex];
  const schedule = SHIFT_SCHEDULES[scheduleName as keyof typeof SHIFT_SCHEDULES];

  // 2. Aplicar as regras de folga e horários específicos
  
  // Regras de Folga Específicas:
  if (scheduleName === 'Dia' && dayOfWeek === 0) { // Domingo folga para Turno Dia
    return { status: 'Folga' };
  }
  if (scheduleName === 'Intermediario' && dayOfWeek === 5) { // Sexta folga para Turno Intermediário
    return { status: 'Folga' };
  }
  
  // Regras de Horário:
  const shift = schedule[dayOfWeek as keyof typeof schedule];

  if (shift) {
    // Se for um turno noturno que termina no dia seguinte, a entrada é hoje e a saída é amanhã.
    // Para o apontamento, registramos a entrada e a saída no mesmo dia (o dia de entrada).
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