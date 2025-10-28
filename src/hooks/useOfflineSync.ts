import { useEffect, useCallback } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { useSession } from '@/components/SessionContextProvider';
import { syncPendingApontamentos } from '@/services/partListService';
import { showSuccess, showError } from '@/utils/toast';
import { Capacitor } from '@capacitor/core'; // Importar Capacitor

const SYNC_INTERVAL_MS = 60000; // Tenta sincronizar a cada 60 segundos se estiver online

export function useOfflineSync() {
  const { user, isLoading: isSessionLoading } = useSession();
  const isNative = Capacitor.isNative; // Verifica se é ambiente nativo

  const syncOperations = useCallback(async () => {
    if (!user) return 0;

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        console.log('OfflineSync: Sem conexão. Pulando sincronização.');
        return 0;
      }

      console.log('OfflineSync: Tentando sincronizar operações pendentes...');
      const syncedCount = await syncPendingApontamentos(user.id);
      
      if (syncedCount > 0) {
        showSuccess(`Sincronização concluída: ${syncedCount} apontamento(s) enviado(s).`);
      }
      return syncedCount;
    } catch (error) {
      console.error('OfflineSync: Erro durante a sincronização:', error);
      showError('Erro ao sincronizar dados offline. Tente novamente mais tarde.');
      return 0;
    }
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
          console.log('OfflineSync: Executando tarefa em background...');
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
        console.log('OfflineSync: Conexão restaurada. Iniciando sincronização.');
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