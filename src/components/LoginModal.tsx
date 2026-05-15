"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CustomLoginForm from './CustomLoginForm';
import { LogIn } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onOpenChange, onSuccess }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="bg-background rounded-lg border shadow-lg overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-primary/10">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
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