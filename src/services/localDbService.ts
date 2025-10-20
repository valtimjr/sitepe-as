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
}

class LocalDexieDb extends Dexie {
  simplePartsList!: Table<SimplePartItem>;
  serviceOrderItems!: Table<ServiceOrderItem>;
  parts!: Table<Part>; // <--- AQUI: A tabela 'parts' é declarada
  afs!: Table<Af>;     // <--- AQUI: A tabela 'afs' é declarada

  constructor() {
    super('PartsListDatabase');
    this.version(1).stores({
      listItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags', // <--- AQUI: O esquema da tabela 'parts' é definido
      afs: '++id, af_number',                 // <--- AQUI: O esquema da tabela 'afs' é definido
    });
    this.version(2).stores({
      simplePartsList: '++id, codigo_peca, descricao, created_at',
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
          // É um item de ordem de serviço
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
          // É um item de peça simples
          // Garante que os campos obrigatórios para SimplePartItem estejam presentes
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
      // A tabela 'listItems' será implicitamente removida/redefinida pelo Dexie
      // ao aplicar o novo esquema da versão 2.
    });
    this.version(3).stores({
      simplePartsList: '++id, codigo_peca, descricao, quantidade, af, created_at', // Adicionado 'af'
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number',
    }).upgrade(async tx => {
      // Migração de dados da versão 2 para a versão 3
      // Para o campo 'af' em 'simplePartsList', itens existentes terão 'af' como undefined, o que é aceitável.
      // Nenhuma transformação complexa é necessária, apenas a atualização do esquema.
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

export const bulkAddLocalParts = async (parts: Part[]): Promise<void> => {
  await localDb.parts.bulkAdd(parts); // <--- AQUI: Esta função adiciona as peças (do CSV) à tabela 'parts'
};

export const getLocalParts = async (): Promise<Part[]> => {
  return localDb.parts.toArray();
};

export const searchLocalParts = async (query: string): Promise<Part[]> => {
  console.log('Searching local parts with query:', query);
  const lowerCaseQuery = query.toLowerCase().trim();

  const allParts = await localDb.parts.toArray();

  if (!lowerCaseQuery) {
    console.log('Returning all parts (empty query):', allParts);
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

  console.log('Search results for query:', query, results);
  return results;
};

export const updateLocalPart = async (updatedPart: Part): Promise<void> => {
  await localDb.parts.update(updatedPart.id, updatedPart);
};

export const clearLocalParts = async (): Promise<void> => {
  await localDb.parts.clear();
};

// --- AFs Management (IndexedDB) ---
export const bulkAddLocalAfs = async (afs: Af[]): Promise<void> => {
  await localDb.afs.bulkAdd(afs); // <--- AQUI: Esta função adiciona os AFs (do CSV) à tabela 'afs'
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