"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Settings, LogOut, User as UserIcon, Menu, Search, List, ClipboardList, Database, Clock, CalendarDays, ChevronRight, MoreHorizontal } from 'lucide-react';
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
import { MenuItem, Part } from '@/types/supabase';
import { useCompany } from '@/context/CompanyContext';
import { searchParts } from '@/services/partListService';

const AppHeader: React.FC = () => {
  const { session, isLoading, profile, checkPageAccess } = useSession();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [rootMenuItems, setRootMenuItems] = useState<MenuItem[]>([]);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [showResults, setShowResults] = useState(false);

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    if (!headerSearchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchParts(headerSearchQuery, company);
        setSearchResults(results.slice(0, 5));
        setShowResults(true);
      } catch (error) {
        // console.error("Header search error", error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [headerSearchQuery, company]);

  const handleHeaderSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (headerSearchQuery.trim()) {
      navigate(`/${company}/search-parts?q=${encodeURIComponent(headerSearchQuery.trim())}`);
      setHeaderSearchQuery('');
      setShowResults(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHeaderSearch();
    }
  };

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
      if (error) throw error;
      showSuccess('Você foi desconectado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message || 'Detalhes desconhecidos.'}`);
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
            <DropdownMenuSubTrigger>{item.title}</DropdownMenuSubTrigger>
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

      return <DropdownMenuItem key={item.id} disabled>{item.title} (Sem Link)</DropdownMenuItem>;
    });
  };

  const renderRootItem = (item: MenuItem) => {
    if (item.list_id && (!item.children || item.children.length === 0)) {
      return (
        <Link to={`/${company}/custom-list/${item.list_id}`} key={item.id}>
          <Button variant="ghost" className="flex items-center gap-1">{item.title}</Button>
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

  if (isLoading) return null;

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
                  className="h-full w-auto transition-transform duration-400 ease-in-out hover:scale-95 active:scale-90"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes("Banner_Citrosuco.png")) target.src = "/Banner.png";
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
                      <DropdownMenuItem><item.icon className="h-4 w-4 mr-2" /> {item.title}</DropdownMenuItem>
                    </a>
                  ) : (
                    <Link to={item.path} key={item.path}>
                      <DropdownMenuItem><item.icon className="h-4 w-4 mr-2" /> {item.title}</DropdownMenuItem>
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
                        <DropdownMenuItem><item.icon className="h-4 w-4 mr-2" /> {item.title}</DropdownMenuItem>
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
          {!isLoginPage && (
            <div className="uiverse-search-container relative mr-2">
              <input
                type="text"
                placeholder="Pesquisar peça"
                className="uiverse-search-input"
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => headerSearchQuery && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
              <div className="uiverse-search-icon" onClick={() => handleHeaderSearch()}>
                <Search className="h-5 w-5 text-black" />
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-[280px] bg-white border rounded-md shadow-lg overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 bg-blue-50/50 border-b text-[10px] font-bold text-blue-600 uppercase">
                    Resultados Rápidos
                  </div>
                  {searchResults.map(part => (
                    <div
                      key={part.id}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors"
                      onClick={() => {
                        navigate(`/${company}/search-parts?q=${encodeURIComponent(part.codigo)}`);
                        setHeaderSearchQuery('');
                        setShowResults(false);
                      }}
                    >
                      <div className="font-bold text-xs text-blue-700">{part.codigo}</div>
                      <div className="text-[10px] text-gray-600 line-clamp-2 leading-tight">{part.descricao}</div>
                    </div>
                  ))}
                  <div
                    className="p-2 text-center text-[10px] font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleHeaderSearch()}
                  >
                    Pressione Enter para ver tudo
                  </div>
                </div>
              )}
            </div>
          )}

          {session ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm hidden sm:inline">Olá, {profile?.first_name || 'Usuário'}</span>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Opções do Perfil</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild><Link to={`/${company}/settings`}><Settings className="h-4 w-4 mr-2" /> Configurações</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            !isLoginPage && (
              <Link to="/login">
                <Button variant="default" size="sm" className="flex items-center gap-1">
                  <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Entrar</span>
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