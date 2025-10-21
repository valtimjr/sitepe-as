"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Settings, LogOut, User as UserIcon, Menu, Search, List, ClipboardList, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';

const AppHeader: React.FC = () => {
  const { session, user, profile, isLoading, checkPageAccess } = useSession();
  const navigate = useNavigate();

  // Adicionando este log para depuração
  console.log('AppHeader Render: profile =', profile, 'user =', user);

  const handleLogout = async () => {
    try {
      console.log('AppHeader: Attempting to log out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AppHeader: Supabase signOut error:', error);
        throw error;
      }
      console.log('AppHeader: Supabase signOut successful. Navigating to /login.');
      showSuccess('Você foi desconectado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      console.error('AppHeader: Caught error during logout:', error); // Log mais detalhado
      showError(`Erro ao desconectar: ${error.message || 'Detalhes desconhecidos.'}`);
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

  const canAccessAdmin = checkPageAccess('/admin');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Menu Lateral */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2" aria-label="Abrir Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] sm:w-[300px]">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl font-bold text-primary">Navegação</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4">
              <Link to="/search-parts" className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors">
                <Search className="h-5 w-5" /> Pesquisar Peças
              </Link>
              <Link to="/parts-list" className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors">
                <List className="h-5 w-5" /> Minha Lista de Peças
              </Link>
              <Link to="/service-orders" className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors">
                <ClipboardList className="h-5 w-5" /> Ordens de Serviço
              </Link>
              {canAccessAdmin && (
                <>
                  <Separator className="my-2" />
                  <Link to="/admin" className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors">
                    <Database className="h-5 w-5" /> Gerenciador de Banco de Dados
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo "Voltar ao Início" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/" className="flex items-center gap-2">
              <img src="/Logo.png" alt="Logo do Aplicativo" className="h-8 w-8" />
              <span className="sr-only">Página Inicial</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Página Inicial</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar do Usuário" />
                  <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm hidden sm:inline">
                  Olá, {profile?.first_name || 'Usuário'}
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
              <span className="font-medium text-sm">Olá, Visitante</span>
              <Link to="/login">
                <Button variant="ghost" className="flex items-center gap-2">
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