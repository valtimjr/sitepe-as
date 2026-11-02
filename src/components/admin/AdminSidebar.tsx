import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileChartLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AdminSection, preloadSection } from './adminSections';

interface AdminSidebarProps {
  sections: AdminSection[];
  activeKey?: string;
  reportHref?: string;
}

const itemClass =
  'relative flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted';

/** Barra lateral simples do Painel (web). */
const AdminSidebar: React.FC<AdminSidebarProps> = ({ sections, activeKey, reportHref }) => (
  <nav className="sticky top-20 flex flex-col border bg-card py-2" aria-label="Seções do Painel" data-testid="admin-sidebar">
    <span className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-primary">Painel</span>
    {sections.map(s => {
      const isActive = s.key === activeKey;
      return (
        <Link
          key={s.key}
          to={`?secao=${s.key}`}
          onMouseEnter={() => preloadSection(s)}
          onFocus={() => preloadSection(s)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(itemClass, isActive && 'bg-primary/10 text-primary')}
        >
          {isActive && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
          <s.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{s.label}</span>
        </Link>
      );
    })}
    {reportHref && (
      <>
        <div className="my-2 border-t" />
        <Link to={reportHref} className={cn(itemClass, 'text-muted-foreground')}>
          <FileChartLine className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Relatório Geral</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </>
    )}
  </nav>
);

export default AdminSidebar;
