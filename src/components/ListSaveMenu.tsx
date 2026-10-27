import React, { useEffect, useState } from 'react';
import { Save, CloudUpload, CloudDownload, FileUp, FileDown, FileJson, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LoginModal from '@/components/LoginModal';
import CloudListsDialog from '@/components/CloudListsDialog';
import ImportWizardDialog from '@/components/list-import/ImportWizardDialog';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { SimplePartItem, exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { LocalList, getActiveList, setListCloudId } from '@/services/localListStorage';
import { saveListToCloud, updateCloudList } from '@/services/cloudListService';
import { buildListJson, exportListAsXlsx, listItemsForExport, safeFileName } from '@/lib/listFileIO';
import { showError, showSuccess } from '@/utils/toast';

type CloudAction = 'save' | 'load';

interface ListSaveMenuProps {
  items: SimplePartItem[];
  listTitle: string;
  onListChanged: () => void;
}

const ListSaveMenu: React.FC<ListSaveMenuProps> = ({ items, listTitle, onListChanged }) => {
  const { user } = useSession();
  const { company } = useCompany();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<CloudAction | null>(null);
  const [isCloudListsOpen, setIsCloudListsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [listToConfirm, setListToConfirm] = useState<LocalList | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEmpty = items.length === 0;

  const saveAsNew = async (list: LocalList) => {
    if (!user) return;
    const saved = await saveListToCloud(user.id, company, list);
    await setListCloudId(company, list.id, saved.id);
    showSuccess(`Lista "${list.name}" salva na nuvem!`);
  };

  const withSaving = async (fn: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await fn();
      onListChanged();
    } catch (error: any) {
      showError(error?.message || 'Erro ao salvar na nuvem.');
    } finally {
      setIsSaving(false);
    }
  };

  const startSave = async () => {
    const list = await getActiveList(company);
    if (list.cloudId) {
      setListToConfirm(list);
      return;
    }
    await withSaving(() => saveAsNew(list));
  };

  const handleUpdate = (list: LocalList) =>
    withSaving(async () => {
      const updated = await updateCloudList(list.cloudId!, list);
      if (updated) showSuccess(`Lista "${list.name}" atualizada na nuvem!`);
      else await saveAsNew(list); // a cópia na nuvem foi excluída
    });

  const runCloudAction = (action: CloudAction) => {
    if (action === 'save') startSave();
    else setIsCloudListsOpen(true);
  };

  const requestCloudAction = (action: CloudAction) => {
    if (user) {
      runCloudAction(action);
    } else {
      setPendingAction(action);
      setIsLoginOpen(true);
    }
  };

  // Continua a ação pendente assim que o login for concluído
  useEffect(() => {
    if (user && pendingAction && !isLoginOpen) {
      const action = pendingAction;
      setPendingAction(null);
      runCloudAction(action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingAction, isLoginOpen]);

  const baseName = safeFileName(listTitle);

  const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
    if (isEmpty) return;
    try {
      if (format === 'json') exportDataAsJson(buildListJson(listTitle, items, company), `${baseName}.json`);
      else if (format === 'csv') exportDataAsCsv(listItemsForExport(items), `${baseName}.csv`);
      else await exportListAsXlsx(items, `${baseName}.xlsx`);
      showSuccess('Lista exportada com sucesso!');
    } catch {
      showError('Erro ao exportar a lista.');
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            className="bg-background text-primary border border-primary hover:bg-primary hover:text-primary-foreground w-10 h-10 p-0 md:w-auto md:px-4"
            aria-label="Salvar / Arquivo"
            data-testid="list-save-menu-trigger"
          >
            {isSaving ? <Loader2 className="h-4 w-4 md:mr-2 animate-spin" /> : <Save className="h-4 w-4 md:mr-2" />}
            <span className="hidden md:inline">Salvar / Arquivo</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Nuvem</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => requestCloudAction('save')} disabled={isSaving}>
            <CloudUpload className="h-4 w-4 mr-2" /> Salvar na nuvem
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => requestCloudAction('load')}>
            <CloudDownload className="h-4 w-4 mr-2" /> Carregar da nuvem
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Importar</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setIsImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" /> Importar planilha / JSON…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isEmpty}>
              <FileDown className="h-4 w-4 mr-2" /> Exportar
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => handleExport('json')} disabled={isEmpty}>
                <FileJson className="h-4 w-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport('csv')} disabled={isEmpty}>
                <FileText className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport('xlsx')} disabled={isEmpty}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <LoginModal
        isOpen={isLoginOpen}
        onOpenChange={open => {
          setIsLoginOpen(open);
          if (!open) setPendingAction(null);
        }}
        onSuccess={() => setIsLoginOpen(false)}
      />

      {user && (
        <CloudListsDialog
          open={isCloudListsOpen}
          onOpenChange={setIsCloudListsOpen}
          userId={user.id}
          company={company}
          onListOpened={onListChanged}
        />
      )}

      <ImportWizardDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        company={company}
        onImported={onListChanged}
      />

      <AlertDialog open={!!listToConfirm} onOpenChange={open => !open && setListToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lista já salva na nuvem</AlertDialogTitle>
            <AlertDialogDescription>
              "{listToConfirm?.name}" já tem uma cópia na nuvem. Deseja atualizar essa cópia ou salvar como uma nova lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                const list = listToConfirm!;
                setListToConfirm(null);
                withSaving(() => saveAsNew(list));
              }}
            >
              Salvar como nova
            </Button>
            <AlertDialogAction onClick={() => handleUpdate(listToConfirm!)}>Atualizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ListSaveMenu;
