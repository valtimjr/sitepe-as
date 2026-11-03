import React, { useRef, useState } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ListCover } from '@/types/listCover';
import {
  ACCEPTED_COVER_TYPES,
  MAX_COVER_FILE_BYTES,
  compressImage,
  saveLocalCoverImage,
  uploadCoverToB2,
} from '@/services/coverService';

export type CoverUploadMode = 'local' | 'remote';

interface UploadTabProps {
  mode: CoverUploadMode;
  onSelect: (cover: ListCover) => void;
}

const UploadTab: React.FC<UploadTabProps> = ({ mode, onSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED_COVER_TYPES.includes(file.type)) {
      setError('Use uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_COVER_FILE_BYTES) {
      setError('A imagem passa de 10 MB.');
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file);
      if (mode === 'remote') {
        setProgress(0);
        const url = await uploadCoverToB2(blob, setProgress);
        onSelect({ kind: 'image', source: 'upload-b2', value: url });
      } else {
        const value = await saveLocalCoverImage(blob);
        onSelect({ kind: 'image', source: 'upload-local', value });
      }
    } catch (e) {
      setError((e as Error).message || 'Não foi possível usar a imagem.');
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3" data-testid="cover-upload">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <ImageUp className="h-8 w-8 text-muted-foreground" />}
        <p className="text-sm font-medium">Arraste uma imagem aqui</p>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 10 MB</p>
        <Button
          type="button"
          size="sm"
          className="mt-1 rounded-none"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Escolher imagem
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_COVER_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          data-testid="cover-upload-input"
        />
      </div>

      {progress !== null && <Progress value={progress} className="h-1.5 rounded-none" />}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {mode === 'remote'
          ? 'A imagem é enviada ao servidor e fica visível para todos.'
          : 'A imagem fica salva só neste aparelho e não vai para a nuvem.'}
      </p>
    </div>
  );
};

export default UploadTab;
