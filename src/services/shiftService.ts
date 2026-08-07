import { format, isSameDay, parseISO, startOfDay, differenceInDays, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Apontamento } from './partListService'; // Importando Apontamento para tipagem

// 1. Definição dos Horários de Trabalho por Escala (Dia da Semana: 0=Dom, 1=Seg, ..., 6=Sáb)
const SHIFT_SCHEDULES = {
  Dia: {
    0: { status: 'Folga' }, // Domingo folga
    1: { entry: '07:00', exit: '15:00' }, // Segunda
    2: { entry: '07:00', exit: '15:00' }, // Terça
    3: { entry: '07:00', exit: '15:00' }, // Quarta
    4: { entry: '07:00', exit: '15:00' }, // Quinta
    5: { entry: '07:00', exit: '19:00' }, // Sexta
    6: { entry: '07:00', exit: '19:00' }, // Sábado
  },
  Intermediario: {
    0: { entry: '19:00', exit: '07:00', overnight: true }, // Domingo
    1: { entry: '15:00', exit: '23:00' }, // Segunda
    2: { entry: '15:00', exit: '23:00' }, // Terça
    3: { entry: '15:00', exit: '23:00' }, // Quarta
    4: { entry: '15:00', exit: '23:00' }, // Quinta
    5: { status: 'Folga' }, // Sexta folga
    6: { entry: '19:00', exit: '07:00', overnight: true }, // Sábado
  },
  Noite: {
    0: { entry: '07:00', exit: '19:00' }, // Domingo: ALTERADO para 07:00 - 19:00
    1: { entry: '23:00', exit: '07:00', overnight: true }, // Segunda
    2: { entry: '23:00', exit: '07:00', overnight: true }, // Terça
    3: { entry: '23:00', exit: '07:00', overnight: true }, // Quarta
    4: { entry: '23:00', exit: '07:00', overnight: true }, // Quinta
    5: { entry: '19:00', exit: '07:00', overnight: true }, // Sexta
    6: { status: 'Folga' }, // Sábado (Folga)
  },
  // Turnos Fixos: Agora preenchem todos os 7 dias da semana
  'Turno Dia 07:00 - 17:00': {
    0: { entry: '07:00', exit: '17:00' }, // Domingo
    1: { entry: '07:00', exit: '17:00' }, // Segunda
    2: { entry: '07:00', exit: '17:00' }, // Terça
    3: { entry: '07:00', exit: '17:00' }, // Quarta
    4: { entry: '07:00', exit: '17:00' }, // Quinta
    5: { entry: '07:00', exit: '17:00' }, // Sexta
    6: { entry: '07:00', exit: '17:00' }, // Sábado
  },
  'Turno Dia 07:30 - 17:00': {
    0: { entry: '07:30', exit: '17:00' }, // Domingo
    1: { entry: '07:30', exit: '17:00' }, // Segunda
    2: { entry: '07:30', exit: '17:00' }, // Terça
    3: { entry: '07:30', exit: '17:00' }, // Quarta
    4: { entry: '07:30', exit: '17:00' }, // Quinta
    5: { entry: '07:30', exit: '17:00' }, // Sexta
    6: { entry: '07:30', exit: '17:00' }, // Sábado
  },
};

// 2. Definição da Rotação
const SHIFT_ORDER = ['Dia', 'Intermediario', 'Noite'];
const ROTATING_TURNS = ['Turno A', 'Turno B', 'Turno C'];
const FIXED_TURNS = ['Turno Dia 07:00 - 17:00', 'Turno Dia 07:30 - 17:00']; // Mantido para referência interna, mas não exportado

