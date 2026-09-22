import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { calculateDailyTimesAndGaps, resolveShiftScheduleInfo } from './shiftService';
import { calculateDuration, formatDuration } from '@/lib/utils';

export interface RawSnapshotFilter {
  dateMode: 'single' | 'range';
  selectedDate: string; // YYYY-MM-DD
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  userId: string;
  professionCode: string;
  shiftCode: string;
  digitadoFilter: 'all' | 'sim' | 'nao';
  afSearchTerm: string;
  sortDaysDirection?: 'asc' | 'desc';
}

export interface RawSnapshot {
  meta: {
    generatedAt: string;
    filter: RawSnapshotFilter;
    version: number;
  };
  profiles: any[];
  shifts: any[];
  dailyServiceOrders: any[];
  professions: any[];
  afs: any[];
}

export interface DaySnapshot {
  operationalDate: string; // YYYY-MM-DD
  calendarDate: string;    // YYYY-MM-DD
  shift: {
    name: string;
    type: string;
    start: string | null;
    end: string | null;
  };
  isDayOff: boolean;
  serviceOrders: any[];
  percurso: any[];
  aguardandoServico: Array<{
    type: 'aguardando';
    start: string;
    end: string;
    durationMinutes: number;
  }>;
  totals: {
    osMinutes: number;
    percursoMinutes: number;
    aguardandoMinutes: number;
    totalMinutes: number;
  };
}

export interface EmployeeSnapshot {
  id: string;
  cracha: string;
  nome: string;
  profession_code: number | null;
  shift_code: number | null;
  turnoPadrao: string;
  days: DaySnapshot[];
}

export interface ProcessedSnapshot {
  meta: {
    generatedAt: string;
    periodStr: string;
    version: number;
  };
  employees: EmployeeSnapshot[];
  summaryTotals: {
    osMinutes: number;
    percursoMinutes: number;
    aguardandoMinutes: number;
    totalMinutes: number;
    totalOsCount: number;
    pendingOsCount: number;
  };
  dailyChartSlices: Array<{
    name: string;
    value: number;
    time: string;
    is_percurso?: boolean;
    is_waiting?: boolean;
  }>;
  monthlyChartSlices: Array<{
    day: string;
    minutes: number;
    percursoMinutes: number;
    waitingMinutes: number;
  }>;
  flatOSList: any[];
}

export interface MemoryIndexes {
  userById: Map<string, any>;
  shiftByRefCode: Map<number, any>;
  serviceOrdersByEmployeeAndDay: Map<string, Map<string, any[]>>; // userId -> operationalDate -> OS[]
  afMap: Map<string, string>; // af_number -> descricao
}

/**
 * Constrói índices em memória O(1) a partir dos dados do RawSnapshot.
 */
export function createMemoryIndexes(rawSnapshot: RawSnapshot): MemoryIndexes {
  const userById = new Map<string, any>();
  (rawSnapshot.profiles || []).forEach(p => userById.set(p.id, p));

  const shiftByRefCode = new Map<number, any>();
  (rawSnapshot.shifts || []).forEach(s => {
    if (s.ref_code !== undefined && s.ref_code !== null) {
      shiftByRefCode.set(Number(s.ref_code), s);
    }
  });

  const serviceOrdersByEmployeeAndDay = new Map<string, Map<string, any[]>>();
  (rawSnapshot.dailyServiceOrders || []).forEach(record => {
    const userId = record.user_id;
    const dateStr = record.date;
    if (!userId || !dateStr) return;

    if (!serviceOrdersByEmployeeAndDay.has(userId)) {
      serviceOrdersByEmployeeAndDay.set(userId, new Map());
    }
    const userDayMap = serviceOrdersByEmployeeAndDay.get(userId)!;
    const existingList = userDayMap.get(dateStr) || [];
    const recordOsList = Array.isArray(record.os_list) ? record.os_list : [];
    
    // Anexar meta-informações do registro para facilitar
    const enhancedOsList = recordOsList.map((os: any, index: number) => ({
      ...os,
      id: os.id || `old-${record.id}-${index}`,
      recordId: record.id,
      recordDate: dateStr,
      user_id: userId
    }));

    userDayMap.set(dateStr, [...existingList, ...enhancedOsList]);
  });

  const afMap = new Map<string, string>();
  (rawSnapshot.afs || []).forEach(af => {
    if (af.af_number) {
      afMap.set(af.af_number, af.descricao || '');
    }
  });

  return {
    userById,
    shiftByRefCode,
    serviceOrdersByEmployeeAndDay,
    afMap
  };
}

/**
 * Processamento determinístico local em memória para gerar o ProcessedSnapshot.
 * 0 chamadas ao Supabase ocorrem durante este processamento.
 */
