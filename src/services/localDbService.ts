import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { DailyApontamento, MonthlyApontamento } from '@/types/supabase'; // Importar novos tipos

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags?: string;
  name?: string; // Adicionado o campo 'name'
  itens_relacionados?: string[]; // Adicionado o campo 'itens_relacionados'
}

export interface SimplePartItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af?: string; // AF agora é opcional para SimplePartItem
  created_at?: Date;
}

export interface ServiceOrderItem {
  id: string;
  codigo_peca?: string;
  descricao?: string;
  quantidade?: number;
  af: string; // AF é obrigatório para ServiceOrderItem
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  created_at?: Date;
}

export interface Af {
  id: string;
  af_number: string;
  descricao?: string; // NOVO CAMPO
}

// A interface Apontamento agora é DailyApontamento, mas para compatibilidade
// com o resto do código que ainda pode usar 'Apontamento', vamos re-exportá-la.
export type Apontamento = DailyApontamento;

class LocalDexieDb extends Dexie {
  simplePartsList!: Table<SimplePartItem>;
  serviceOrderItems!: Table<ServiceOrderItem>;
  parts!: Table<Part>;
  afs!: Table<Af>;
  monthlyApontamentos!: Table<MonthlyApontamento>; // Nova tabela para apontamentos mensais

  constructor() {
    super('PartsListDatabase');
    this.version(1).stores({
      listItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    });
    this.version(2).stores({
      listItems: null, // Explicitamente deleta a tabela antiga
      simplePartsList: 'id, codigo_peca, descricao, created_at', // Nova tabela com 'id' como chave primária
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    }).upgrade(async tx => {
      // Migração de dados da versão 1 para a versão 2
      const oldListItems = await tx.table('listItems').toArray();
      const simpleItems: SimplePartItem[] = [];
      const serviceItems: ServiceOrderItem[] = [];

      oldListItems.forEach((item: any) => {
        if (item.af && item.af.trim() !== '') {
          serviceItems.push({
            id: item.id, // Usa o ID existente da tabela antiga
            codigo_peca: item.codigo_peca,
            descricao: item.descricao,
            quantidade: item.quantidade,
            af: item.af,
            os: item.os,
            hora_inicio: item.hora_inicio,
            hora_final: item.hora_final,
            servico_executado: item.servico_executado,
            created_at: item.created_at,
          });
        } else {
          if (item.codigo_peca && item.descricao && item.quantidade !== undefined) {
            simpleItems.push({
              id: item.id, // Usa o ID existente da tabela antiga
              codigo_peca: item.codigo_peca,
              descricao: item.descricao,
              quantidade: item.quantidade,
              created_at: item.created_at,
            });
          }
        }
      });

      await tx.table('simplePartsList').bulkAdd(simpleItems);
      await tx.table('serviceOrderItems').bulkAdd(serviceItems);
    });
    this.version(3).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    }).upgrade(async tx => {
      // Migração de dados da versão 2 para a versão 3 (mantida)
    });
    this.version(4).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number, descricao', // Atualizado para incluir 'descricao'
      apontamentos: 'id, user_id, date, synced_at', // Esquema antigo para apontamentos
    });
    this.version(5).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags, name', // Adicionado 'name'
      afs: '++id, af_number, descricao',
      apontamentos: 'id, user_id, date, synced_at',
    });
    this.version(6).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags, name',
      afs: '++id, af_number, descricao',
      apontamentos: null, // Remove a tabela antiga de apontamentos
      monthlyApontamentos: 'id, user_id, month_year, [user_id+month_year]', // Nova tabela para apontamentos mensais com índice composto
    }).upgrade(async tx => {
      // Lógica de migração de apontamentos antigos para o novo formato mensal
      const oldApontamentos = await tx.table('apontamentos').toArray();
      const monthlyDataMap: { [key: string]: MonthlyApontamento } = {};

      oldApontamentos.forEach((oldAp: any) => {
        const date = new Date(oldAp.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const userId = oldAp.user_id;
        const key = `${userId}-${monthYear}`;

        if (!monthlyDataMap[key]) {
          monthlyDataMap[key] = {
            id: uuidv4(), // ID para o registro mensal
            user_id: userId,
            month_year: monthYear,
            data: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        // Explicitamente constrói DailyApontamento para garantir que 'id' não seja incluído
        const dailyEntry: DailyApontamento = {
          date: oldAp.date,
          entry_time: oldAp.entry_time,
          exit_time: oldAp.exit_time,
          status: oldAp.status,
          created_at: oldAp.created_at?.toISOString(),
          updated_at: oldAp.synced_at?.toISOString(),
        };
        monthlyDataMap[key].data.push(dailyEntry);
      });

      await tx.table('monthlyApontamentos').bulkAdd(Object.values(monthlyDataMap));
    });
    this.version(7).stores({ // NOVA VERSÃO
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags, name, *itens_relacionados', // Adicionado itens_relacionados como índice multi-valor
      afs: '++id, af_number, descricao',
      monthlyApontamentos: 'id, user_id, month_year, [user_id+month_year]',
    }).upgrade(async tx => {
      // Não é necessária migração de dados, apenas atualização do esquema.
    });
  }
}

export const localDb = new LocalDexieDb();

// --- Parts Management (IndexedDB) ---

export const addLocalPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() };
  await localDb.parts.add(newPart);
  return newPart.id;
};

