import * as React from 'react';
import { SheetContent } from '@/components/ui/sheet';
import { useIsCompact } from '@/hooks/use-compact';
import { cn } from '@/lib/utils';

type Props = React.ComponentPropsWithoutRef<typeof SheetContent> & {
  /** Altura fixa (85dvh no celular) com layout em coluna; o conteúdo cuida da própria rolagem. */
  fixedHeight?: boolean;
};

/** Painel lateral no desktop; abre de baixo (até 90dvh, rolagem interna) no celular/tablet. */
const ResponsiveSheetContent = React.forwardRef<React.ElementRef<typeof SheetContent>, Props>(
  ({ side = 'right', className, fixedHeight = false, ...props }, ref) => {
    const isCompact = useIsCompact();
    if (!isCompact) {
      return (
        <SheetContent
          ref={ref}
          side={side}
          className={cn(className, fixedHeight && 'flex flex-col p-0 overflow-hidden')}
          {...props}
        />
      );
    }
    return (
      <SheetContent
        ref={ref}
        side="bottom"
        className={cn(
          className,
          'w-full max-w-none sm:max-w-none rounded-t-2xl',
          fixedHeight
            ? 'h-[85dvh] max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden'
            : 'h-auto max-h-[90dvh] overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
        )}
        {...props}
      />
    );
  },
);
ResponsiveSheetContent.displayName = 'ResponsiveSheetContent';

export default ResponsiveSheetContent;
