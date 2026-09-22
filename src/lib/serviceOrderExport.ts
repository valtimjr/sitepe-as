import { ServiceOrderData } from '@/types/supabase';
import { calculateDailyTimesAndGaps, timeToOpMinutes } from '@/services/shiftService';

export type ExportEntry =
  | { kind: 'activity'; os: ServiceOrderData }
  | { kind: 'waiting'; start: string; end: string };

export interface InvalidTimeEntry {
  af: string;
  os: string;
  isPercurso: boolean;
  reason: 'missing' | 'invalid';
  hora_inicio: string;
  hora_final: string;
}

const TIME_REGEX = /^\d{2}:\d{2}$/;

const isValidTimeFormat = (time?: string | null): time is string =>
  !!time && TIME_REGEX.test(time);

/**
 * Valida os horários de todas as OS/Percursos do dia.
 * Uma atividade é válida quando início e fim existem, estão em HH:MM
 * e início < fim dentro do dia operacional (07:00 → 06:59).
 */
export function validateExportTimes(osList: ServiceOrderData[]): InvalidTimeEntry[] {
  const problems: InvalidTimeEntry[] = [];

  osList.forEach(os => {
    const base = {
      af: os.af || '',
      os: os.os || '',
      isPercurso: !!os.is_percurso,
      hora_inicio: os.hora_inicio || '',
      hora_final: os.hora_final || '',
    };

    if (!os.hora_inicio || !os.hora_final) {
      problems.push({ ...base, reason: 'missing' });
      return;
    }

    if (!isValidTimeFormat(os.hora_inicio) || !isValidTimeFormat(os.hora_final)) {
      problems.push({ ...base, reason: 'invalid' });
      return;
    }

    if (timeToOpMinutes(os.hora_inicio) >= timeToOpMinutes(os.hora_final)) {
      problems.push({ ...base, reason: 'invalid' });
    }
  });

  return problems;
}

/**
 * Monta a sequência cronológica de atividades e blocos de Aguardando Serviço,
 * usando a mesma função que alimenta o Resumo Diário.
 */
export function calculateExportIntervals(
  allDayOs: ServiceOrderData[],
  displayOrder: 'asc' | 'desc',
  date: Date,
  shiftRef?: any
): ExportEntry[] {
  const { waitingIntervals } = calculateDailyTimesAndGaps(allDayOs, date, shiftRef);

  const activities = [...allDayOs].sort(
    (a, b) => timeToOpMinutes(a.hora_inicio) - timeToOpMinutes(b.hora_inicio)
  );

  const gaps = waitingIntervals
    .filter(g => g.durationMinutes > 0)
    .map(g => ({
      start: g.start,
      end: g.end,
      opStart: timeToOpMinutes(g.start),
      opEnd: timeToOpMinutes(g.start) + g.durationMinutes,
    }))
    .sort((a, b) => a.opStart - b.opStart);

  const result: ExportEntry[] = [];
  let gapIdx = 0;

  for (const activity of activities) {
    const actStart = timeToOpMinutes(activity.hora_inicio);
    while (gapIdx < gaps.length && gaps[gapIdx].opEnd <= actStart) {
      result.push({ kind: 'waiting', start: gaps[gapIdx].start, end: gaps[gapIdx].end });
      gapIdx++;
    }
    result.push({ kind: 'activity', os: activity });
  }

  while (gapIdx < gaps.length) {
    result.push({ kind: 'waiting', start: gaps[gapIdx].start, end: gaps[gapIdx].end });
    gapIdx++;
  }

  return displayOrder === 'desc' ? result.reverse() : result;
}

/**
 * Monta o texto do aviso de horários inválidos.
 */
export function buildInvalidTimesMessage(entries: InvalidTimeEntry[]): { title: string; lines: string[] } {
  const title = 'Não é possível calcular corretamente o Aguardando Serviço.';

  const describe = (e: InvalidTimeEntry, separator: string) => {
    let label = e.isPercurso
      ? `Percurso${e.af ? ` (AF: ${e.af})` : ''}`
      : `AF: ${e.af}${e.os ? `${separator}OS: ${e.os}` : ''}`;
    if (e.reason === 'invalid') {
      label += ` (${e.hora_inicio || '??'}-${e.hora_final || '??'} inválido)`;
    }
    return label;
  };

  if (entries.length === 1) {
    const e = entries[0];
    const intro = e.reason === 'missing'
      ? 'A seguinte ordem de serviço está sem horário:'
      : 'A seguinte ordem de serviço está com horário inválido:';
    return {
      title,
      lines: [
        intro,
        ...describe(e, '\n').split('\n'),
        '',
        'Informe a hora inicial e a hora final antes de exportar.',
      ],
    };
  }

  return {
    title,
    lines: [
      'Existem ordens de serviço com horários incompletos:',
      ...entries.map(e => describe(e, ' — ')),
      '',
      'Corrija os horários antes de exportar.',
    ],
  };
}
