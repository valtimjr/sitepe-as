import { useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useSession } from '@/components/SessionContextProvider';
import { getListsData } from '@/services/localListStorage';
import { pushListToCloud, syncListWithCloud, type SyncResult } from '@/services/cloudListService';
import { CompanyType } from '@/types/company';
import { showError, showSuccess } from '@/utils/toast';

export type CloudListAction = 'save' | 'update';

/** Salva ou atualiza uma lista específica na nuvem, pedindo login quando necessário. */
export const useCloudListActions = (company: CompanyType, onDone: () => void) => {
  const { user } = useSession();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const pendingRef = useRef<{ action: CloudListAction; listId: string } | null>(null);
  const [savingListId, setSavingListId] = useState<string | null>(null);

  const run = async (action: CloudListAction, listId: string, userId: string) => {
    setSavingListId(listId);
    try {
      const name = (await getListsData(company)).lists.find(l => l.id === listId)?.name ?? '';
      if (action === 'save') {
        await pushListToCloud(userId, company, listId);
        showSuccess(`Lista "${name}" salva na nuvem!`);
      } else {
        const result = await syncListWithCloud(userId, company, listId);
        const messages: Record<SyncResult, string> = {
          pushed: `A versão local de "${name}" era mais nova e foi enviada para a nuvem.`,
          pulled: `A versão da nuvem de "${name}" era mais nova e foi baixada.`,
          created: `Lista "${name}" ainda não estava na nuvem e foi salva.`,
          'in-sync': `Lista "${name}" já está atualizada.`,
        };
        showSuccess(messages[result]);
      }
      onDone();
    } catch (error: any) {
      showError(error?.message || 'Erro ao sincronizar com a nuvem.');
    } finally {
      setSavingListId(null);
    }
  };

  const requestCloudAction = (action: CloudListAction, listId: string) => {
    if (user) {
      run(action, listId, user.id);
    } else {
      pendingRef.current = { action, listId };
      setIsLoginOpen(true);
    }
  };

  // Continua a ação pendente assim que o login for concluído
  const handleLoginSuccess = (loggedUser: User) => {
    const next = pendingRef.current;
    pendingRef.current = null;
    setIsLoginOpen(false);
    if (next) run(next.action, next.listId, loggedUser.id);
  };

  const loginModalProps = {
    isOpen: isLoginOpen,
    // A ação pendente só é consumida pelo onSuccess deste modal (e substituída no próximo pedido)
    onOpenChange: setIsLoginOpen,
    onSuccess: handleLoginSuccess,
  };

  return { requestCloudAction, savingListId, loginModalProps };
};
