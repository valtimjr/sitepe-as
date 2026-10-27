import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, FileJson, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/listFileIO';

interface FileDropStepProps {
  file: File | null;
  isLoading: boolean;
  isAppJson: boolean;
  rowCount: number;
  columnCount: number;
  sheets: string[];
  sheet?: string;
  hasHeader: boolean;
  onFileSelected: (file: File) => void;
  onSheetChange: (sheet: string) => void;
  onHasHeaderChange: (value: boolean) => void;
}

const ACCEPT = '.csv,.xlsx,.xls,.json';

const FileDropStep: React.FC<FileDropStepProps> = ({
  file, isLoading, isAppJson, rowCount, columnCount, sheets, sheet, hasHeader,
  onFileSelected, onSheetChange, onHasHeaderChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) onFileSelected(files[0]);
  };

  const isJson = file?.name.toLowerCase().endsWith('.json');

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        data-testid="import-file-input"
        onChange={e => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/5'
          )}
        >
          <div className="p-3 rounded-full bg-primary/10">
            <UploadCloud className="h-8 w-8 text-primary" />
          </div>
          <p className="font-medium">Arraste ou clique para enviar a planilha (.csv, .xlsx, .xls) ou backup (.json)</p>
          <p className="text-xs text-muted-foreground">O arquivo é lido no seu dispositivo, nada é enviado.</p>
        </button>
      ) : (
        <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary self-start">
            {isJson ? <FileJson className="h-6 w-6" /> : <FileSpreadsheet className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" data-testid="import-file-name">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
              {isLoading ? ' · lendo arquivo…' : ` · ${rowCount} ${rowCount === 1 ? 'linha' : 'linhas'}`}
              {!isLoading && !isAppJson && ` · ${columnCount} ${columnCount === 1 ? 'coluna' : 'colunas'}`}
            </p>
            {isAppJson && !isLoading && (
              <p className="text-xs text-primary mt-1">Backup do AutoBoard detectado: o mapeamento será pulado.</p>
            )}
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Trocar arquivo
            </Button>
          )}
        </div>
      )}

      {file && !isAppJson && !isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sheets.length > 1 && (
            <div className="space-y-1.5">
              <Label>Aba da planilha</Label>
              <Select value={sheet} onValueChange={onSheetChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sheets.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isJson && (
            <div className="flex items-center gap-2 sm:self-end sm:pb-2">
              <Checkbox id="import-has-header" checked={hasHeader} onCheckedChange={v => onHasHeaderChange(v === true)} />
              <Label htmlFor="import-has-header" className="cursor-pointer">Primeira linha é cabeçalho</Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileDropStep;
