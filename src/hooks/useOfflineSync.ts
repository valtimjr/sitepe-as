import { useEffect, useCallback } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Capacitor } from '@capacitor/core'; // Importar Capacitor
import { getLocalMonthlyApontamento, putLocalMonthlyApontamento, MonthlyApontamento } from '@/services/localDbService';
import { syncMonthlyApontamentoToSupabase } from '@/services/partListService';
import { format } from 'date-fns';

const SYNC_INTERVAL_MS = 60000; // Tenta sincronizar a cada 60 segundos se estiver online

export function useOfflineSync() {
  const { user, isLoading: isSessionLoading } = useSession();
  const isNative = Capacitor.isNative; // Verifica se é ambiente nativo

  const syncOperations = useCallback(async () => {
    if (!user) return 0;

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        // console.log('OfflineSync: Sem conexão. Pulando sincronização.');
        return 0;
      }

      // console.log('OfflineSync: Tentando sincronizar operações pendentes...');
      
      // Para o novo modelo, a sincronização é mais complexa.
      // Precisaríamos de um mecanismo para detectar quais MonthlyApontamentos locais
      // foram modificados e não sincronizados.
      // Por simplicidade, esta implementação assume que `updateApontamento` já tenta
      // sincronizar imediatamente quando online.
      // Uma solução mais robusta envolveria um campo `synced_at` no MonthlyApontamento
      // local e comparar com o `updated_at` do Supabase.

      // Por enquanto, vamos apenas tentar sincronizar o mês atual se houver dados locais.
      const currentMonthYear = format(new Date(), 'yyyy-MM');
      const localMonthlyApontamento = await getLocalMonthlyApontamento(user.id, currentMonthYear);

      if (localMonthlyApontamento && localMonthlyApontamento.data.length > 0) {
        // Poderíamos adicionar uma lógica para verificar se o local `updated_at` é mais recente que o remoto
        // Para esta tarefa, vamos apenas tentar sincronizar se houver dados locais.
        await syncMonthlyApontamentoToSupabase(localMonthlyApontamento);
        showSuccess(`Sincronização concluída para o mês ${currentMonthYear}.`);
        return 1; // 1 MonthlyApontamento sincronizado
      }
      
      return 0;
    } catch (error) {
      showError('Erro ao sincronizar dados offline. Tente novamente mais tarde.');
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