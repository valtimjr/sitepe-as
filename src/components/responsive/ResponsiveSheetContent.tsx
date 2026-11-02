import * as React from 'react';
import { SheetContent } from '@/components/ui/sheet';
import { useIsCompact } from '@/hooks/use-compact';
import { cn } from '@/lib/utils';

type Props = React.ComponentPropsWithoutRef<typeof SheetContent>;

/** Painel lateral no desktop; abre de baixo (até 90vh, rolagem interna) no celular/tablet. */
const ResponsiveSheetContent = React.forwardRef<React.ElementRef<typeof SheetContent>, Props>(
  ({ side = 'right', className, ...props }, ref) => {
    const isCompact = useIsCompact();
    if (!isCompact) return <SheetContent ref={ref} side={side} className={className} {...props} />;
    return (
      <SheetContent
        ref={ref}
        side="bottom"
        className={cn(
          className,
          'w-full max-w-none sm:max-w-none h-auto max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
        )}
        {...props}
      />
    );
  },
);
ResponsiveSheetContent.displayName = 'ResponsiveSheetContent';

export default ResponsiveSheetContent;
