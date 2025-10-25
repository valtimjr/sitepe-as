"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Settings, LogOut, User as UserIcon, Menu, Search, List, ClipboardList, Database, Clock, CalendarDays, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { getMenuStructure } from '@/services/customListService';
import { MenuItem } from '@/types/supabase';

const AppHeader: React.FC = () => {
  const { session, user, profile, isLoading, checkPageAccess } = useSession();
  const navigate = useNavigate();
  // rootMenuItems agora armazena a estrutura hierárquica completa (apenas itens de nível raiz)
  const [rootMenuItems, setRootMenuItems] = useState<MenuItem[]>([]);

  const loadDynamicMenu = useCallback(async () => {
    if (!session) {
      setRootMenuItems([]);
      return;
    }
    try {
      const structure = await getMenuStructure();
      // A estrutura retornada já são os itens de nível raiz com seus filhos aninhados.
      setRootMenuItems(structure);
    } catch (error) {
      console.error('Failed to load dynamic menu:', error);
    }
  }, [session]);

  useEffect(() => {
    loadDynamicMenu();
  }, [loadDynamicMenu]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      showSuccess('Você foi desconectado com sucesso!');
    } catch (error: any) {
      console.error('AppHeader: Erro ao desconectar:', error);
      showError(`Erro ao desconectar: ${error.message || 'Detalhes desconhecidos.'}`);
    } finally {
      navigate('/login');
    }
  };

  const getInitials = (fName: string | null, lName: string | null) => {
    const first = fName ? fName.charAt(0) : '';
    const last = lName ? lName.charAt(0) : '';
    return (first + last).toUpperCase() || <UserIcon className="h-6 w-6" />;
  };

  // Função recursiva para renderizar submenus
  const renderDynamicMenu = (items: MenuItem[]) => {
    return items.map(item => {
      if (item.children && item.children.length > 0) {
        return (
          <DropdownMenuSub key={item.id}>
            <DropdownMenuSubTrigger>
              {item.title}
              <ChevronRight className="ml-auto h-4 w-4" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {renderDynamicMenu(item.children)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }
      
      // Item final que aponta para uma lista
      if (item.list_id) {
        return (
          <Link to={`/custom-list/${item.list_id}`} key={item.id}>
            <DropdownMenuItem>
              <List className="h-4 w-4 mr-2" /> {item.title}
            </DropdownMenuItem>
          </Link>
        );
      }

      // Item que não é submenu e não tem link (deve ser evitado no gerenciador)
      return (
        <DropdownMenuItem key={item.id} disabled>
          {item.title} (Sem Link)
        </DropdownMenuItem>
      );
    });
  };

  // Função para renderizar itens de nível raiz no cabeçalho (desktop)
  const renderRootItem = (item: MenuItem) => {
    // Se for um link direto para uma lista
    if (item.list_id) {
      return (
        <Link to={`/custom-list/${item.list_id}`} key={item.id}>
          <Button variant="ghost" className="flex items-center gap-1">
            {item.title}
          </Button>
        </Link>
      );
    }

    // Se for um item que tem filhos (submenu)
    if (item.children && item.children.length > 0) {
      return (
        <DropdownMenu key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1">
                  {item.title}
                  <ChevronRight className="h-4 w-4 -rotate-90" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {renderDynamicMenu(item.children)}
            </DropdownMenuContent>
          </Tooltip>
        </DropdownMenu>
      );
    }

    // Item raiz sem link e sem filhos (deve ser evitado)
    return null;
  };

  if (isLoading) {
    return null; // Ou um skeleton de cabeçalho se preferir um carregamento visível
  }

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');
  const canAccessMenuManager = checkPageAccess('/menu-manager');

  // Itens de navegação padrão (sempre no dropdown)
  const standardDropdownItems = [
    { path: "/search-parts", title: "Pesquisar Peças", icon: Search },
    { path: "/parts-list", title: "Minha Lista de Peças", icon: List },
    { path: "/service-orders", title: "Ordens de Serviço", icon: ClipboardList },
    { path: "/schedule-view", title: "Escala Anual", icon: CalendarDays },
  ];

  const authDropdownItems = [
    ...(canAccessTimeTracking ? [{ path: "/time-tracking", title: "Apontamento de Horas", icon: Clock }] : []),
    ...(canAccessAdmin ? [{ path: "/admin", title: "Gerenciador de Banco de Dados", icon: Database }] : []),
    ...(canAccessMenuManager ? [{ path: "/menu-manager", title: "Gerenciar Menus", icon: Menu }] : []),
  ];

  // Verifica se há itens dinâmicos para exibir no cabeçalho
  const hasRootMenuItems = rootMenuItems.length > 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {/* Banner/Logo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/" className="flex items-center gap-2 h-10">
                <img src="/Banner.png" alt="AutoBoard Banner" className="h-full w-auto" />
                <span className="sr-only">Página Inicial</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Página Inicial</TooltipContent>
          </Tooltip>

          {/* Itens de Menu Raiz Dinâmicos (Exibidos no cabeçalho em telas grandes) */}
          <nav className="hidden lg:flex items-center gap-1">
            {rootMenuItems.map(renderRootItem)}
          </nav>

          {/* Dropdown Menu Principal (Visível em todas as telas) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1" aria-label="Abrir Menu de Navegação">
                    <Menu className="h-5 w-5" />
                    {/* Removida a classe lg:hidden para que o texto 'Menu' seja sempre visível em sm e acima */}
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Menu de Navegação</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64">
              {/* Navegação Padrão */}
              <Link to="/">
                <DropdownMenuItem>
                  <Search className="h-4 w-4 mr-2" /> Início
                </DropdownMenuItem>
              </Link>
              {standardDropdownItems.map(item => (
                <Link to={item.path} key={item.path}>
                  <DropdownMenuItem>
                    <item.icon className="h-4 w-4 mr-2" /> {item.title}
                  </DropdownMenuItem>
                </Link>
              ))}
              
              {/* Itens Dinâmicos (Inclui raízes e submenus para telas pequenas) */}
              {hasRootMenuItems && (
                <>
                  <DropdownMenuSeparator />
                  {renderDynamicMenu(rootMenuItems)}
                </>
              )}

              {/* Administração e Time Tracking */}
              {authDropdownItems.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {authDropdownItems.map(item => (
                    <Link to={item.path} key={item.path}>
                      <DropdownMenuItem>
                        <item.icon className="h-4 w-4 mr-2" /> {item.title}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 rounded-full">
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