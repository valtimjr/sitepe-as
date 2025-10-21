"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AppHeader: React.FC = () => {
  const { session, user, profile, isLoading } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      showSuccess('Você foi desconectado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message}`);
      console.error('Logout error:', error);
    }
  };

  const getInitials = (fName: string | null, lName: string | null) => {
    const first = fName ? fName.charAt(0) : '';
    const last = lName ? lName.charAt(0) : '';
    return (first + last).toUpperCase() || <UserIcon className="h-6 w-6" />;
  };

  if (isLoading) {
    return null; // Ou um skeleton de cabeçalho se preferir um carregamento visível
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/Logo.png" alt="Logo do Aplicativo" className="h-8 w-8" />
          <span className="sr-only">Início</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar do Usuário" />
                  <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm hidden sm:inline">
                  Olá, {profile?.first_name || user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/settings">
                    <Button variant="ghost" size="icon" aria-label="Configurações">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Configurações</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <span className="font-medium text-sm">Olá, Visitante</span> {/* Texto atualizado */}
              <Link to="/login">
                <Button variant="ghost" className="flex items-center gap-2"> {/* Botão com label e ícone */}
                  <LogIn className="h-5 w-5" /> Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;