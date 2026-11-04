import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useIsCompact } from '@/hooks/use-compact';
import { cn } from '@/lib/utils';

const CompactContext = React.createContext(false);

interface ResponsivePopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Só se aplica ao popover do desktop. */
  modal?: boolean;
  children: React.ReactNode;
}

/** Popover no desktop; gaveta de baixo (vaul) no celular/tablet. */
export const ResponsivePopover: React.FC<ResponsivePopoverProps> = ({ open, onOpenChange, modal, children }) => {
  const isCompact = useIsCompact();
  return (
    <CompactContext.Provider value={isCompact}>
      {isCompact ? (
        <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
          {children}
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={onOpenChange} modal={modal}>
          {children}
        </Popover>
      )}
    </CompactContext.Provider>
  );
};

export const ResponsivePopoverTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isCompact = React.useContext(CompactContext);
  return isCompact ? <DrawerTrigger asChild>{children}</DrawerTrigger> : <PopoverTrigger asChild>{children}</PopoverTrigger>;
};

interface ResponsivePopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título exibido no topo da gaveta (mobile). */
  title?: string;
  description?: string;
  align?: 'start' | 'center' | 'end';
  /** Classes aplicadas só no desktop (popover). */
  popoverClassName?: string;
  /** Chame `e.preventDefault()` para não fechar por clique/foco fora. */
  onInteractOutside?: (e: Event) => void;
}

export const ResponsivePopoverContent: React.FC<ResponsivePopoverContentProps> = ({
  title,
  description,
  align,
  className,
  popoverClassName,
  children,
  ...props
}) => {
  const isCompact = React.useContext(CompactContext);

  if (!isCompact) {
    return (
      <PopoverContent align={align} className={cn(className, popoverClassName)} {...props}>
        {children}
      </PopoverContent>
    );
  }

  return (
    <DrawerContent className={cn('max-h-[90vh] pb-safe rounded-none [&>div:first-child]:rounded-none', className)} {...props}>
      {title ? (
        <DrawerHeader className="text-left pb-1">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
      ) : (
        <DrawerTitle className="sr-only">Detalhes</DrawerTitle>
      )}
      <div className="overflow-y-auto overscroll-contain px-4 pb-4 pt-2">{children}</div>
    </DrawerContent>
  );
};
