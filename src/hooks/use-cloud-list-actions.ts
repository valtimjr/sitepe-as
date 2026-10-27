import { useEffect, useState } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { getListsData, setListCloudId } from '@/services/localListStorage';
import { saveListToCloud, updateCloudList } from '@/services/cloudListService';
import { CompanyType } from '@/types/company';
import { showError, showSuccess } from '@/utils/toast';

export type CloudListAction = 'save' | 'update';

/** Salva ou atualiza uma lista específica na nuvem, pedindo login quando necessário. */
export const useCloudListActions = (company: CompanyType, onDone: () => void) => {
  const { user } = useSession();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pending, setPending] = useState<{ action: CloudListAction; listId: string } | null>(null);
  const [savingListId, setSavingListId] = useState<string | null>(null);

  const run = async (action: CloudListAction, listId: string, userId: string) => {
    setSavingListId(listId);
    try {
      const list = (await getListsData(company)).lists.find(l => l.id === listId);
      if (!list) throw new Error('Lista não encontrada.');

      const saveNew = async () => {
        const saved = await saveListToCloud(userId, company, list);
        await setListCloudId(company, list.id, saved.id);
        showSuccess(`Lista "${list.name}" salva na nuvem!`);
      };

      if (action === 'update' && list.cloudId) {
        const updated = await updateCloudList(list.cloudId, list);
        if (updated) showSuccess(`Lista "${list.name}" atualizada na nuvem!`);
        else await saveNew(); // a cópia na nuvem foi excluída
      } else {
        await saveNew();
      }
      onDone();
    } catch (error: any) {
      showError(error?.message || 'Erro ao salvar na nuvem.');
    } finally {
      setSavingListId(null);
    }
  };

  const requestCloudAction = (action: CloudListAction, listId: string) => {
    if (user) {
      run(action, listId, user.id);
    } else {
      setPending({ action, listId });
      setIsLoginOpen(true);
    }
  };

  // Continua a ação pendente assim que o login for concluído
  useEffect(() => {
    if (user && pending && !isLoginOpen) {
      const { action, listId } = pending;
      setPending(null);
      run(action, listId, user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pending, isLoginOpen]);

  const loginModalProps = {
    isOpen: isLoginOpen,
    onOpenChange: (open: boolean) => {
      setIsLoginOpen(open);
      if (!open) setPending(null);
    },
    onSuccess: () => setIsLoginOpen(false),
  };

  return { requestCloudAction, savingListId, loginModalProps };
};
