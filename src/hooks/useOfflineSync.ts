import { useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { useSession } from '@/components/SessionContextProvider';
import { syncPendingApontamentos } from '@/services/partListService';
import { showSuccess, showError } from '@/utils/toast';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';

const SYNC_INTERVAL_MS = 60000; // Tenta sincronizar a cada 60 segundos se estiver online

export function useOfflineSync() {
  const { user, isLoading: isSessionLoading } = useSession();
  const isNative = Capacitor.isNativePlatform();

  const syncOperations = useCallback(async () => {
    if (!user) return 0;

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        return 0;
      }

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
        await syncOperations();
      } else {
        // Inicia a tarefa em background
        const taskId = await BackgroundTask.beforeExit(async () => {
          await syncOperations();
          BackgroundTask.finish({ taskId });
        });
      }
    };

    // Adiciona listener de forma segura
    const { remove } = App.addListener('appStateChange', handleAppStateChange);

    return () => {
      remove();
    };
  }, [user, isSessionLoading, syncOperations, isNative]);

  // 2. Sincronização ao Mudar o Status da Rede
  useEffect(() => {
    if (isSessionLoading || !user) return;

    const handleNetworkChange = async (status: { connected: boolean }) => {
      if (status.connected) {
        await syncOperations();
      }
    };

    const { remove } = Network.addListener('networkStatusChange', handleNetworkChange);

    // Tenta sincronizar na montagem se já estiver online
    syncOperations();

    return () => {
      remove();
    };
  }, [user, isSessionLoading, syncOperations]);

  // 3. Sincronização Periódica (Fallback para garantir que nada seja perdido)
  useEffect(() => {
    if (isSessionLoading || !user) return;

    const intervalId = setInterval(syncOperations, SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [user, isSessionLoading, syncOperations]);
}