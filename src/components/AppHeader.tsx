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
import { cn } from "@/lib/utils";
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
import LoginModal from './LoginModal';

const AppHeader: React.FC = () => {
  const { session, isLoading, profile, checkPageAccess } = useSession();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [rootMenuItems, setRootMenuItems] = useState<MenuItem[]>([]);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
      
      // Se a página atual for protegida, redireciona para a home da empresa
      // Caso contrário, permanece na página atual.
      const protectedPrefixes = ['/admin', '/time-tracking', '/menu-manager', '/settings', '/manage-tags'];
      const isCurrentlyOnProtectedPage = protectedPrefixes.some(prefix => 
        location.pathname.includes(prefix)
      );

      if (isCurrentlyOnProtectedPage) {
        navigate(`/${company}`);
      }
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
                className={cn(
                  "uiverse-search-input",
                  (isFocused || headerSearchQuery.trim().length > 0) && "expanded"
                )}
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsFocused(true);
                  if (headerSearchQuery) setShowResults(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setShowResults(false), 200);
                }}
                autoComplete="off"
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
              <>
                <div className="login-btn-container">
                  <button
                    type="button"
                    className="login-btn-input"
                    onClick={() => setIsLoginModalOpen(true)}
                  >
                    <span className="login-btn-text">Entrar</span>
                  </button>
                  <div className="login-btn-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                      <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="white" stroke="none">
                        <path d="M2175 5108 c-27 -5 -87 -27 -133 -48 -108 -51 -222 -161 -270 -260 -55 -113 -62 -160 -62 -411 0 -218 1 -227 23 -260 32 -49 105 -83 158 -74 53 9 115 64 129 113 5 21 10 125 10 232 0 184 2 198 24 246 13 27 42 66 66 87 81 69 55 67 834 66 l701 -1 -217 -73 c-280 -94 -342 -137 -412 -284 l-31 -66 -3 -1707 -2 -1708 -368 0 c-412 0 -426 2 -502 67 -24 21 -53 60 -66 87 -22 48 -24 62 -24 246 0 107 -5 211 -10 232 -14 49 -76 104 -129 113 -53 9 -126 -25 -158 -74 -22 -33 -23 -42 -23 -260 0 -251 7 -298 62 -411 48 -99 162 -209 269 -259 46 -22 111 -44 143 -50 36 -7 208 -11 433 -11 l373 0 0 -143 c0 -98 5 -159 15 -193 23 -79 86 -168 155 -218 83 -61 145 -81 255 -81 l90 0 670 224 c369 123 692 235 719 248 58 29 132 101 169 163 60 104 57 -22 57 2135 0 2139 3 2017 -55 2124 -33 60 -114 140 -173 170 -103 53 -59 51 -1412 50 -747 -1 -1275 -5 -1305 -11z m2594 -342 l26 -26 3 -1953 c3 -1809 2 -1954 -14 -1984 -9 -18 -31 -38 -48 -46 -17 -8 -319 -110 -671 -227 -694 -231 -671 -226 -726 -170 l-29 28 0 1961 0 1960 23 26 c18 21 142 65 677 245 710 238 707 237 759 186z"/>
                        <path d="M1330 3829 c-83 -33 -126 -142 -86 -217 8 -15 137 -148 285 -297 l271 -270 -849 -5 c-838 -5 -850 -5 -877 -26 -53 -39 -69 -71 -69 -134 0 -63 16 -95 69 -134 27 -21 39 -21 877 -26 l849 -5 -271 -270 c-148 -148 -277 -282 -285 -297 -8 -15 -14 -47 -14 -71 0 -113 126 -190 226 -139 23 12 214 196 456 439 358 359 418 424 429 461 26 89 30 84 -429 545 -230 230 -434 427 -454 438 -40 21 -88 24 -128 8z"/>
                      </g>
                    </svg>
                  </div>
                </div>
                <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;