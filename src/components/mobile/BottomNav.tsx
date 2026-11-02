import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Home, List, MoreHorizontal, Search, type LucideIcon } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type TabKey = 'home' | 'search' | 'list' | 'orders' | 'more';

interface Tab {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  path?: string;
}

const BottomNav: React.FC = () => {
  const { company } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMoreOpen, setMoreOpen, setSearchOpen } = useMobileNav();
  const keyboardOpen = useKeyboardOpen();

  const tabs: Tab[] = [
    { key: 'home', label: 'Início', icon: Home, path: `/${company}` },
    { key: 'search', label: 'Pesquisar', icon: Search, path: `/${company}/search-parts` },
    { key: 'list', label: 'Minha Lista', icon: List, path: `/${company}/parts-list` },
    { key: 'orders', label: 'Ordens', icon: ClipboardList, path: `/${company}/service-orders` },
    { key: 'more', label: 'Mais', icon: MoreHorizontal },
  ];

  const pathname = location.pathname.replace(/\/+$/, '');
  const routeTab = tabs.find(t => t.path && t.path === pathname)?.key ?? 'more';
  const activeTab: TabKey = isMoreOpen ? 'more' : routeTab;

  if (keyboardOpen) return null;

  const handlePress = (tab: Tab) => {
    tap();
    setSearchOpen(false);
    if (tab.key === 'more') {
      setMoreOpen(!isMoreOpen);
      return;
    }
    setMoreOpen(false);
    if (tab.key === routeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(tab.path!);
  };

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 pb-safe"
      aria-label="Navegação principal"
      data-testid="bottom-nav"
    >
      <ul className="flex h-16 items-stretch justify-around px-1">
        {tabs.map(tab => {
          const isActive = tab.key === activeTab;
          const Icon = tab.icon;
          return (
            <li key={tab.key} className="flex-1">
              <button
                type="button"
                onClick={() => handlePress(tab)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                data-testid={`bottom-nav-${tab.key}`}
                className={cn(
                  'flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-90 transition-transform duration-150',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-14 items-center justify-center rounded-full transition-all duration-200',
                    isActive ? 'bg-primary/15 scale-100' : 'scale-95',
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                </span>
                <span className="leading-tight truncate max-w-full px-0.5">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
