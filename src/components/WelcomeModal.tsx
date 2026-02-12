"use client";

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

const WELCOME_NOTICE_KEY = 'welcome_notice_accepted';

const WelcomeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAcceptedWelcome = localStorage.getItem(WELCOME_NOTICE_KEY);

    // Mostra o modal apenas se o aviso de boas-vindas ainda não foi aceito.
    if (hasAcceptedWelcome !== 'true') {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(WELCOME_NOTICE_KEY, 'true');
    setIsOpen(false);
    // Dispara um evento para que o banner de cookies possa reagir imediatamente.
    window.dispatchEvent(new Event('storage'));
  };

  // Não permite que o modal seja fechado clicando fora ou pressionando Escape.
  const handleOpenChange = (open: boolean) => {
    if (!open && !localStorage.getItem(WELCOME_NOTICE_KEY)) {
      return;
    }
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-t-lg -m-6 mb-4 border-b border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200">Aviso Importante!!!</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-foreground/80 text-base">
              <p>Por favor, leia atentamente o aviso abaixo antes de continuar.</p>
              <p className="font-bold text-foreground">
                Este site não é oficial e não possui vínculo direto com nenhuma empresa.
              </p>
              <p>
                As informações aqui apresentadas têm caráter meramente informativo e servem apenas para auxiliar os colaboradores.
              </p>
              <p>
                Alterações podem ocorrer a qualquer momento sem aviso prévio, e o site não se responsabiliza por divergências ou atualizações realizadas pela empresa.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAccept} className="w-full">
            Aceitar e Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WelcomeModal;