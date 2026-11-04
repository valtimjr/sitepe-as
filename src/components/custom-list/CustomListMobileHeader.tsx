import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListIconView from '@/components/list-icon/ListIcon';
import type { ListIcon } from '@/types/listIcon';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface CustomListMobileHeaderProps {
  company: string;
  title: string;
  icon: ListIcon | null;
  itemCount: number;
  selectedCount: number;
  onShare: () => void;
  onClearSelection: () => void;
  /** Com capa, o cabeçalho encosta nela em vez de subir sobre o padding. */
  hasCover?: boolean;
  /** Esconde o ícone pequeno enquanto o ícone grande da capa está visível. */
  hideIcon?: boolean;
  /** Botão "Adicionar capa" (só admin/moderador). */
  coverAction?: React.ReactNode;
}

/** Cabeçalho fixo da lista no celular: voltar, título, Compartilhar e resumo da seleção. */
const CustomListMobileHeader: React.FC<CustomListMobileHeaderProps> = ({
  company,
  title,
  icon,
  itemCount,
  selectedCount,
  onShare,
  onClearSelection,
  hasCover,
  hideIcon,
  coverAction,
}) => {
  // Acompanha o header do app, que se esconde ao rolar
  const appHeaderHidden = useHideOnScroll();

  return (
    <div
      className={cn(
        'sticky z-30 -mx-4 mb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-2 pb-2 transition-[top] duration-300 ease-out',
        hasCover ? 'mt-0' : '-mt-4',
      )}
      style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      data-testid="custom-list-mobile-header"
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2" asChild>
          <Link to={`/${company}/custom-menu-view`} aria-label="Voltar ao Catálogo" onClick={() => tap()}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        {!hideIcon && <ListIconView name={title} icon={icon} size="sm" className="rounded-md" />}
        <h1 className="flex-1 min-w-0 text-lg font-bold text-primary line-clamp-1" data-testid="custom-list-title">
          {title}
        </h1>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 shrink-0 text-primary border-primary/30"
          onClick={() => {
            tap();
            onShare();
          }}
          disabled={itemCount === 0}
          aria-label="Compartilhar"
          data-testid="custom-list-share-button"
        >
          <Share2 className="h-4 w-4" />
          {selectedCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow"
              data-testid="custom-list-share-count"
            >
              {selectedCount}
            </span>
          )}
        </Button>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </span>
        {selectedCount > 0 && (
          <span
            className="flex items-center gap-1 rounded-full bg-primary/10 pl-2.5 pr-1 font-semibold text-primary"
            data-testid="custom-list-selection-chip"
          >
            {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
            <Button variant="link" size="sm" className="h-7 px-1.5 text-xs" onClick={onClearSelection}>
              Limpar
            </Button>
          </span>
        )}
        {coverAction && <div className="ml-auto">{coverAction}</div>}
      </div>
    </div>
  );
};

export default CustomListMobileHeader;
