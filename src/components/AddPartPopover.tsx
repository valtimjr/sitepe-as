import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from '@/components/responsive/ResponsivePopover';
import QuickAddPartForm from '@/components/mobile/QuickAddPartForm';
import { useIsCompact } from '@/hooks/use-compact';
import { CompanyType } from '@/types/company';
import { cn } from '@/lib/utils';

interface AddPartPopoverProps {
  part: { codigo: string; descricao: string };
  company: CompanyType;
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
  idPrefix?: string;
}

/** Botão "+" de adição rápida: popover no desktop, gaveta de baixo no mobile. */
const AddPartPopover: React.FC<AddPartPopoverProps> = ({ part, company, align = 'end', triggerClassName, idPrefix }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isCompact = useIsCompact();

  return (
    <ResponsivePopover open={isOpen} onOpenChange={setIsOpen}>
      <ResponsivePopoverTrigger>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 text-primary hover:bg-primary/10 shrink-0', triggerClassName)}
          onClick={e => e.stopPropagation()}
          title="Adicionar rápido à lista"
          aria-label={`Adicionar ${part.codigo} à lista`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Adicionar à Minha Lista"
        align={align}
        popoverClassName="w-72 p-4 z-[200]"
        className="rapid-add-popover-content"
        onClick={e => e.stopPropagation()}
      >
        <QuickAddPartForm
          part={part}
          company={company}
          large={isCompact}
          idPrefix={idPrefix}
          onDone={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
        />
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
};

export default AddPartPopover;
