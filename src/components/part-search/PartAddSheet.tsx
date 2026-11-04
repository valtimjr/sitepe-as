import React from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import QuickAddPartForm from '@/components/mobile/QuickAddPartForm';
import type { Part } from '@/types/supabase';
import type { CompanyType } from '@/types/company';

interface PartAddSheetProps {
  part: Part | null;
  company: CompanyType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idPrefix?: string;
}

/** Gaveta "Adicionar à Minha Lista" aberta pela gaveta de detalhes. */
const PartAddSheet: React.FC<PartAddSheetProps> = ({ part, company, open, onOpenChange, idPrefix }) => (
  <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
    <ResponsiveDialogContent data-testid="part-add-sheet" dialogClassName="max-w-sm">
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Adicionar à Minha Lista</ResponsiveDialogTitle>
      </ResponsiveDialogHeader>
      {part && (
        <QuickAddPartForm
          part={part}
          company={company}
          large
          idPrefix={`${idPrefix ?? 'search'}-details`}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialogContent>
  </ResponsiveDialog>
);

export default PartAddSheet;
