import { useEffect, useCallback } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Capacitor } from '@capacitor/core'; // Importar Capacitor
import { supabase } from '@/integrations/supabase/client'; // Adicionado: Importa a instância supabase
import { 
  localDb, // Adicionado: Importa a instância localDb
  getLocalMonthlyApontamento, 
  putLocalMonthlyApontamento, 
  MonthlyApontamento,
  bulkPutLocalMonthlyApontamentos, // Adicionado para bulkPut
} from '@/services/localDbService';
import { 
  syncMonthlyApontamentoToSupabase, 
  syncMonthlyApontamentosFromSupabase,
} from '@/services/partListService';
import { format } from 'date-fns';

const SYNC_INTERVAL_MS = 60000; // Tenta sincronizar a cada 60 segundos se estiver online

export function useOfflineSync() {
  const { user, isLoading: isSessionLoading } = useSession();
  const isNative = Capacitor.isNative; // Verifica se é ambiente nativo

  const syncOperations = useCallback(async (forceSync: boolean = false) => {
    if (!user) return 0;

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        // console.log('OfflineSync: Sem conexão. Pulando sincronização.');
        return 0;
      }

      // console.log('OfflineSync: Iniciando sincronização de apontamentos mensais...');
      
      const userId = user.id;
      const localMonthlyApontamentos = await localDb.monthlyApontamentos.where('user_id').equals(userId).toArray();
      
      // Busca apenas os metadados (id, month_year, updated_at) dos apontamentos remotos
      const { data: remoteMonthlyApontamentosMeta, error: remoteError } = await supabase
        .from('monthly_apontamentos')
        .select('id, month_year, updated_at')
        .eq('user_id', userId);

      if (remoteError) {
        console.error('OfflineSync: Erro ao buscar metadados remotos:', remoteError);
        throw remoteError;
      }

      const localMap = new Map<string, MonthlyApontamento>(localMonthlyApontamentos.map(ap => [ap.month_year, ap]));
      const remoteMap = new Map<string, { id: string; month_year: string; updated_at: string }>(remoteMonthlyApontamentosMeta.map(ap => [ap.month_year, ap]));

      const toPush: MonthlyApontamento[] = [];
      const toPull: { id: string; month_year: string; updated_at: string }[] = [];

      // Compara local com remoto
      for (const [monthYear, localAp] of localMap.entries()) {
        const remoteApMeta = remoteMap.get(monthYear);

        if (remoteApMeta) {
          // Ambos existem, compara timestamps
          const localUpdatedAt = new Date(localAp.updated_at || 0);
          const remoteUpdatedAt = new Date(remoteApMeta.updated_at || 0);

          if (localUpdatedAt > remoteUpdatedAt) {
            // console.log(`OfflineSync: Local mais recente para ${monthYear}. Adicionando à fila de push.`);
            toPush.push(localAp);
          } else if (remoteUpdatedAt > localUpdatedAt) {
            // console.log(`OfflineSync: Remoto mais recente para ${monthYear}. Adicionando à fila de pull.`);
            toPull.push(remoteApMeta);
          } else {
            // console.log(`OfflineSync: Local e remoto em sync para ${monthYear}.`);
          }
        } else {
          // Existe localmente, mas não remotamente (novo registro offline)
          // console.log(`OfflineSync: Novo registro local para ${monthYear}. Adicionando à fila de push.`);
          toPush.push(localAp);
        }
      }

      // Identifica registros remotos que não existem localmente
      for (const [monthYear, remoteApMeta] of remoteMap.entries()) {
        if (!localMap.has(monthYear)) {
          // console.log(`OfflineSync: Novo registro remoto para ${monthYear}. Adicionando à fila de pull.`);
          toPull.push(remoteApMeta);
        }
      }

      let syncCount = 0;

      // Executa pushes
      for (const ap of toPush) {
        try {
          await syncMonthlyApontamentoToSupabase(ap, forceSync);
          syncCount++;
        } catch (e) {
          console.error(`OfflineSync: Falha ao enviar ${ap.month_year} para Supabase:`, e);
        }
      }

      // Executa pulls
      for (const apMeta of toPull) {
        try {
          // Para pull, precisamos buscar o objeto completo
          await syncMonthlyApontamentosFromSupabase(userId, apMeta.month_year, forceSync);
          syncCount++;
        } catch (e) {
          console.error(`OfflineSync: Falha ao puxar ${apMeta.month_year} do Supabase:`, e);
        }
      }

      if (syncCount > 0) {
        showSuccess(`Sincronização de ${syncCount} apontamento(s) mensal(is) concluída.`);
      } else {
        // console.log('OfflineSync: Nenhuma alteração detectada para sincronizar.');
      }
      return syncCount;

    } catch (error) {
      showError('Erro ao sincronizar dados offline. Verifique sua conexão e tente novamente.');
      console.error('OfflineSync: Erro geral na sincronização:', error);
    }
    return 0;
  }, [user]);

  // 1. Sincronização em Background (App State Change) - APENAS EM NATIVO
  useEffect(() => {
    if (isSessionLoading || !user || !isNative) return;

    const handleAppStateChange = async ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        // Se voltar para o foreground, tenta sincronizar imediatamente
        await syncOperations();
      } else {
        // Se for para o background, inicia a tarefa em background
        const taskId = await BackgroundTask.beforeExit(async () => {
          // console.log('OfflineSync: Executando tarefa em background...');
          await syncOperations();
          BackgroundTask.finish({ taskId });
        });
      }
    };

    App.addListener('appStateChange', handleAppStateChange);

    return () => {
      App.removeListener('appStateChange', handleAppStateChange);
    };
  }, [user, isSessionLoading, syncOperations, isNative]);

  // 2. Sincronização ao Mudar o Status da Rede
  useEffect(() => {
    if (isSessionLoading || !user) return;

    const handleNetworkChange = async (status: { connected: boolean }) => {
      if (status.connected) {
        // console.log('OfflineSync: Conexão restaurada. Iniciando sincronização.');
        await syncOperations();
      }
    };

    Network.addListener('networkStatusChange', handleNetworkChange);

    // Tenta sincronizar na montagem se já estiver online
    syncOperations();

    return () => {
      Network.removeListener('networkStatusChange', handleNetworkChange);
    };
  }, [user, isSessionLoading, syncOperations]);

  // 3. Sincronização Periódica (Fallback para garantir que nada seja perdido)
  useEffect(() => {
    if (isSessionLoading || !user) return;

    const intervalId = setInterval(syncOperations, SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [user, isSessionLoading, syncOperations]);
}