// Mapeamento de Turno para o índice da escala na Semana 1 (2024-01-01)
// Turno A = Noite (Índice 2) - REVERTIDO
// Turno B = Dia (Índice 0)
// Turno C = Intermediário (Índice 1)
const TURN_BASE_INDEX: { [key: string]: number } = {
  'Turno A': 2, // Noite (Revertido para o valor anterior)
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
 * @param turn The shift turn (Turno A, Turno B, Turno C, Turno Dia 07:00 - 17:00, etc.).
 * @returns The entry and exit times (or status for day off), PLUS the determined shift name.
 */
export const getShiftSchedule = (date: Date, turn: string): { entry?: string; exit?: string; status?: string; shiftName: string } => {
  const dayOfWeek = getDay(date); // 0 (Dom) a 6 (Sáb)

  if (FIXED_TURNS.includes(turn)) {
    const schedule = SHIFT_SCHEDULES[turn as keyof typeof SHIFT_SCHEDULES];
    const shift = schedule[dayOfWeek as keyof typeof schedule] || {};
    return { ...shift, shiftName: turn };
  }

  // Lógica para turnos rotativos
  const cycleIndex = calculateCycleIndex(date); // 0, 1, ou 2
  const turnBaseIndex = TURN_BASE_INDEX[turn];
  if (typeof turnBaseIndex === 'undefined') return { shiftName: 'Outros' };

  // O índice da escala de horário para o turno é (BaseIndex + cycleIndex) % 3
  const scheduleIndex = (turnBaseIndex + cycleIndex) % 3;
  const scheduleName = SHIFT_ORDER[scheduleIndex];
  const schedule = SHIFT_SCHEDULES[scheduleName as keyof typeof SHIFT_SCHEDULES];

  // 2. Aplicar as regras de horário/folga
  const shift = schedule[dayOfWeek as keyof typeof schedule];

  if (shift) {
    if ('status' in shift && shift.status === 'Folga') {
      return { status: 'Folga', shiftName: 'Folga' };
    }
    if ('entry' in shift && 'exit' in shift) {
      return { entry: shift.entry, exit: shift.exit, shiftName: scheduleName };
    }
  }

  // Se não houver regra definida para o dia da semana na escala atual, é folga.
  return { status: 'Folga', shiftName: 'Folga' };
};

/**
 * Gera os apontamentos automáticos para um mês inteiro.
 * @param monthDate Qualquer data dentro do mês desejado.
 * @param turn The shift turn (Turno A, Turno B, Turno C, Turno Dia 07:00 - 17:00, etc.).
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
      // REMOVIDO: id: uuidv4(), // Não é mais necessário, 'date' é o identificador único
      date: dateString,
      entry_time: schedule.entry,
      exit_time: schedule.exit,
      status: schedule.status,
      created_at: new Date().toISOString(), // Convertido para ISO string
    };
  });
};

export type ShiftTurn = 'Turno A' | 'Turno B' | 'Turno C' | 'Turno Dia 07:00 - 17:00' | 'Turno Dia 07:30 - 17:00';
export const ROTATING_TURNS_ONLY: ShiftTurn[] = [...ROTATING_TURNS] as ShiftTurn[];
export const ALL_TURNS: ShiftTurn[] = [...ROTATING_TURNS, ...FIXED_TURNS] as ShiftTurn[];

/**
 * Lógica reutilizável para validar horários de início e término contra o turno do funcionário.
 * Suporta turnos que cruzam a meia-noite e segue a regra do Dia Operacional.
 *
 * @param horaInicio Horário de início informado (ex: "08:30") ou vazio
 * @param horaFinal Horário de término informado (ex: "17:00") ou vazio
 * @param date A data operacional em que a OS/Percurso está sendo criada/editada
 * @param shift O objeto de turno do usuário contendo name, entry_time, exit_time
 * @returns { isValid: boolean; shiftRangeStr?: string; offTime?: string }
 */
export const validateTimesAgainstShift = (
  horaInicio: string,
  horaFinal: string,
  date: Date,
  shift: { name: string; entry_time?: string | null; exit_time?: string | null } | null
): { isValid: boolean; shiftRangeStr?: string; offTime?: string } => {
  if (!shift) {
    return { isValid: true };
  }

  // 1. Determinar o horário de entrada e saída previsto para o dia
  let entry: string | undefined;
  let exit: string | undefined;
  let status: string | undefined;

  if (['Turno A', 'Turno B', 'Turno C'].includes(shift.name)) {
    const schedule = getShiftSchedule(date, shift.name);
    entry = schedule.entry;
    exit = schedule.exit;
    status = schedule.status;
  } else if (shift.entry_time && shift.exit_time) {
    const dayOfWeek = getDay(date);
    if (dayOfWeek === 0) { // Domingo é Folga por padrão para turnos fixos normais
      status = 'Folga';
    } else {
      entry = shift.entry_time;
      exit = shift.exit_time;
    }
  } else {
    const schedule = getShiftSchedule(date, shift.name);
    entry = schedule.entry;
    exit = schedule.exit;
    status = schedule.status;
  }

  // Se o dia for de folga, qualquer horário informado estará fora do turno
  if (status === 'Folga' || (!entry && !exit)) {
    if (horaInicio || horaFinal) {
      return {
        isValid: false,
        shiftRangeStr: 'Folga',
        offTime: horaInicio || horaFinal
      };
    }
    return { isValid: true };
  }

  const shiftEntry = entry!;
  const shiftExit = exit!;

  // Função interna para validar se um horário específico está dentro do turno
  const isTimeInInterval = (time: string, start: string, end: string): boolean => {
    if (!time) return true;
    
    const [tH, tM] = time.split(':').map(Number);
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    
    const tMin = tH * 60 + tM;
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;

    if (sMin <= eMin) {
      // Turno normal (não cruza meia-noite)
      return tMin >= sMin && tMin <= eMin;
    } else {
      // Turno cruza a meia-noite
      return tMin >= sMin || tMin <= eMin;
    }
  };

  if (horaInicio && !isTimeInInterval(horaInicio, shiftEntry, shiftExit)) {
    return {
      isValid: false,
      shiftRangeStr: `${shiftEntry} às ${shiftExit}`,
      offTime: horaInicio
    };
  }

  if (horaFinal && !isTimeInInterval(horaFinal, shiftEntry, shiftExit)) {
    return {
      isValid: false,
      shiftRangeStr: `${shiftEntry} às ${shiftExit}`,
      offTime: horaFinal
    };
  }

  return { isValid: true };
};

export interface DailyTimesBreakdown {
  osMinutes: number;
  percursoMinutes: number;
  waitingMinutes: number;
  totalMinutes: number;
  waitingIntervals: Array<{ start: string; end: string; durationMinutes: number }>;
  shiftInfo: { entry?: string; exit?: string; status?: string; shiftName: string };
}

/**
 * Converte horário HH:MM para minutos operacionais a partir das 07:00 (base 0).
 * 07:00 = 0
 * 17:00 = 600
 * 23:59 = 1019
 * 00:00 = 1020
 * 06:59 = 1439
 */
export function timeToOpMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
  const h = parts[0];
  const m = parts[1];
  const adjustedH = h < 7 ? h + 24 : h;
  return (adjustedH - 7) * 60 + m;
}

