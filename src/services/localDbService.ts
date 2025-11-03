import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { DailyApontamento, MonthlyApontamento } from '@/types/supabase'; // Importar novos tipos

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags?: string;
  name?: string; // Adicionado o campo 'name'
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
      afs: '++id, af_number',
      apontamentos: 'id, user_id, date, synced_at', // Esquema antigo para apontamentos
    });
    this.version(5).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number, descricao', // Atualizado para incluir 'descricao'
      apontamentos: 'id, user_id, date, synced_at',
    });
    this.version(6).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags, name', // Adicionado 'name'
      afs: '++id, af_number, descricao',
      apontamentos: 'id, user_id, date, synced_at',
    });
    this.version(7).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags, name',
      afs: '++id, af_number, descricao',
      apontamentos: null, // Remove a tabela antiga de apontamentos
      monthlyApontamentos: 'id, user_id, month_year', // Nova tabela para apontamentos mensais
    }).upgrade(async tx => {
      // Lógica de migração de apontamentos antigos para o novo formato mensal
      // Esta lógica é um exemplo e pode precisar ser ajustada dependendo dos dados existentes
      const oldApontamentos = await tx.table('apontamentos').toArray();
      const monthlyDataMap: { [key: string]: MonthlyApontamento } = {};

      oldApontamentos.forEach((oldAp: any) => {
        const date = new Date(oldAp.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const userId = oldAp.user_id;
        const key = `${userId}-${monthYear}`;

        if (!monthlyDataMap[key]) {
          monthlyDataMap[key] = {
            id: uuidv4(),
            user_id: userId,
            month_year: monthYear,
            data: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        monthlyDataMap[key].data.push({
          id: oldAp.id,
          date: oldAp.date,
          entry_time: oldAp.entry_time,
          exit_time: oldAp.exit_time,
          status: oldAp.status,
          created_at: oldAp.created_at?.toISOString(),
          updated_at: oldAp.synced_at?.toISOString(), // Usar synced_at como updated_at
        });
      });

      await tx.table('monthlyApontamentos').bulkAdd(Object.values(monthlyDataMap));
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
  return localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).first();
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