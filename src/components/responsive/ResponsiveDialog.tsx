import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsCompact } from '@/hooks/use-compact';
import { cn } from '@/lib/utils';

const CompactContext = React.createContext(false);

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/** Dialog no desktop; gaveta de baixo (vaul) no celular/tablet. */
export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({ open, onOpenChange, children }) => {
  const isCompact = useIsCompact();
  return (
    <CompactContext.Provider value={isCompact}>
      {isCompact ? (
        <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </CompactContext.Provider>
  );
};

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Classes aplicadas só no desktop (dialog). */
  dialogClassName?: string;
  /** Classes aplicadas só no mobile (gaveta). */
  drawerClassName?: string;
}

export const ResponsiveDialogContent: React.FC<ContentProps> = ({
  className,
  dialogClassName,
  drawerClassName,
  children,
  ...props
}) => {
  const isCompact = React.useContext(CompactContext);
  if (!isCompact) {
    return (
      <DialogContent className={cn(className, dialogClassName)} {...props}>
        {children}
      </DialogContent>
    );
  }
  return (
    <DrawerContent
      className={cn('max-h-[90vh] pb-safe rounded-none [&>div:first-child]:rounded-none', className, drawerClassName)}
      {...props}
    >
      <div className="overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </DrawerContent>
  );
};

export const ResponsiveDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  const isCompact = React.useContext(CompactContext);
  return isCompact ? (
    <DrawerHeader className={cn('px-0 text-left', className)} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  );
};

export const ResponsiveDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  const isCompact = React.useContext(CompactContext);
  return isCompact ? (
    <DrawerFooter className={cn('px-0', className)} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  );
};

export const ResponsiveDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  (props, ref) => {
    const isCompact = React.useContext(CompactContext);
    return isCompact ? <DrawerTitle ref={ref} {...props} /> : <DialogTitle ref={ref} {...props} />;
  },
);
ResponsiveDialogTitle.displayName = 'ResponsiveDialogTitle';

export const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>((props, ref) => {
  const isCompact = React.useContext(CompactContext);
  return isCompact ? <DrawerDescription ref={ref} {...props} /> : <DialogDescription ref={ref} {...props} />;
});
ResponsiveDialogDescription.displayName = 'ResponsiveDialogDescription';