export const bulkPutLocalParts = async (parts: Part[]): Promise<void> => {
  await localDb.parts.bulkPut(parts); // Alterado para bulkPut
};

export const getLocalParts = async (): Promise<Part[]> => {
  return localDb.parts.toArray();
};

export const searchLocalParts = async (query: string): Promise<Part[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();

  const allParts = await localDb.parts.toArray();

  if (!lowerCaseQuery) {
    return allParts;
  }

  // Cria um padrão de regex para buscar palavras em sequência
  // Escapa caracteres especiais de regex nas palavras da query
  const escapedWords = lowerCaseQuery.split(/\s+/).filter(Boolean).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regexPattern = new RegExp(escapedWords.join('.*'), 'i'); // 'i' para case-insensitive

  let results = allParts.filter(part => {
    const nameMatch = part.name && part.name.toLowerCase().match(regexPattern);
    const codigoMatch = part.codigo.toLowerCase().match(regexPattern);
    const descricaoMatch = part.descricao.toLowerCase().match(regexPattern);
    const tagsMatch = part.tags && part.tags.toLowerCase().match(regexPattern);
    // Não busca em itens_relacionados aqui, pois é um array de códigos.
    // A busca em itens_relacionados será feita separadamente se necessário.

    return nameMatch || codigoMatch || descricaoMatch || tagsMatch;
  });

  // Helper para determinar a qualidade da correspondência em um campo
  const getFieldMatchScore = (fieldValue: string | undefined, query: string, regex: RegExp, isMultiWord: boolean): number => {
    if (!fieldValue) return 0;
    const lowerFieldValue = fieldValue.toLowerCase();

    if (isMultiWord) {
      return regex.test(lowerFieldValue) ? 1 : 0; // Apenas verifica se a sequência existe
    } else { // Query de palavra única
      if (lowerFieldValue === query) return 3; // Correspondência exata
      if (lowerFieldValue.startsWith(query)) return 2; // Começa com
      if (lowerFieldValue.includes(query)) return 1; // Inclui
    }
    return 0;
  };

  results.sort((a, b) => {
    const queryWords = lowerCaseQuery.split(/\s+/).filter(Boolean);
    const isMultiWordQuery = queryWords.length > 1;
    // Usa o mesmo regexPattern do filtro para a pontuação
    const sortRegexPattern = new RegExp(escapedWords.join('.*'), 'i');

    const aNameScore = getFieldMatchScore(a.name, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const aTagsScore = getFieldMatchScore(a.tags, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const aCodigoScore = getFieldMatchScore(a.codigo, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const aDescricaoScore = getFieldMatchScore(a.descricao, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);

    const bNameScore = getFieldMatchScore(b.name, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const bTagsScore = getFieldMatchScore(b.tags, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const bCodigoScore = getFieldMatchScore(b.codigo, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const bDescricaoScore = getFieldMatchScore(b.descricao, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);

    // Prioriza nome
    if (aNameScore !== bNameScore) return bNameScore - aNameScore;
    // Depois tags
    if (aTagsScore !== bTagsScore) return bTagsScore - aTagsScore;
    // Depois código
    if (aCodigoScore !== bCodigoScore) return bCodigoScore - aCodigoScore;
    // Por último descrição
    if (aDescricaoScore !== bDescricaoScore) return bDescricaoScore - aDescricaoScore;

    return 0; // Mantém a ordem original se todas as pontuações forem iguais
  });

  return results;
};

export const updateLocalPart = async (updatedPart: Part): Promise<void> => {
  await localDb.parts.update(updatedPart.id, updatedPart);
};

export const clearLocalParts = async (): Promise<void> => {
  await localDb.parts.clear();
};

// --- AFs Management (IndexedDB) ---
export const bulkPutLocalAfs = async (afs: Af[]): Promise<void> => {
  await localDb.afs.bulkPut(afs); // Alterado para bulkPut
};

export const getLocalAfs = async (): Promise<Af[]> => {
  return localDb.afs.toArray();
};

export const clearLocalAfs = async (): Promise<void> => {
  await localDb.afs.clear();
};

// --- Simple Parts List Management (IndexedDB) ---

export const getLocalSimplePartsListItems = async (): Promise<SimplePartItem[]> => {
  return localDb.simplePartsList.toArray();
};

export const addLocalSimplePartItem = async (item: Omit<SimplePartItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date() };
  await localDb.simplePartsList.add(newItem);
  return newItem.id;
};

export const updateLocalSimplePartItem = async (updatedItem: SimplePartItem): Promise<void> => {
  await localDb.simplePartsList.update(updatedItem.id, updatedItem);
};

export const deleteLocalSimplePartItem = async (id: string): Promise<void> => {
  try {
    await localDb.simplePartsList.delete(id);
  } catch (error) {
    console.error('localDbService: Error deleting item with ID:', id, error);
    throw error; // Re-lança o erro para que o chamador possa tratá-lo
  }
};

export const clearLocalSimplePartsList = async (): Promise<void> => {
  await localDb.simplePartsList.clear();
};

// --- Service Order Items Management (IndexedDB) ---

export const getLocalServiceOrderItems = async (): Promise<ServiceOrderItem[]> => {
  return localDb.serviceOrderItems.toArray();
};

export const addLocalServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date() };
  await localDb.serviceOrderItems.add(newItem);
  return newItem.id;
};

export const updateLocalServiceOrderItem = async (updatedItem: ServiceOrderItem): Promise<void> => {
  await localDb.serviceOrderItems.update(updatedItem.id, updatedItem);
};

export const deleteLocalServiceOrderItem = async (id: string): Promise<void> => {
  await localDb.serviceOrderItems.delete(id);
};

export const clearLocalServiceOrderItems = async (): Promise<void> => {
  await localDb.serviceOrderItems.clear();
};

export const getLocalUniqueAfs = async (): Promise<string[]> => {
  const afs = await localDb.afs.toArray();
  return afs.map(af => af.af_number).sort();
};

// --- Monthly Apontamentos Management (IndexedDB) ---

export const getLocalMonthlyApontamento = async (userId: string, monthYear: string): Promise<MonthlyApontamento | undefined> => {
  const apontamento = await localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).first();
  return apontamento;
};

export const putLocalMonthlyApontamento = async (monthlyApontamento: MonthlyApontamento): Promise<void> => {
  await localDb.monthlyApontamentos.put(monthlyApontamento);
};

export const bulkPutLocalMonthlyApontamentos = async (monthlyApontamentos: MonthlyApontamento[]): Promise<void> => {
  await localDb.monthlyApontamentos.bulkPut(monthlyApontamentos);
};

export const clearLocalMonthlyApontamentos = async (userId: string): Promise<void> => {
  const idsToDelete = await localDb.monthlyApontamentos.where('user_id').equals(userId).keys();
  await localDb.monthlyApontamentos.bulkDelete(idsToDelete);
};

export const deleteLocalMonthlyApontamento = async (userId: string, monthYear: string): Promise<void> => {
  await localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).delete();
};

// --- Funções para Apontamentos (Time Tracking) ---

// Helper function to check network status
const isOnline = async () => {
    try {
        const status = await Network.getStatus();
        return status.connected;
    } catch (e) {
        // Fallback for browser environment without Capacitor plugin
        return navigator.onLine;
    }
};

// Sincroniza dados do Supabase para o IndexedDB
export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string, forcePull: boolean = false): Promise<MonthlyApontamento | undefined> => {
  
  const localMonthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);

  const { data, error } = await supabase
    .from('monthly_apontamentos')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
    console.error(`[syncMonthlyApontamentosFromSupabase] Error fetching monthly apontamentos from Supabase for ${monthYear}:`, error);
    return undefined;
  }

  if (data) {
    const remoteMonthlyApontamento: MonthlyApontamento = {
      ...data,
      data: (data.data as DailyApontamento[]).map(cleanDailyApontamento),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    if (localMonthlyApontamento) {
      // Se forcePull é true, ou se o remoto é mais recente que o local, atualiza o local
      if (forcePull || (remoteMonthlyApontamento.updated_at && localMonthlyApontamento.updated_at && new Date(remoteMonthlyApontamento.updated_at) > new Date(localMonthlyApontamento.updated_at))) {
        await putLocalMonthlyApontamento(remoteMonthlyApontamento);
        return remoteMonthlyApontamento;
      } else {
        return localMonthlyApontamento; // Retorna a versão local, que é a mais recente ou igual
      }
    } else {
      // Se não há local, apenas adiciona o remoto
      await putLocalMonthlyApontamento(remoteMonthlyApontamento);
      return remoteMonthlyApontamento;
    }
  }
  return undefined;
};

