import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags?: string;
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

export interface Apontamento {
  id: string;
  user_id: string; // Adicionado para RLS local (embora o Dexie não precise, ajuda na sincronização)
  date: string; // Formato 'YYYY-MM-DD'
  entry_time?: string; // Formato 'HH:MM'
  exit_time?: string; // Formato 'HH:MM'
  status?: string; // Novo campo para Folga, Falta, Suspensao, Outros
  created_at?: Date;
  synced_at?: Date; // Para controle de sincronização
}

class LocalDexieDb extends Dexie {
  simplePartsList!: Table<SimplePartItem>;
  serviceOrderItems!: Table<ServiceOrderItem>;
  parts!: Table<Part>;
  afs!: Table<Af>;
  apontamentos!: Table<Apontamento>; // Nova tabela

  constructor() {
    super('PartsListDatabase');
    this.version(1).stores({
      listItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    });
    this.version(2).stores({
      simplePartsList: 'id, codigo_peca, descricao, created_at', // CORRIGIDO: 'id' em vez de '++id'
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    }).upgrade(async tx => {
      // Migração de dados da versão 1 para a versão 2 (mantida)
      const oldListItems = await tx.table('listItems').toArray();
      const simpleItems: SimplePartItem[] = [];
      const serviceItems: ServiceOrderItem[] = [];

      oldListItems.forEach((item: any) => {
        if (item.af && item.af.trim() !== '') {
          serviceItems.push({
            id: item.id,
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
              id: item.id,
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
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at', // CORRIGIDO: 'id' em vez de '++id'
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    }).upgrade(async tx => {
      // Migração de dados da versão 2 para a versão 3 (mantida)
    });
    this.version(4).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at', // CORRIGIDO: 'id' em vez de '++id'
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
      apontamentos: 'id, user_id, date, synced_at', // Novo esquema para apontamentos
    });
    this.version(5).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at', // CORRIGIDO: 'id' em vez de '++id'
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number, descricao', // Atualizado para incluir 'descricao'
      apontamentos: 'id, user_id, date, synced_at',
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
    const codigoMatch = part.codigo.toLowerCase().match(regexPattern);
    const descricaoMatch = part.descricao.toLowerCase().match(regexPattern);
    const tagsMatch = part.tags && part.tags.toLowerCase().match(regexPattern);

    return codigoMatch || descricaoMatch || tagsMatch;
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

    const aTagsScore = getFieldMatchScore(a.tags, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const aCodigoScore = getFieldMatchScore(a.codigo, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const aDescricaoScore = getFieldMatchScore(a.descricao, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);

    const bTagsScore = getFieldMatchScore(b.tags, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const bCodigoScore = getFieldMatchScore(b.codigo, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);
    const bDescricaoScore = getFieldMatchScore(b.descricao, lowerCaseQuery, sortRegexPattern, isMultiWordQuery);

    // Prioriza tags
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
  await localDb.simplePartsList.delete(id);
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

// --- Apontamentos Management (IndexedDB) ---

export const getLocalApontamentos = async (userId: string): Promise<Apontamento[]> => {
  return localDb.apontamentos.where('user_id').equals(userId).toArray();
};

export const putLocalApontamento = async (apontamento: Apontamento): Promise<void> => {
  // Usa put para inserir ou atualizar (baseado na chave primária 'id')
  await localDb.apontamentos.put(apontamento);
};

export const bulkPutLocalApontamentos = async (apontamentos: Apontamento[]): Promise<void> => {
  await localDb.apontamentos.bulkPut(apontamentos);
};

export const clearLocalApontamentos = async (userId: string): Promise<void> => {
  const idsToDelete = await localDb.apontamentos.where('user_id').equals(userId).keys();
  await localDb.apontamentos.bulkDelete(idsToDelete);
};

export const deleteLocalApontamentosByDateRange = async (userId: string, startDate: string, endDate: string): Promise<number> => {
  const idsToDelete = await localDb.apontamentos
    .where('user_id').equals(userId)
    .and(a => a.date >= startDate && a.date <= endDate)
    .keys();
  
  await localDb.apontamentos.bulkDelete(idsToDelete);
  return idsToDelete.length;
};