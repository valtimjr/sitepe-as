import React from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import TagChips from './TagChips';
import { parseTags } from '@/lib/partTags';
import type { Part } from '@/types/supabase';

interface PartTagsSheetProps {
  part: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchTag: (tag: string) => void;
}

/** Gaveta com as tags da peça em chips. */
const PartTagsSheet: React.FC<PartTagsSheetProps> = ({ part, open, onOpenChange, onSearchTag }) => (
  <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
    <ResponsiveDialogContent data-testid="part-tags-sheet" dialogClassName="max-w-md">
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Tags</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>{part?.codigo}</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      {part && (
        <TagChips
          tags={parseTags(part.tags)}
          onSearchTag={tag => {
            onOpenChange(false);
            onSearchTag(tag);
          }}
        />
      )}
    </ResponsiveDialogContent>
  </ResponsiveDialog>
);

export default PartTagsSheet;
