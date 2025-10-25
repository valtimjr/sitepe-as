import React, { useState, useEffect } from 'react';
import { getAfsFromService } from '@/services/partListService';
import { Af } from '@/services/localDbService';

/**
 * Hook para buscar a descrição de um AF pelo número.
 * @param afNumber O número do AF a ser buscado.
 * @returns A descrição do AF ou null se não for encontrado.
 */
export function useAfDescription(afNumber: string): string | null {
  const [description, setDescription] = useState<string | null>(null);
  const [allAfs, setAllAfs] = useState<Af[]>([]);

  // 1. Carrega todos os AFs (e sincroniza o cache)
  useEffect(() => {
    const loadAfs = async () => {
      try {
        const fetchedAfs = await getAfsFromService();
        setAllAfs(fetchedAfs);
      } catch (error) {
        console.error('Failed to load AFs for hook:', error);
      }
    };
    loadAfs();
  }, []);

  // 2. Busca a descrição quando o afNumber ou a lista de AFs muda
  useEffect(() => {
    if (!afNumber || afNumber.trim() === '') {
      setDescription(null);
      return;
    }

    const foundAf = allAfs.find(af => af.af_number === afNumber.trim());
    
    if (foundAf && foundAf.descricao) {
      setDescription(foundAf.descricao);
    } else {
      setDescription(null);
    }
  }, [afNumber, allAfs]);

  return description;
}