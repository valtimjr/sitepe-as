import React from 'react';
import { Copy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import TagChips from './TagChips';
import RelatedPartsList from './RelatedPartsList';
import { parseTags } from '@/lib/partTags';
import { showError, showSuccess } from '@/utils/toast';
import type { Part } from '@/types/supabase';

interface PartDetailsSheetProps {
  part: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (term: string) => void;
  onAdd: (part: Part) => void;
}

/** Gaveta com tudo da peça: nome, descrição completa, tags, relacionados e ações. */
const PartDetailsSheet: React.FC<PartDetailsSheetProps> = ({ part, open, onOpenChange, onSearch, onAdd }) => {
  const tags = parseTags(part?.tags);
  const related = part?.itens_relacionados || [];

  const search = (term: string) => {
    onOpenChange(false);
    onSearch(term);
  };

  const copyCode = async () => {
    if (!part) return;
    try {
      await navigator.clipboard.writeText(part.codigo);
      showSuccess(`Código ${part.codigo} copiado!`);
    } catch {
      showError('Não foi possível copiar o código.');
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent data-testid="part-details-sheet" dialogClassName="max-w-lg" className="pb-0">
        {part && (
          <>
            <ResponsiveDialogHeader className="pb-2">
              <ResponsiveDialogTitle className="text-xl font-bold text-primary dark:text-blue-400">
                {part.codigo}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="sr-only">Detalhes da peça {part.codigo}</ResponsiveDialogDescription>
              {part.name?.trim() && <p className="text-base font-semibold" data-testid="part-details-name">{part.name}</p>}
              <p className="text-sm uppercase text-muted-foreground whitespace-pre-wrap break-words" data-testid="part-details-desc">
                {part.descricao}
              </p>
            </ResponsiveDialogHeader>

            {tags.length > 0 && (
              <section className="space-y-2 py-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tags</h3>
                <TagChips tags={tags} onSearchTag={search} />
              </section>
            )}

            {related.length > 0 && (
              <section className="space-y-1 py-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Itens relacionados</h3>
                <RelatedPartsList items={related} onSearch={search} />
              </section>
            )}

            <div className="sticky bottom-0 -mx-4 mt-2 flex flex-col gap-2 border-t bg-background px-4 py-3">
              <Button className="h-11 w-full gap-2 rounded-none font-bold" onClick={() => onAdd(part)}>
                <Plus className="h-4 w-4" /> Adicionar à Minha Lista
              </Button>
              <Button variant="outline" className="h-11 w-full gap-2 rounded-none" onClick={copyCode}>
                <Copy className="h-4 w-4" /> Copiar código
              </Button>
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default PartDetailsSheet;
