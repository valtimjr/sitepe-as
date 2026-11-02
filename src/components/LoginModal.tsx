"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import CustomLoginForm from './CustomLoginForm';
import { LogIn } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useIsCompact } from '@/hooks/use-compact';

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onOpenChange, onSuccess }) => {
  const isCompact = useIsCompact();

  const icon = (
    <div className="p-3 rounded-full bg-primary/10">
      <LogIn className="h-6 w-6 text-primary" />
    </div>
  );

  if (isCompact) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[92vh] pb-safe">
          <div className="overflow-y-auto overscroll-contain">
            <DrawerHeader className="flex flex-col items-center gap-2 pb-0">
              {icon}
              <DrawerTitle className="text-2xl font-bold text-center">Entrar no AutoBoard</DrawerTitle>
              <DrawerDescription className="text-center">
                Acesse sua conta para salvar seus dados na nuvem.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-6 pt-4">
              <CustomLoginForm onSuccess={onSuccess} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="bg-background rounded-lg border shadow-lg overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex flex-col items-center gap-2">
              {icon}
              <DialogTitle className="text-2xl font-bold text-center">Entrar no AutoBoard</DialogTitle>
              <DialogDescription className="text-center">
                Acesse sua conta para salvar seus dados na nuvem.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="p-6 pt-4">
            <CustomLoginForm onSuccess={onSuccess} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