// Sincroniza um único objeto MonthlyApontamento para o Supabase
export const syncMonthlyApontamentoToSupabase = async (monthlyApontamento: MonthlyApontamento, forcePush: boolean = false): Promise<MonthlyApontamento> => {
  const { id, user_id, month_year, data, created_at, updated_at } = monthlyApontamento;
  
  // Limpa cada entrada diária antes de enviar para o Supabase
  const cleanedData = data.map(cleanDailyApontamento);

  const payload = {
    id,
    user_id,
    month_year,
    data: cleanedData, // Usa os dados limpos
    created_at: created_at || new Date().toISOString(),
    updated_at: updated_at || new Date().toISOString(), // Garante que updated_at esteja presente
  };

  if (!forcePush) {
    // Verifica a versão remota antes de enviar
    const { data: remoteData, error: remoteError } = await supabase
      .from('monthly_apontamentos')
      .select('updated_at')
      .eq('user_id', user_id)
      .eq('month_year', month_year)
      .single();

    if (remoteError && remoteError.code !== 'PGRST116') {
      console.error(`[syncMonthlyApontamentoToSupabase] Error fetching remote updated_at for ${month_year}:`, remoteError);
      // Em caso de erro ao buscar o remoto, assume que precisa enviar para evitar perda de dados
    } else if (remoteData && remoteData.updated_at && new Date(remoteData.updated_at) >= new Date(payload.updated_at)) {
      // Se o remoto é mais recente ou igual, não envia (a menos que forcePush)
      // Retorna o monthlyApontamento original, pois não houve alteração no Supabase
      return monthlyApontamento; 
    }
  }

  const { data: upsertedData, error } = await supabase
    .from('monthly_apontamentos')
    .upsert(payload, { onConflict: 'user_id,month_year' }) // Conflito em user_id e month_year
    .select()
    .single();

  if (error) {
    console.error(`[syncMonthlyApontamentoToSupabase] Error upserting monthly apontamento to Supabase for ${month_year}:`, error);
    throw new Error(`Erro ao sincronizar apontamento mensal: ${error.message}`);
  }

  const syncedMonthlyApontamento: MonthlyApontamento = {
    ...upsertedData,
    data: (upsertedData.data as DailyApontamento[]).map(cleanDailyApontamento), // Limpa IDs e user_id ao receber de volta
  };

  await putLocalMonthlyApontamento(syncedMonthlyApontamento);
  
  return syncedMonthlyApontamento;
};

