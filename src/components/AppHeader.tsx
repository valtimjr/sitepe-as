"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [rootMenuItems, setRootMenuItems] = useState<MenuItem[]>([]);

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

  // Função recursiva para renderizar submenus
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
      
      // Item final que aponta para uma lista (com ou sem âncora)
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
    if (item.list_id && (!item.children || item.children.length === 0)) {
      return (
        <Link to={`/${company}/custom-list/${item.list_id}`} key={item.id}>
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
    { path: `/${company}/search-parts`, title: "Pesquisar Peças", icon: Search },
    { path: `/${company}/parts-list`, title: "Minha Lista de Peças", icon: List },
    { path: `/${company}/service-orders`, title: "Ordens de Serviço", icon: ClipboardList },
    // CORRIGIDO: Escala Anual agora é um link externo
    { path: "https://escala.eletricarpm.com.br", title: "Escala Anual", icon: CalendarDays, external: true },
  ];

  const authDropdownItems = [
    ...(canAccessTimeTracking ? [{ path: `/${company}/time-tracking`, title: "Apontamento de Horas", icon: Clock }] : []),
    ...(canAccessAdmin ? [{ path: `/${company}/admin`, title: "Gerenciador de Banco de Dados", icon: Database }] : []),
    ...(canAccessMenuManager ? [{ path: `/${company}/menu-manager`, title: "Gerenciar Menus", icon: Menu }] : []),
  ];

  // Filtra itens dinâmicos que são links diretos ou submenus
  const dynamicMenuLinks = rootMenuItems.filter(item => item.list_id || (item.children && item.children.length > 0));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* Lado Esquerdo: Banner + Menu Hambúrguer + Menus Dinâmicos Desktop */}
        <div className="flex items-center gap-2">
          {/* Banner/Logo do AutoBoard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={`/${company}`} className="flex items-center gap-2 h-10 shrink-0">
                <img src="/banner.png" alt="AutoBoard Logo" className="h-full w-auto" />
                <span className="sr-only">Página Inicial</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Página Inicial</TooltipContent>
          </Tooltip>
          
          {/* Selector de Empresa (Baseado em Logo) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <img 
                    src={branding.logo} 
                    alt={branding.name} 
                    className="h-10 w-10 ml-2 object-contain cursor-pointer hover:bg-muted transition-colors rounded-lg border border-border/50 p-1" 
                  />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Mudar Empresa ({branding.name})</TooltipContent>
            </Tooltip>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={() => setCompany('usina_vale')} className="flex items-center gap-3">
                <img src="/Usina Vale.png" alt="Usina Vale" className="h-6 w-auto object-contain" />
                <span>Usina Vale</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompany('citrosuco')} className="flex items-center gap-3">
                <img src="/CitroSuco.png" alt="Citrosuco" className="h-6 w-auto object-contain" />
                <span>Citrosuco</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Menu Principal (Hambúrguer) */}
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
            <DropdownMenuContent align="start" className="w-52 sm:w-64"> {/* Ajuste de largura para mobile */}
              {/* Navegação Padrão */}
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
              
              {/* Itens Dinâmicos (dentro do dropdown para mobile/fallback) */}
              {dynamicMenuLinks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {renderDynamicMenu(dynamicMenuLinks)}
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
              
              {/* Empresa (Mobile) */}
              <div className="md:hidden">
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Building2 className="h-4 w-4 mr-2" /> Empresa: {branding.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setCompany('usina_vale')} className="flex items-center gap-3">
                      <img src="/Usina Vale.png" alt="Usina Vale" className="h-5 w-auto" />
                      <span>Usina Vale</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCompany('citrosuco')} className="flex items-center gap-3">
                      <img src="/CitroSuco.png" alt="Citrosuco" className="h-5 w-auto" />
                      <span>Citrosuco</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menus Dinâmicos Desktop - Reposicionados aqui */}
          {dynamicMenuLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {dynamicMenuLinks.map(renderRootItem)}
            </nav>
          )}
        </div>

        {/* Lado Direito: Status do Usuário/Login (Menus Interativos) */}
        <div className="flex items-center gap-2 shrink-0">
          {session ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm hidden sm:inline">
                Olá, {profile?.first_name || 'Usuário'}
              </span>
              
              {/* Avatar (link para configurações) */}
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

              {/* Menu de Ações do Perfil (Três Pontos) */}
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
            <Link to="/login">
              <Button variant="default" size="sm" className="flex items-center gap-1">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;