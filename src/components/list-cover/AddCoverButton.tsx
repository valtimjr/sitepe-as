import React, { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListCover } from '@/types/listCover';
import CoverPicker from './CoverPicker';
import type { CoverUploadMode } from './tabs/UploadTab';

interface AddCoverButtonProps {
  onChange: (cover: ListCover | null) => void;
  uploadMode?: CoverUploadMode;
  className?: string;
}

/** Botão discreto "Adicionar capa" que abre o seletor. */
const AddCoverButton: React.FC<AddCoverButtonProps> = ({ onChange, uploadMode = 'local', className }) => {
  const [open, setOpen] = useState(false);
  return (
    <CoverPicker open={open} onOpenChange={setOpen} onChange={onChange} uploadMode={uploadMode}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 gap-1.5 rounded-none px-2 text-xs text-muted-foreground hover:text-foreground', open && 'opacity-100', className)}
        data-testid="add-cover-button"
      >
        <ImagePlus className="h-3.5 w-3.5" /> Adicionar capa
      </Button>
    </CoverPicker>
  );
};

export default AddCoverButton;
