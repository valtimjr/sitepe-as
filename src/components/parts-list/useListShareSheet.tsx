import React, { Suspense, lazy, useCallback, useState } from 'react';
import LoginModal from '@/components/LoginModal';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useCloudListActions } from '@/hooks/use-cloud-list-actions';
import type { SimplePartItem } from '@/services/partListService';
import type { ListIcon } from '@/types/listIcon';
import { useListActions } from './useListActions';

const PartsListShareSheet = lazy(() => import('./PartsListShareSheet'));
const ImportWizardDialog = lazy(() => import('@/components/list-import/ImportWizardDialog'));
const CloudListsDialog = lazy(() => import('@/components/CloudListsDialog'));

interface ListShareSheetOptions {
  items: SimplePartItem[];
  title: string;
  icon?: ListIcon | null;
  /** Lista ativa (para salvar na nuvem). */
  listId?: string;
  /** Abre a confirmação de limpar a lista. */
  onClear: () => void;
  onReload: () => void;
}

/** Gaveta Compartilhar com Importar, Nuvem e Login (celular e computador). */
export const useListShareSheet = ({ items, title, icon, listId, onClear, onReload }: ListShareSheetOptions) => {
  const { company } = useCompany();
  const { user } = useSession();
  const actions = useListActions({ items, title, icon });
  const cloud = useCloudListActions(company, onReload);

  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const open = useCallback(() => setShareOpen(true), []);

  const handleCloudLoad = () => {
    if (user) setCloudOpen(true);
    else setLoginOpen(true);
  };

  const element = (
    <>
      <Suspense fallback={null}>
        {shareOpen && (
          <PartsListShareSheet
            open
            onOpenChange={setShareOpen}
            isEmpty={actions.isEmpty}
            onCopy={actions.copy}
            onWhatsApp={actions.whatsApp}
            onPdf={actions.pdf}
            onNativeShare={actions.nativeShare}
            onExport={actions.exportFile}
            onImport={() => setImportOpen(true)}
            onCloudSave={() => listId && cloud.requestCloudAction('save', listId)}
            onCloudLoad={handleCloudLoad}
            onClear={onClear}
          />
        )}

        {importOpen && <ImportWizardDialog open onOpenChange={setImportOpen} company={company} onImported={onReload} />}

        {cloudOpen && user && (
          <CloudListsDialog open onOpenChange={setCloudOpen} userId={user.id} company={company} onListOpened={onReload} />
        )}
      </Suspense>

      <LoginModal
        isOpen={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={() => {
          setLoginOpen(false);
          setCloudOpen(true);
        }}
      />
      <LoginModal {...cloud.loginModalProps} />
    </>
  );

  const anyOpen = shareOpen || importOpen || cloudOpen || loginOpen || cloud.loginModalProps.isOpen;

  return { open, anyOpen, element };
};
