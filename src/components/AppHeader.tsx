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
  const [dynamicMenu, setDynamicMenu] = useState<MenuItem[]>([]);

  const loadDynamicMenu = useCallback(async () => {
    if (!session) {
      setDynamicMenu([]);
      return;
    }
    try {
      const structure = await getMenuStructure();
      setDynamicMenu(structure);
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

  if (isLoading) {
    return null; // Ou um skeleton de cabeçalho se preferir um carregamento visível
  }

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');
  const canAccessMenuManager = checkPageAccess('/menu-manager');

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

          {/* Dropdown Menu */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1" aria-label="Abrir Menu de Navegação">
                    <Menu className="h-5 w-5" />
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
              <Link to="/search-parts">
                <DropdownMenuItem>
                  <Search className="h-4 w-4 mr-2" /> Pesquisar Peças
                </DropdownMenuItem>
              </Link>
              <Link to="/parts-list">
                <DropdownMenuItem>
                  <List className="h-4 w-4 mr-2" /> Minha Lista de Peças
                </DropdownMenuItem>
              </Link>
              <Link to="/service-orders">
                <DropdownMenuItem>
                  <ClipboardList className="h-4 w-4 mr-2" /> Ordens de Serviço
                </DropdownMenuItem>
              </Link>
              <Link to="/schedule-view">
                <DropdownMenuItem>
                  <CalendarDays className="h-4 w-4 mr-2" /> Escala Anual
                </DropdownMenuItem>
              </Link>
              {canAccessTimeTracking && (
                <Link to="/time-tracking">
                  <DropdownMenuItem>
                    <Clock className="h-4 w-4 mr-2" /> Apontamento de Horas
                  </DropdownMenuItem>
                </Link>
              )}

              {/* Menu Dinâmico de Listas Personalizadas */}
              {dynamicMenu.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {renderDynamicMenu(dynamicMenu)}
                </>
              )}

              {/* Administração */}
              {(canAccessAdmin || canAccessMenuManager) && (
                <>
                  <DropdownMenuSeparator />
                  {canAccessAdmin && (
                    <Link to="/admin">
                      <DropdownMenuItem>
                        <Database className="h-4 w-4 mr-2" /> Gerenciador de Banco de Dados
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {canAccessMenuManager && (
                    <Link to="/menu-manager">
                      <DropdownMenuItem>
                        <Menu className="h-4 w-4 mr-2" /> Gerenciar Menus
                      </DropdownMenuItem>
                    </Link>
                  )}
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