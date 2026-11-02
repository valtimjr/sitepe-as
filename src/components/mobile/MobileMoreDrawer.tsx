import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Database,
  Download,
  FileChartLine,
  List,
  LogIn,
  LogOut,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { getMenuStructure } from '@/services/customListService';
import { supabase } from '@/integrations/supabase/client';
import { MenuItem } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { tap } from '@/lib/haptics';
import LoginModal from '@/components/LoginModal';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

interface MobileMoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const rowClass =
  'flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium text-left active:bg-muted/80 transition-colors';

const DrawerLink: React.FC<{ to: string; icon: LucideIcon; label: string; external?: boolean; onNavigate: () => void; depth?: number }> = ({
  to,
  icon: Icon,
  label,
  external,
  onNavigate,
  depth = 0,
}) => {
  const content = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </>
  );
  const style = { paddingLeft: `${1 + depth * 1.25}rem` };

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={rowClass} style={style} onClick={onNavigate}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={rowClass} style={style} onClick={onNavigate}>
      {content}
    </Link>
  );
};

const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({ open, onOpenChange }) => {
  const { session, profile, checkPageAccess } = useSession();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  useEffect(() => {
    if (!open) return;
    getMenuStructure(company).then(setMenuItems).catch(() => {});
  }, [open, company]);

  const close = () => onOpenChange(false);

  const handleInstall = async () => {
    tap();
    close();
    await promptInstall();
  };

  const handleLogout = async () => {
    close();
    const { error } = await supabase.auth.signOut();
    if (error) showError(`Erro ao desconectar: ${error.message}`);
    else {
      showSuccess('Você foi desconectado com sucesso!');
      const protectedPrefixes = ['/admin', '/time-tracking', '/menu-manager', '/settings', '/manage-tags'];
      if (protectedPrefixes.some(prefix => location.pathname.includes(prefix))) navigate(`/${company}`);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  const toolLinks = [
    ...(checkPageAccess('/time-tracking') ? [{ to: `/${company}/time-tracking`, label: 'Apontamento de Horas', icon: Clock }] : []),
    ...(isAdmin ? [{ to: `/${company}/admin-report`, label: 'Relatório Geral', icon: FileChartLine }] : []),
    ...(checkPageAccess('/admin') ? [{ to: `/${company}/admin`, label: 'Gerenciador de Banco de Dados', icon: Database }] : []),
  ];

  const renderMenu = (items: MenuItem[], depth = 0): React.ReactNode =>
    items.map(item => {
      if (item.children && item.children.length > 0) {
        return (
          <div key={item.id}>
            <div
              className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              style={{ paddingLeft: `${1 + depth * 1.25}rem` }}
            >
              {item.title}
            </div>
            {renderMenu(item.children, depth + 1)}
          </div>
        );
      }
      if (!item.list_id) return null;
      return (
        <DrawerLink
          key={item.id}
          to={`/${company}/custom-list/${item.list_id}${item.hash ? `#${item.hash}` : ''}`}
          icon={List}
          label={item.title}
          onNavigate={close}
          depth={depth}
        />
      );
    });

  const visibleMenu = menuItems.filter(item => item.list_id || (item.children && item.children.length > 0));

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[85vh] pb-safe" data-testid="mobile-more-drawer">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>Mais opções</DrawerTitle>
            <DrawerDescription>
              {session ? `Conectado como ${profile?.first_name || 'Usuário'}` : 'Você está navegando como visitante'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto overscroll-contain pb-4">
            <div className="divide-y divide-border/60">
              {toolLinks.map(link => (
                <DrawerLink key={link.to} {...link} onNavigate={close} />
              ))}
              <DrawerLink
                to="https://escala.eletricarpm.com.br"
                icon={CalendarDays}
                label="Escala Anual"
                external
                onNavigate={close}
              />
            </div>

            {visibleMenu.length > 0 && (
              <div className="mt-2 border-t">
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-primary">Listas</div>
                {renderMenu(visibleMenu)}
              </div>
            )}

            <div className="mt-2 border-t divide-y divide-border/60">
              {canInstall && (
                <button type="button" className={rowClass} onClick={handleInstall} data-testid="install-app-button">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Download className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    Instalar app
                    <span className="block text-xs font-normal text-muted-foreground">Adicionar o AutoBoard à tela inicial</span>
                  </span>
                </button>
              )}
              {session ? (
                <>
                  <DrawerLink to={`/${company}/settings`} icon={Settings} label="Configurações" onNavigate={close} />
                  <button type="button" className={`${rowClass} text-destructive`} onClick={handleLogout}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 shrink-0">
                      <LogOut className="h-4 w-4" />
                    </span>
                    Sair
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    tap();
                    close();
                    setIsLoginOpen(true);
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                    <LogIn className="h-4 w-4" />
                  </span>
                  Entrar na conta
                </button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <LoginModal isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
};

export default MobileMoreDrawer;
