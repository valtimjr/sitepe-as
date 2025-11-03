import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Menu, List as ListIcon, ChevronRight, Loader2, Tag, Info } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { getMenuStructure } from '@/services/customListService';
import { MenuItem, Part } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile'; // Importar o hook useIsMobile
import { getParts } from '@/services/partListService'; // Importar getParts

interface MenuItemProps {
  item: MenuItem;
  level: number;
  allAvailableParts: Part[]; // Adicionado para resolver descrições
}

const MenuItemDisplay: React.FC<MenuItemProps> = ({ item, level, allAvailableParts }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false); // Estado para controlar o tooltip
  const hasChildren = item.children && item.children.length > 0;
  const isListLink = !!item.list_id;
  const hasRelatedItems = item.itens_relacionados && item.itens_relacionados.length > 0;

  const isMobile = useIsMobile(); // Usar o hook useIsMobile

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  };

  const handleTooltipClick = (e: React.MouseEvent) => {
    if (isMobile) {
      e.stopPropagation(); // Evita que o clique no botão feche o menu pai
      setIsTooltipOpen(prev => !prev);
    }
  };

  // Helper function to get part description for display
  const getPartDescription = (partCode: string): string => {
    console.log(`[MenuItemDisplay] getPartDescription: Buscando descrição para o código: "${partCode}"`);
    const part = allAvailableParts.find(p => p.codigo.toLowerCase() === partCode.toLowerCase());
    if (part) {
      console.log(`[MenuItemDisplay] getPartDescription: Encontrada peça: ${part.codigo} - ${part.descricao}`);
      return `${part.codigo} - ${part.descricao}`;
    }
    console.log(`[MenuItemDisplay] getPartDescription: Peça não encontrada para o código: "${partCode}"`);
    return partCode;
  };

  const content = (
    <div 
      className={cn(
        "flex items-center justify-between p-3 border-b last:border-b-0 transition-colors",
        isListLink ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50',
        level > 0 && 'border-l-2 border-muted-foreground/30'
      )}
      style={{ paddingLeft: `${16 + level * 20}px` }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {hasChildren ? (
          <ChevronRight 
            className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && 'rotate-90')} 
            onClick={toggleExpand}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <ListIcon className="h-4 w-4 text-primary" />
        )}
        <span className={cn("font-medium truncate", isListLink && 'text-primary')}>
          {item.title}
        </span>
        {hasRelatedItems && (
          <div className="flex justify-center w-full sm:w-auto"> {/* Wrapper para centralizar o botão */}
            <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
              <TooltipTrigger asChild>
                {/* Alterado para Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 p-0 text-muted-foreground cursor-pointer" // Removido ml-2
                  onClick={handleTooltipClick}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-bold mb-1">Itens Relacionados:</p>
                <ul className="list-disc list-inside">
                  {item.itens_relacionados.map(rel => <li key={rel}>{getPartDescription(rel)}</li>)}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      
      {isListLink && (
        <Button variant="link" size="sm" className="text-primary shrink-0">
          Visualizar
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {isListLink ? (
        <Link to={`/custom-list/${item.list_id}`} className="block">
          {content}
        </Link>
      ) : (
        <div onClick={toggleExpand} className="cursor-pointer">
          {content}
        </div>
      )}
      
      {hasChildren && isExpanded && (
        <div className="w-full">
          {item.children!.map(child => (
            <MenuItemDisplay key={child.id} item={child} level={level + 1} allAvailableParts={allAvailableParts} />
          ))}
        </div>
      )}
    </div>
  );
};

const CustomMenuOverview: React.FC = () => {
  const [menuHierarchy, setMenuHierarchy] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]); // Adicionado para resolver descrições
  const [isLoadingAllParts, setIsLoadingAllParts] = useState(true); // Loading state for all parts

  useEffect(() => {
    document.title = "Catálogo de Peças - AutoBoard";
  }, []);

  const loadMenu = useCallback(async () => {
    console.log('[CustomMenuOverview] loadMenu: Carregando estrutura do menu.');
    setIsLoading(true);
    try {
      const structure = await getMenuStructure();
      setMenuHierarchy(structure);
      console.log('[CustomMenuOverview] loadMenu: Estrutura do menu carregada:', structure.length, 'itens raiz.');
    } catch (error) {
      console.error('[CustomMenuOverview] loadMenu: Erro ao carregar o catálogo de peças:', error);
      showError('Erro ao carregar o catálogo de peças.');
      setMenuHierarchy([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllParts = useCallback(async () => {
    console.log('[CustomMenuOverview] loadAllParts: Carregando todas as peças.');
    setIsLoadingAllParts(true);
    try {
      const parts = await getParts();
      setAllAvailableParts(parts);
      console.log('[CustomMenuOverview] loadAllParts: Todas as peças carregadas:', parts.length);
    } catch (error) {
      console.error("[CustomMenuOverview] loadAllParts: Erro ao carregar todas as peças:", error);
    } finally {
      setIsLoadingAllParts(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
    loadAllParts(); // Load all parts on component mount
  }, [loadMenu, loadAllParts]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 mt-8">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para o Início
          </Button>
        </Link>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Menu className="h-8 w-8 text-primary" />
        Catálogo de Peças
      </h1>

      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Estrutura de Listas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || isLoadingAllParts ? (
            <div className="text-center text-muted-foreground py-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando catálogo...
            </div>
          ) : menuHierarchy.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma lista ou categoria configurada.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {menuHierarchy.map(item => (
                <MenuItemDisplay key={item.id} item={item} level={0} allAvailableParts={allAvailableParts} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default CustomMenuOverview;