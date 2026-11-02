import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MenuItem } from '@/types/supabase';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import MenuItemIcon from '@/components/list-icon/MenuItemIcon';

interface MobileListBrowserProps {
  items: MenuItem[];
  company: string;
  path: MenuItem[];
  direction: 'forward' | 'back';
  onPathChange: (path: MenuItem[], direction: 'forward' | 'back') => void;
  onNavigate: () => void;
}

const rowClass =
  'flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium text-left active:bg-muted/80 transition-colors';

export const isVisibleMenuItem = (item: MenuItem) => !!item.list_id || (item.children?.length ?? 0) > 0;

/** Listas do menu navegadas em camadas: cada categoria abre o próprio nível. */
const MobileListBrowser: React.FC<MobileListBrowserProps> = ({ items, company, path, direction, onPathChange, onNavigate }) => {
  const current = (path.length > 0 ? path[path.length - 1].children ?? [] : items).filter(isVisibleMenuItem);

  const goTo = (depth: number) => {
    tap();
    onPathChange(path.slice(0, depth), 'back');
  };

  return (
    <div data-testid="mobile-list-browser">
      {path.length === 0 ? (
        <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-primary">Listas</div>
      ) : (
        <div className="flex items-center gap-2 border-b px-2 py-2">
          <button
            type="button"
            onClick={() => goTo(path.length - 1)}
            className="flex shrink-0 items-center gap-0.5 px-2 py-1.5 text-sm font-semibold text-primary active:bg-primary/10"
            data-testid="list-browser-back"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <nav
            className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden text-xs text-muted-foreground"
            aria-label="Caminho"
            data-testid="list-browser-breadcrumb"
          >
            {[{ id: 'root', title: 'Listas' }, ...path].map((crumb, index) => {
              const isLast = index === path.length;
              return (
                <React.Fragment key={crumb.id}>
                  {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                  {isLast ? (
                    <span className="truncate font-semibold text-foreground">{crumb.title}</span>
                  ) : (
                    <button type="button" className="shrink-0 truncate max-w-[6rem] active:text-primary" onClick={() => goTo(index)}>
                      {crumb.title}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      )}

      <div
        key={path.map(p => p.id).join('/') || 'root'}
        className={cn(
          'divide-y divide-border/60 animate-in fade-in duration-200',
          direction === 'forward' ? 'slide-in-from-right-8' : 'slide-in-from-left-8',
        )}
      >
        {current.map(item => {
          const children = (item.children ?? []).filter(isVisibleMenuItem);
          if (children.length > 0) {
            return (
              <button
                key={item.id}
                type="button"
                className={rowClass}
                onClick={() => {
                  tap();
                  onPathChange([...path, item], 'forward');
                }}
                data-testid="list-browser-category"
              >
                <MenuItemIcon item={item} size="sm" className="h-9 w-9 rounded-md" />
                <span className="flex-1 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground">{children.length}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          }
          if (!item.list_id) return null;
          return (
            <Link
              key={item.id}
              to={`/${company}/custom-list/${item.list_id}${item.hash ? `#${item.hash}` : ''}`}
              className={rowClass}
              onClick={onNavigate}
              data-testid="list-browser-list"
            >
              <MenuItemIcon item={item} size="sm" className="h-9 w-9 rounded-md" />
              <span className="flex-1 truncate">{item.title}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileListBrowser;