// Obtém apontamentos diários para um mês específico
export const getApontamentos = async (userId: string, monthYear: string): Promise<DailyApontamento[]> => {
  const online = await isOnline();
  let monthlyApontamento: MonthlyApontamento | undefined;

  if (online) {
    // Tenta sincronizar do Supabase primeiro (com lógica de comparação)
    monthlyApontamento = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
  } else {
    // Se offline, tenta do cache local
    monthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);
  }

  return monthlyApontamento?.data || [];
};

// Atualiza um apontamento diário dentro do blob JSON mensal
export const updateApontamento = async (userId: string, monthYear: string, dailyApontamento: DailyApontamento): Promise<DailyApontamento> => {
  const online = await isOnline();
  let currentMonthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);

  if (!currentMonthlyApontamento) {
    // Se não existe localmente, tenta buscar do Supabase (se online)
    if (online) {
      currentMonthlyApontamento = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
    }
    if (!currentMonthlyApontamento) {
      // Se ainda não existe, cria um novo registro mensal
      currentMonthlyApontamento = {
        id: uuidv4(), // ID para o registro mensal
        user_id: userId,
        month_year: monthYear,
        data: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  let updatedDailyApontamentos = [...currentMonthlyApontamento.data];
  let newDailyApontamentoToReturn: DailyApontamento;

  // Encontra o apontamento pela data, que agora é o identificador único
  const existingIndexByDate = updatedDailyApontamentos.findIndex(a => a.date === dailyApontamento.date);

  // Garante que o dailyApontamento recebido esteja limpo (sem 'id' e 'user_id')
  const cleanedDailyApontamento = cleanDailyApontamento(dailyApontamento);

  if (existingIndexByDate !== -1) {
    // Se um apontamento para a mesma data existe, atualiza-o
    newDailyApontamentoToReturn = { ...cleanedDailyApontamento, updated_at: new Date().toISOString() };
    updatedDailyApontamentos[existingIndexByDate] = newDailyApontamentoToReturn;
  } else {
    // Caso contrário, adiciona como uma nova entrada.
    newDailyApontamentoToReturn = { ...cleanedDailyApontamento, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    updatedDailyApontamentos.push(newDailyApontamentoToReturn);
  }

  const updatedMonthlyApontamento: MonthlyApontamento = {
    ...currentMonthlyApontamento,
    data: updatedDailyApontamentos,
    updated_at: new Date().toISOString(), // Atualiza o timestamp do MonthlyApontamento
  };

  await putLocalMonthlyApontamento(updatedMonthlyApontamento);

  if (online) {
    try {
      // Chama syncMonthlyApontamentoToSupabase com a lógica de comparação
      await syncMonthlyApontamentoToSupabase(updatedMonthlyApontamento);
    } catch (e) {
      console.warn(`[updateApontamento] Immediate Supabase sync of monthly apontamento for ${monthYear} failed, data remains local.`, e);
      // Não relança o erro, pois o dado já está salvo localmente.
    }
  }
  
  return newDailyApontamentoToReturn;
};

// Deleta um apontamento diário dentro do blob JSON mensal
export const deleteApontamento = async (userId: string, monthYear: string, dailyApontamentoDate: string): Promise<void> => {
  const online = await isOnline();
  let currentMonthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);

  if (!currentMonthlyApontamento) {
    // Se não existe localmente, não há o que deletar
    return;
  }

  // Filtra o apontamento pela data
  const updatedDailyApontamentos = currentMonthlyApontamento.data.filter(a => a.date !== dailyApontamentoDate);

  const updatedMonthlyApontamento: MonthlyApontamento = {
    ...currentMonthlyApontamento,
    data: updatedDailyApontamentos,
    updated_at: new Date().toISOString(), // Atualiza o timestamp do MonthlyApontamento
  };

  await putLocalMonthlyApontamento(updatedMonthlyApontamento);

  if (online) {
    try {
      // Chama syncMonthlyApontamentoToSupabase com a lógica de comparação
      await syncMonthlyApontamentoToSupabase(updatedMonthlyApontamento);
    } catch (e) {
      console.warn(`[deleteApontamento] Immediate Supabase sync of monthly apontamento deletion for ${monthYear} failed, data remains local.`, e);
      // Não relança o erro, pois a exclusão já está salva localmente.
    }
  }
};

// Deleta o registro mensal completo
export const deleteApontamentosByMonth = async (userId: string, monthYear: string): Promise<number> => {
  const online = await isOnline();
  
  // Deleta no IndexedDB
  await deleteLocalMonthlyApontamento(userId, monthYear);

  if (online) {
    // Deleta no Supabase
    const { error: supabaseError, count } = await supabase
      .from('monthly_apontamentos')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('month_year', monthYear);

    if (supabaseError) {
      console.error(`[deleteApontamentosByMonth] Error deleting monthly apontamentos from Supabase for ${monthYear}:`, supabaseError);
      throw new Error(`Erro ao excluir apontamentos mensais do Supabase: ${supabaseError.message}`);
    }
    return count || 0;
  }

  return 0; // Se offline, apenas a exclusão local é feita.
};

// A função syncPendingApontamentos não é mais necessária no mesmo formato,
// pois a unidade de sincronização agora é o MonthlyApontamento.
// A lógica de `useOfflineSync` precisará ser ajustada para lidar com isso.
export const syncPendingApontamentos = async (userId: string): Promise<number> => {
  // Esta função precisaria ser reescrita para iterar sobre todos os monthlyApontamentos
  // locais que não foram sincronizados (e.g., `updated_at` local > `updated_at` remoto)
  // Por enquanto, vamos simplificar e apenas retornar 0.
  // Uma implementação completa exigiria um mecanismo mais robusto de detecção de mudanças.
  return 0;
};


// --- Funções de Importação e Exportação (mantidas) ---

export const importParts = async (parts: Part[]): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('parts')
    .upsert(parts, { onConflict: 'id' });

  if (supabaseError) {
    console.error('Error importing parts to Supabase:', supabaseError);
    throw new Error(`Erro ao importar peças para o Supabase: ${supabaseError.message}`);
  }
  await bulkPutLocalParts(parts);
};

export const importAfs = async (afs: Af[]): Promise<void> => {
  // CHAVE DE CONFLITO ALTERADA PARA 'af_number'
  const { error: supabaseError } = await supabase
    .from('afs')
    .upsert(afs, { onConflict: 'af_number' });

  if (supabaseError) {
    console.error('Error importing AFs to Supabase:', supabaseError);
    throw new Error(`Erro ao importar AFs para o Supabase: ${supabaseError.message}`);
  }
  await bulkPutLocalAfs(afs);
};

export const exportDataAsCsv = (data: any[], filename: string): void => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportDataAsJson = (data: any[], filename: string): void => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const cleanupEmptyParts = async (): Promise<number> => {
  let deletedCount = 0;
  const fetchPageSize = 1000; // Quantas peças buscar de uma vez
  const deleteBatchSize = 500; // Quantos IDs excluir em uma chamada do Supabase
  let offset = 0;
  let hasMoreToFetch = true;
  let allIdsToDelete: string[] = [];

  while (hasMoreToFetch) {
    const { data, error } = await supabase
      .from('parts')
      .select('id, codigo, descricao')
      .range(offset, offset + fetchPageSize - 1);

    if (error) {
      console.error('Error fetching parts for cleanup from Supabase (paginated):', error);
      throw new Error(`Erro ao buscar peças para limpeza: ${error.message}`);
    }

    if (data && data.length > 0) {
      const emptyPartsIds = data
        .filter(part =>
          (!part.codigo || part.codigo.trim() === '') &&
          (!part.descricao || part.descricao.trim() === '') &&
          (!part.name || part.name.trim() === '') // Inclui o novo campo 'name' na verificação
        )
        .map(part => part.id);
      allIdsToDelete = allIdsToDelete.concat(emptyPartsIds);
      offset += fetchPageSize;
    } else {
      hasMoreToFetch = false;
    }
  }

  if (allIdsToDelete.length > 0) {
    // Realiza as exclusões em lotes
    for (let i = 0; i < allIdsToDelete.length; i += deleteBatchSize) {
      const batchIds = allIdsToDelete.slice(i, i + deleteBatchSize);
      const { error: deleteError } = await supabase
        .from('parts')
        .delete()
        .in('id', batchIds);

      if (deleteError) {
        console.error('Error deleting empty parts batch from Supabase:', deleteError);
        throw new Error(`Erro ao excluir peças vazias do Supabase (lote): ${deleteError.message}`);
      }
      deletedCount += batchIds.length;
    }

    // Deleta do IndexedDB em massa após todas as exclusões do Supabase
    await localDb.parts.bulkDelete(allIdsToDelete);
  }

  return deletedCount;
};