/**
 * Converte minutos operacionais (base 07:00) de volta para string HH:MM.
 */
export function opMinutesToTime(opMin: number): string {
  const totalH = Math.floor(opMin / 60) + 7;
  const actualH = ((totalH % 24) + 24) % 24;
  const actualM = Math.floor(opMin % 60);
  return `${actualH.toString().padStart(2, '0')}:${actualM.toString().padStart(2, '0')}`;
}

/**
 * Resolve as informações de horário de turno para uma data e referência de turno.
 */
export function resolveShiftScheduleInfo(
  date: Date,
  shiftOrTurn?: any
): { entry?: string; exit?: string; status?: string; shiftName: string } {
  if (!shiftOrTurn) {
    return getShiftSchedule(date, 'Turno Dia 07:00 - 17:00');
  }

  if (typeof shiftOrTurn === 'string') {
    return getShiftSchedule(date, shiftOrTurn);
  }

  if (typeof shiftOrTurn === 'object') {
    if (shiftOrTurn.status === 'Folga') {
      return { status: 'Folga', shiftName: shiftOrTurn.name || shiftOrTurn.shiftName || 'Folga' };
    }

    const name = shiftOrTurn.name || shiftOrTurn.shiftName;
    if (name && ALL_TURNS.includes(name as ShiftTurn)) {
      return getShiftSchedule(date, name);
    }

    const entry = shiftOrTurn.entry_time || shiftOrTurn.entry;
    const exit = shiftOrTurn.exit_time || shiftOrTurn.exit;
    const dayOfWeek = getDay(date);

    if (dayOfWeek === 0 && (!name || !['Turno A', 'Turno B', 'Turno C'].includes(name))) {
      if (!entry && !exit) {
        return { status: 'Folga', shiftName: name || 'Folga' };
      }
    }

    if (entry && exit) {
      return { entry, exit, shiftName: name || 'Turno Customizado' };
    }

    if (name) {
      return getShiftSchedule(date, name);
    }
  }

  return { shiftName: 'Sem Turno' };
}