export function processSnapshot(rawSnapshot: RawSnapshot): ProcessedSnapshot {
  const indexes = createMemoryIndexes(rawSnapshot);
  const filter = rawSnapshot.meta.filter;

  const {
    dateMode,
    selectedDate,
    startDate,
    endDate,
    userId,
    professionCode,
    shiftCode,
    digitadoFilter,
    afSearchTerm,
    sortDaysDirection = 'desc'
  } = filter;

  // Filtrar usuários por userId, professionCode e shiftCode
  const filteredProfiles = (rawSnapshot.profiles || []).filter(profile => {
    if (userId !== 'all' && profile.id !== userId) return false;
    if (professionCode !== 'all' && profile.profession_code?.toString() !== professionCode) return false;
    if (shiftCode !== 'all' && profile.shift_code?.toString() !== shiftCode) return false;
    return true;
  });

  // Definir intervalo de dias a ser processado para o gráfico mensal/período
  let intervalStart: Date;
  let intervalEnd: Date;

  if (dateMode === 'single') {
    const selObj = parseISO(selectedDate);
    intervalStart = startOfMonth(selObj);
    intervalEnd = endOfMonth(selObj);
  } else {
    intervalStart = parseISO(startDate);
    intervalEnd = parseISO(endDate);
  }

  const allDaysInInterval = eachDayOfInterval({ start: intervalStart, end: intervalEnd });

  // Dias em que as OSs farão parte da flatOSList e dailyChartSlices (dias primários do filtro)
  const isPrimaryDay = (dateStr: string): boolean => {
    if (dateMode === 'single') {
      return dateStr === selectedDate;
    }
    return dateStr >= startDate && dateStr <= endDate;
  };

  const employeesSnapshots: EmployeeSnapshot[] = [];
  const flatOSList: any[] = [];
  let totalDailyWaitingMinutes = 0;

  for (const profile of filteredProfiles) {
    const badge = profile.badge || '';
    const nome = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const userDisplayName = `${badge ? badge + ' - ' : ''}${nome || 'Desconhecido'}`;
    const userShiftObj = indexes.shiftByRefCode.get(profile.shift_code) || profile.shift_code;

    const daysSnapshots: DaySnapshot[] = [];

    for (const dayObj of allDaysInInterval) {
      const dateStr = format(dayObj, 'yyyy-MM-dd');
      const rawUserOsList = indexes.serviceOrdersByEmployeeAndDay.get(profile.id)?.get(dateStr) || [];

      // Filtrar OS do dia por status digitado e termo AF
      const filteredDayOsList: any[] = [];
      for (const os of rawUserOsList) {
        const isConfirmed = os.confirmed === true;

        if (digitadoFilter === 'sim' && !isConfirmed) continue;
        if (digitadoFilter === 'nao' && isConfirmed) continue;

        if (afSearchTerm) {
          const term = afSearchTerm.toLowerCase();
          const afNumber = (os.af || '').toLowerCase();
          const afDesc = (indexes.afMap.get(os.af) || '').toLowerCase();
          if (!afNumber.includes(term) && !afDesc.includes(term)) continue;
        }

        const osItem = {
          ...os,
          userDisplayName,
          badge,
          profession_code: profile.profession_code || null,
          shift_code: profile.shift_code || null,
          confirmed: isConfirmed
        };

        filteredDayOsList.push(osItem);

        if (isPrimaryDay(dateStr)) {
          flatOSList.push(osItem);
        }
      }

      // Resolver informações do turno para este dia
      const shiftInfo = resolveShiftScheduleInfo(dayObj, userShiftObj);

      // Calcular tempos e lacunas de "Aguardando Serviço"
      const breakdown = calculateDailyTimesAndGaps(filteredDayOsList, dayObj, userShiftObj);

      const serviceOrders = filteredDayOsList.filter(os => !os.is_percurso);
      const percurso = filteredDayOsList.filter(os => !!os.is_percurso);

      const waitingIntervals = breakdown.waitingIntervals.map(i => ({
        type: 'aguardando' as const,
        start: i.start,
        end: i.end,
        durationMinutes: i.durationMinutes
      }));

      if (isPrimaryDay(dateStr)) {
        totalDailyWaitingMinutes += breakdown.waitingMinutes;
      }

      daysSnapshots.push({
        operationalDate: dateStr,
        calendarDate: dateStr,
        shift: {
          name: shiftInfo.shiftName,
          type: shiftInfo.shiftName,
          start: shiftInfo.entry || null,
          end: shiftInfo.exit || null
        },
        isDayOff: shiftInfo.status === 'Folga',
        serviceOrders,
        percurso,
        aguardandoServico: waitingIntervals,
        totals: {
          osMinutes: breakdown.osMinutes,
          percursoMinutes: breakdown.percursoMinutes,
          aguardandoMinutes: breakdown.waitingMinutes,
          totalMinutes: breakdown.totalMinutes
        }
      });
    }

    employeesSnapshots.push({
      id: profile.id,
      cracha: badge,
      nome,
      profession_code: profile.profession_code,
      shift_code: profile.shift_code,
      turnoPadrao: typeof userShiftObj === 'object' ? userShiftObj?.name || 'Sem Turno' : 'Sem Turno',
      days: daysSnapshots
    });
  }

  // Ordenar flatOSList conforme solicitação do usuário
  flatOSList.sort((a, b) => {
    if (sortDaysDirection === 'asc') {
      return a.recordDate.localeCompare(b.recordDate);
    } else {
      return b.recordDate.localeCompare(a.recordDate);
    }
  });

  // Construir slices do gráfico de rosca (dailyChartSlices) a partir da flatOSList e totalDailyWaitingMinutes
  const dailyChartSlices: Array<{ name: string; value: number; time: string; is_percurso?: boolean; is_waiting?: boolean }> = [];
  const osDataMap = new Map<string, any>();

  flatOSList.forEach(os => {
    if (os.hora_inicio && os.hora_final) {
      const duration = calculateDuration(os.hora_inicio, os.hora_final);
      const isPercurso = !!os.is_percurso;
      const key = isPercurso ? `Percurso-${os.id}` : (os.af || os.os || 'Sem ID');
      const name = isPercurso ? (os.af ? `Percurso (AF: ${os.af})` : 'Percurso') : (os.af ? `AF: ${os.af}` : `OS: ${os.os}`);

      if (osDataMap.has(key)) {
        osDataMap.get(key).value += duration;
      } else {
        osDataMap.set(key, {
          name,
          value: duration,
          time: `${os.hora_inicio} - ${os.hora_final}`,
          is_percurso: isPercurso
        });
      }
    }
  });

  dailyChartSlices.push(...Array.from(osDataMap.values()));

  if (totalDailyWaitingMinutes > 0) {
    dailyChartSlices.push({
      name: 'Aguardando Serviço',
      value: totalDailyWaitingMinutes,
      time: formatDuration(totalDailyWaitingMinutes),
      is_waiting: true
    });
  }

  // Construir slices do gráfico em barras (monthlyChartSlices) agregando os DaySnapshots por data
  const dayTotalsMap = new Map<string, { minutes: number; percursoMinutes: number; waitingMinutes: number }>();
  for (const dayObj of allDaysInInterval) {
    const dStr = format(dayObj, 'yyyy-MM-dd');
    dayTotalsMap.set(dStr, { minutes: 0, percursoMinutes: 0, waitingMinutes: 0 });
  }

  for (const emp of employeesSnapshots) {
    for (const daySnap of emp.days) {
      const existing = dayTotalsMap.get(daySnap.operationalDate);
      if (existing) {
        existing.minutes += daySnap.totals.osMinutes;
        existing.percursoMinutes += daySnap.totals.percursoMinutes;
        existing.waitingMinutes += daySnap.totals.aguardandoMinutes;
      }
    }
  }

  const monthlyChartSlices = Array.from(dayTotalsMap.entries()).map(([dateStr, val]) => ({
    day: format(parseISO(dateStr), 'dd/MM'),
    minutes: val.minutes,
    percursoMinutes: val.percursoMinutes,
    waitingMinutes: val.waitingMinutes
  }));

  // Resumo dos Totais
  let osMinutesSum = 0;
  let percursoMinutesSum = 0;
  let waitingMinutesSum = 0;

  monthlyChartSlices.forEach(m => {
    osMinutesSum += m.minutes;
    percursoMinutesSum += m.percursoMinutes;
    waitingMinutesSum += m.waitingMinutes;
  });

  const summaryTotals = {
    osMinutes: osMinutesSum,
    percursoMinutes: percursoMinutesSum,
    aguardandoMinutes: waitingMinutesSum,
    totalMinutes: osMinutesSum + percursoMinutesSum + waitingMinutesSum,
    totalOsCount: flatOSList.length,
    pendingOsCount: flatOSList.filter(os => !os.confirmed).length
  };

  const periodStr = dateMode === 'single'
    ? format(parseISO(selectedDate), 'dd/MM/yyyy')
    : `${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      periodStr,
      version: 1
    },
    employees: employeesSnapshots,
    summaryTotals,
    dailyChartSlices,
    monthlyChartSlices,
    flatOSList
  };
}
