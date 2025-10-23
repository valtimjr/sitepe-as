"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent_given';

const CookieConsentBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verifica se o consentimento já foi dado
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent !== 'true') {
      // Usa um pequeno atraso para garantir que o app carregue antes de mostrar o modal
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsOpen(false);
  };

  // Usamos AlertDialog para garantir que o usuário interaja,
  // mas o estilizamos para parecer um banner fixo na parte inferior.
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-lg rounded-lg shadow-xl p-4 sm:p-6 z-[100] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-bottom-0">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            <Cookie className="h-5 w-5 text-primary" />
            Uso de Cookies
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Este site utiliza cookies para armazenar dados localmente (IndexedDB) e gerenciar a sessão de usuário (Supabase). Ao continuar, você concorda com o uso de cookies essenciais para o funcionamento do aplicativo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end sm:justify-end">
          <Button onClick={handleAccept} className="w-full sm:w-auto">
            Aceitar e Continuar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CookieConsentBanner;