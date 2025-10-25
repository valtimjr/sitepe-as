import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Menu, List as ListIcon, ChevronRight, Loader2 } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { getMenuStructure } from '@/services/customListService';
import { MenuItem } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface MenuItemProps {
  item: MenuItem;
  level: number;
}

const MenuItemDisplay: React.FC<MenuItemProps> = ({ item, level }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = item.children && item.children.length > 0;
  const isListLink = !!item.list_id;

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
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
            <MenuItemDisplay key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const CustomMenuOverview: React.FC = () => {
  const [menuHierarchy, setMenuHierarchy] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Catálogo de Peças - AutoBoard";
  }, []);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const structure = await getMenuStructure();
      setMenuHierarchy(structure);
    } catch (error) {
      showError('Erro ao carregar o catálogo de peças.');
      console.error('Failed to load menu structure:', error);
      setMenuHierarchy([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

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
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando catálogo...
            </div>
          ) : menuHierarchy.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma lista ou categoria configurada.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {menuHierarchy.map(item => (
                <MenuItemDisplay key={item.id} item={item} level={0} />
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