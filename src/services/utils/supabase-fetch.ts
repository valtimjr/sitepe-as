import { supabase } from '@/integrations/supabase/client';

export const fetchAllPaginated = async <T>(tableName: string, orderByColumn: string): Promise<T[]> => {
  let allData: T[] = [];
  const pageSize = 1000; // Supabase max limit
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderByColumn, { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(`Error fetching paginated data from ${tableName}:`, error);
      throw new Error(`Erro ao buscar todos os dados de ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as T[]);
      offset += pageSize;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
};