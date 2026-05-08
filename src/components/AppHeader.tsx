"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Settings, LogOut, User as UserIcon, Menu, Search, List, ClipboardList, Database, Clock, CalendarDays, ChevronRight, MoreHorizontal, Building2 } from 'lucide-react';
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
import { useCompany } from '@/context/CompanyContext';

const AppHeader: React.FC = () => {
  const { session, user, profile, isLoading, checkPageAccess } = useSession();
  const { company, branding, setCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [rootMenuItems, setRootMenuItems] = useState<MenuItem[]>([]);

  const isLoginPage = location.pathname === '/login';

  const loadDynamicMenu = useCallback(async () => {
    try {
      const structure = await getMenuStructure(company);
      setRootMenuItems(structure);
    } catch (error) {
      // console.error('Failed to load dynamic menu:', error);
    }
  }, [company]);

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
      // console.error('AppHeader: Erro ao desconectar:', error);
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
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={2} alignOffset={-5}>
              {renderDynamicMenu(item.children)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }
      
      if (item.list_id) {
        return (
          <Link 
            to={{
              pathname: `/${company}/custom-list/${item.list_id}`,
              hash: item.hash ? `#${item.hash}` : ''
            }} 
            key={item.id}
          >
            <DropdownMenuItem>
              <List className="h-4 w-4 mr-2" /> {item.title}
            </DropdownMenuItem>
          </Link>
        );
      }

      return (
        <DropdownMenuItem key={item.id} disabled>
          {item.title} (Sem Link)
        </DropdownMenuItem>
      );
    });
  };

  const renderRootItem = (item: MenuItem) => {
    if (item.list_id && (!item.children || item.children.length === 0)) {
      return (
        <Link to={`/${company}/custom-list/${item.list_id}`} key={item.id}>
          <Button variant="ghost" className="flex items-center gap-1">
            {item.title}
          </Button>
        </Link>
      );
    }

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

    return null;
  };

  if (isLoading) {
    return null;
  }

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');
  const canAccessMenuManager = checkPageAccess('/menu-manager');

  const standardDropdownItems = [
    { path: `/${company}/search-parts`, title: "Pesquisar Peças", icon: Search },
    { path: `/${company}/parts-list`, title: "Minha Lista de Peças", icon: List },
    { path: `/${company}/service-orders`, title: "Ordens de Serviço", icon: ClipboardList },
    { path: "https://escala.eletricarpm.com.br", title: "Escala Anual", icon: CalendarDays, external: true },
  ];

  const authDropdownItems = [
    ...(canAccessTimeTracking ? [{ path: `/${company}/time-tracking`, title: "Apontamento de Horas", icon: Clock }] : []),
    ...(canAccessAdmin ? [{ path: `/${company}/admin`, title: "Gerenciador de Banco de Dados", icon: Database }] : []),
    ...(canAccessMenuManager ? [{ path: `/${company}/menu-manager`, title: "Gerenciar Menus", icon: Menu }] : []),
  ];

  const dynamicMenuLinks = rootMenuItems.filter(item => item.list_id || (item.children && item.children.length > 0));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={`/${company}`} className="flex items-center gap-2 h-10 shrink-0">
                <img
                  src={company === 'citrosuco' ? '/Banner_Citrosuco.png' : "/Banner.png"}
                  alt="AutoBoard Logo"
                  className="h-full w-auto transition-all duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes("Banner_Citrosuco.png")) {
                      target.src = "/Banner.png";
                    }
                  }}
                />
                <span className="sr-only">Página Inicial</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Página Inicial</TooltipContent>
          </Tooltip>
          
          {!isLoginPage && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-1 shrink-0" aria-label="Abrir Menu de Navegação">
                      <Menu className="h-5 w-5" />
                      <span className="hidden sm:inline">Menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Menu de Navegação</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-52 sm:w-64">
                {standardDropdownItems.map(item => (
                  item.external ? (
                    <a href={item.path} target="_blank" rel="noopener noreferrer" key={item.path}>
                      <DropdownMenuItem>
                        <item.icon className="h-4 w-4 mr-2" /> {item.title}
                      </DropdownMenuItem>
                    </a>
                  ) : (
                    <Link to={item.path} key={item.path}>
                      <DropdownMenuItem>
                        <item.icon className="h-4 w-4 mr-2" /> {item.title}
                      </DropdownMenuItem>
                    </Link>
                  )
                ))}
                
                {dynamicMenuLinks.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {renderDynamicMenu(dynamicMenuLinks)}
                  </>
                )}

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
          )}

          {!isLoginPage && dynamicMenuLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {dynamicMenuLinks.map(renderRootItem)}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {session ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm hidden sm:inline">
                Olá, {profile?.first_name || 'Usuário'}
              </span>
              
              <Link to={`/${company}/settings`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 rounded-full cursor-pointer">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar do Usuário" />
                      <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>Configurações</TooltipContent>
                </Tooltip>
              </Link>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Opções do Perfil</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to={`/${company}/settings`}>
                      <Settings className="h-4 w-4 mr-2" /> Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            !isLoginPage && (
              <Link to="/login">
                <Button variant="default" size="sm" className="flex items-center gap-1">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;