/**
 * Função utilitária centralizada para calcular os tempos do dia (OS, Percurso e Aguardando Serviço).
 * O tempo em "Aguardando Serviço" é calculado exclusivamente como lacunas dentro do horário de turno do funcionário.
 */
export function calculateDailyTimesAndGaps(
  osList: any[],
  date: Date,
  shiftOrTurn?: any
): DailyTimesBreakdown {
  let osMinutes = 0;
  let percursoMinutes = 0;

  if (Array.isArray(osList)) {
    osList.forEach(os => {
      if (!os || !os.hora_inicio || !os.hora_final) return;
      const [sH, sM] = os.hora_inicio.split(':').map(Number);
      const [eH, eM] = os.hora_final.split(':').map(Number);
      if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return;

      let startMin = sH * 60 + sM;
      let endMin = eH * 60 + eM;
      if (endMin < startMin) endMin += 24 * 60;
      const duration = endMin - startMin;

      if (os.is_percurso) {
        percursoMinutes += duration;
      } else {
        osMinutes += duration;
      }
    });
  }

  const shiftInfo = resolveShiftScheduleInfo(date, shiftOrTurn);

  // Se for folga ou sem entrada/saída, não há "Aguardando Serviço"
  if (shiftInfo.status === 'Folga' || !shiftInfo.entry || !shiftInfo.exit) {
    return {
      osMinutes,
      percursoMinutes,
      waitingMinutes: 0,
      totalMinutes: osMinutes + percursoMinutes,
      waitingIntervals: [],
      shiftInfo
    };
  }

  const shiftStartOp = timeToOpMinutes(shiftInfo.entry);
  let shiftEndOp = timeToOpMinutes(shiftInfo.exit);
  if (shiftEndOp <= shiftStartOp) {
    shiftEndOp += 24 * 60; // Trata turnos que viram a noite ou terminam às 07:00 do dia seguinte
  }

  // Mapear intervalos ocupados por OS/Percurso limitados (clamped) ao horário do turno
  const occupiedIntervals: Array<[number, number]> = [];

  if (Array.isArray(osList)) {
    osList.forEach(os => {
      if (!os || !os.hora_inicio || !os.hora_final) return;

      const osStartOp = timeToOpMinutes(os.hora_inicio);
      let osEndOp = timeToOpMinutes(os.hora_final);
      if (osEndOp <= osStartOp) {
        osEndOp += 24 * 60;
      }

      // Limitar ao horário de início e fim do turno
      const clampedStart = Math.max(osStartOp, shiftStartOp);
      const clampedEnd = Math.min(osEndOp, shiftEndOp);

      if (clampedStart < clampedEnd) {
        occupiedIntervals.push([clampedStart, clampedEnd]);
      }
    });
  }

  // Ordenar e mesclar intervalos ocupados sobrepostos ou adjacentes
  occupiedIntervals.sort((a, b) => a[0] - b[0]);

  const mergedOccupied: Array<[number, number]> = [];
  for (const interval of occupiedIntervals) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push([...interval]);
    } else {
      const last = mergedOccupied[mergedOccupied.length - 1];
      if (interval[0] <= last[1]) {
        last[1] = Math.max(last[1], interval[1]);
      } else {
        mergedOccupied.push([...interval]);
      }
    }
  }

  // Encontrar lacunas (Aguardando Serviço) no turno
  const waitingIntervals: Array<{ start: string; end: string; durationMinutes: number }> = [];
  let currentPointer = shiftStartOp;

  for (const [occStart, occEnd] of mergedOccupied) {
    if (occStart > currentPointer) {
      const durationMinutes = occStart - currentPointer;
      waitingIntervals.push({
        start: opMinutesToTime(currentPointer),
        end: opMinutesToTime(occStart),
        durationMinutes
      });
    }
    currentPointer = Math.max(currentPointer, occEnd);
  }

  if (currentPointer < shiftEndOp) {
    const durationMinutes = shiftEndOp - currentPointer;
    waitingIntervals.push({
      start: opMinutesToTime(currentPointer),
      end: opMinutesToTime(shiftEndOp),
      durationMinutes
    });
  }

  const waitingMinutes = waitingIntervals.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return {
    osMinutes,
    percursoMinutes,
    waitingMinutes,
    totalMinutes: osMinutes + percursoMinutes + waitingMinutes,
    waitingIntervals,
    shiftInfo
  };
}