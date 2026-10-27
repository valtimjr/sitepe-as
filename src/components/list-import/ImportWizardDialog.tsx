import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CompanyType } from '@/types/company';
import { getParts, getAfsFromService, Part, Af } from '@/services/partListService';
import { LocalList, addItemsToList, createList, getActiveList, setActiveListId } from '@/services/localListStorage';
import {
  ListJsonFile, MappingConfig, SpreadsheetData, ValidatedRow,
  applyFieldMapping, autoMapFields, isJsonFile, isSpreadsheetFile, parseListJson,
  parseSpreadsheetFile, rowsFromListJson, tableFromMatrix, validateImportRows,
} from '@/lib/listFileIO';
import { showError, showSuccess } from '@/utils/toast';
import ImportStepper from './ImportStepper';
import FileDropStep from './FileDropStep';
import FieldMappingStep from './FieldMappingStep';
import ValidationStep from './ValidationStep';
import ImportTargetStep, { ImportTarget } from './ImportTargetStep';

interface ImportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyType;
  onImported: () => void;
}

const fileBaseName = (name: string) => name.replace(/\.[^.]+$/, '');

const ImportWizardDialog: React.FC<ImportWizardDialogProps> = ({ open, onOpenChange, company, onImported }) => {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [appJson, setAppJson] = useState<ListJsonFile | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<MappingConfig | null>(null);
  const [fillDescription, setFillDescription] = useState(true);
  const [parts, setParts] = useState<Part[]>([]);
  const [afs, setAfs] = useState<Af[]>([]);
  const [activeList, setActiveList] = useState<LocalList | null>(null);
  const [enabled, setEnabled] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState<ImportTarget>('append');
  const [newListName, setNewListName] = useState('');
  const [mergeDuplicates, setMergeDuplicates] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setMaxReached(1);
    setFile(null);
    setSpreadsheet(null);
    setAppJson(null);
    setHasHeader(true);
    setMapping(null);
    setFillDescription(true);
    setTarget('append');
    setNewListName('');
    setMergeDuplicates(false);
    getActiveList(company).then(setActiveList);
    getParts(company).then(setParts).catch(() => setParts([]));
    getAfsFromService(company).then(setAfs).catch(() => setAfs([]));
  }, [open, company]);

  const table = useMemo(
    () => (spreadsheet ? tableFromMatrix(spreadsheet.matrix, hasHeader) : null),
    [spreadsheet, hasHeader]
  );

  const validating = step >= 3;
  const validatedRows: ValidatedRow[] = useMemo(() => {
    if (!validating) return [];
    const rows = appJson
      ? rowsFromListJson(appJson)
      : table && mapping
        ? applyFieldMapping(table.rows, mapping, hasHeader ? 2 : 1)
        : [];
    return validateImportRows(rows, { parts, afs, existingItems: activeList?.items || [], fillDescription });
  }, [validating, appJson, table, mapping, hasHeader, parts, afs, activeList, fillDescription]);

  useEffect(() => {
    setEnabled(new Set(validatedRows.filter(r => r.status !== 'error').map(r => r.index)));
  }, [validatedRows]);

  const goTo = (n: number) => {
    setStep(n);
    setMaxReached(prev => Math.max(prev, n));
  };

  const loadSpreadsheet = async (f: File, sheet?: string, header = hasHeader) => {
    const data = await parseSpreadsheetFile(f, sheet);
    setSpreadsheet(data);
    setMapping(autoMapFields(tableFromMatrix(data.matrix, header).headers));
  };

  const handleFileSelected = async (f: File) => {
    if (!isSpreadsheetFile(f) && !isJsonFile(f)) {
      showError('Formato não suportado. Use .csv, .xlsx, .xls ou .json.');
      return;
    }
    setFile(f);
    setSpreadsheet(null);
    setAppJson(null);
    setMapping(null);
    setMaxReached(1);
    setNewListName(fileBaseName(f.name));
    setIsParsing(true);
    try {
      if (isJsonFile(f)) {
        const parsed = await parseListJson(f);
        if (parsed.kind === 'app') {
          setAppJson(parsed.data);
          setNewListName(parsed.data.name || fileBaseName(f.name));
        } else {
          setHasHeader(true);
          setSpreadsheet({ matrix: parsed.matrix, sheets: [] });
          setMapping(autoMapFields(tableFromMatrix(parsed.matrix, true).headers));
        }
      } else {
        await loadSpreadsheet(f);
      }
    } catch (error: any) {
      setFile(null);
      showError(error?.message || 'Não foi possível ler o arquivo.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSheetChange = async (sheet: string) => {
    if (!file) return;
    setIsParsing(true);
    try {
      await loadSpreadsheet(file, sheet);
    } catch {
      showError('Não foi possível ler a aba selecionada.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleHasHeaderChange = (value: boolean) => {
    setHasHeader(value);
    if (spreadsheet) setMapping(autoMapFields(tableFromMatrix(spreadsheet.matrix, value).headers));
  };

  const rowCount = appJson ? appJson.items.length : table?.rows.length ?? 0;
  const mappingValid = !!mapping && (mapping.codigo_peca.mode !== 'ignore' || mapping.descricao.mode !== 'ignore');
  const selectedCount = validatedRows.filter(r => enabled.has(r.index) && r.status !== 'error').length;

  const canProceed =
    step === 1 ? !!file && !isParsing && rowCount > 0
      : step === 2 ? mappingValid
        : step === 3 ? selectedCount > 0
          : selectedCount > 0 && (target !== 'new' || newListName.trim() !== '') && !isImporting;

  const handleBack = () => {
    if (step === 3 && appJson) setStep(1);
    else if (step > 1) setStep(step - 1);
  };

  const handleNext = () => {
    if (!canProceed) return;
    if (step === 1) goTo(appJson ? 3 : 2);
    else if (step < 4) goTo(step + 1);
    else handleImport();
  };

  const handleImport = async () => {
    if (!activeList) return;
    setIsImporting(true);
    try {
      const items = validatedRows
        .filter(r => enabled.has(r.index) && r.status !== 'error')
        .map(r => ({
          codigo_peca: r.codigo_peca,
          descricao: r.descricao,
          quantidade: r.quantidade,
          af: r.af || undefined,
        }));

      let listId = activeList.id;
      let listName = activeList.name;
      if (target === 'new') {
        const created = await createList(company, newListName);
        listId = created.id;
        listName = created.name;
      }
      await addItemsToList(company, listId, items, { replace: target === 'replace', mergeDuplicates });
      if (target === 'new') await setActiveListId(company, listId);

      showSuccess(`${items.length} ${items.length === 1 ? 'item importado' : 'itens importados'} para "${listName}"!`);
      onImported();
      onOpenChange(false);
    } catch (error: any) {
      showError(error?.message || 'Erro ao importar os itens.');
    } finally {
      setIsImporting(false);
    }
  };

  const nextLabel = step === 2 ? 'Validar Lote' : step === 4 ? 'Importar' : 'Prosseguir';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 overflow-hidden w-screen max-w-none h-[100dvh] rounded-none sm:w-full sm:max-w-4xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <DialogHeader className="p-4 sm:p-6 pb-4 text-left">
          <div className="flex items-center gap-3 pr-6">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <FileUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl">Importar para Minha Lista</DialogTitle>
              <DialogDescription className="truncate">
                Lista ativa: <span className="text-primary font-medium">{activeList?.name || '…'}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ImportStepper
          current={step}
          maxReached={maxReached}
          disabledSteps={appJson ? [2] : []}
          onStepClick={setStep}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 1 && (
            <FileDropStep
              file={file}
              isLoading={isParsing}
              isAppJson={!!appJson}
              rowCount={rowCount}
              columnCount={table?.headers.length ?? 0}
              sheets={spreadsheet?.sheets || []}
              sheet={spreadsheet?.sheet}
              hasHeader={hasHeader}
              onFileSelected={handleFileSelected}
              onSheetChange={handleSheetChange}
              onHasHeaderChange={handleHasHeaderChange}
            />
          )}
          {step === 2 && table && mapping && (
            <FieldMappingStep
              headers={table.headers}
              sampleRow={table.rows[0]}
              mapping={mapping}
              onMappingChange={setMapping}
              fillDescription={fillDescription}
              onFillDescriptionChange={setFillDescription}
            />
          )}
          {step === 3 && (
            <ValidationStep rows={validatedRows} enabled={enabled} onEnabledChange={setEnabled} />
          )}
          {step === 4 && (
            <ImportTargetStep
              count={selectedCount}
              activeListName={activeList?.name || ''}
              target={target}
              onTargetChange={setTarget}
              newListName={newListName}
              onNewListNameChange={setNewListName}
              mergeDuplicates={mergeDuplicates}
              onMergeDuplicatesChange={setMergeDuplicates}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 p-4">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1 || isImporting}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canProceed} data-testid="import-next-button">
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {nextLabel}
            {step === 4 ? <Check className="h-4 w-4 ml-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportWizardDialog;
