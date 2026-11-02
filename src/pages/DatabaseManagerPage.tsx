import React, { Suspense, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FileChartLine, Loader2 } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import HomeMenuRow from '@/components/home/HomeMenuRow';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminSectionHeader from '@/components/admin/AdminSectionHeader';
import { getVisibleSections, preloadSection } from '@/components/admin/adminSections';

const ACTIVE_SECTION_KEY = 'database_manager_active_tab';

const SectionLoader = () => (
  <div className="flex justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const DatabaseManagerPage: React.FC = () => {
  const { isLoading, checkPageAccess, profile } = useSession();
  const { company, branding } = useCompany();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCompact = useIsCompact();

  const isAdmin = profile?.role === 'admin';
  const sections = useMemo(
    () => (isLoading ? [] : getVisibleSections(profile?.role, checkPageAccess('/menu-manager'))),
    [isLoading, profile?.role, checkPageAccess],
  );

  useEffect(() => {
    document.title = `Painel Administração - AutoBoard (${branding.name})`;
  }, [branding.name]);

  // Seção ativa: URL > única seção > (web) última usada ou primeira. No celular, sem URL mostra a lista.
  const requested = sections.find(s => s.key === searchParams.get('secao'));
  const active =
    requested ??
    (sections.length === 1
      ? sections[0]
      : isCompact
        ? undefined
        : sections.find(s => s.key === localStorage.getItem(ACTIVE_SECTION_KEY)) ?? sections[0]);

  useEffect(() => {
    if (active) localStorage.setItem(ACTIVE_SECTION_KEY, active.key);
  }, [active]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <p>Carregando painel de administração...</p>
      </div>
    );
  }

  if (sections.length === 0) return null;

  const reportHref = isAdmin ? `/${company}/admin-report` : undefined;

  const backToList = () => {
    // Volta no histórico quando a lista é a página anterior; senão substitui (link direto)
    if (location.key !== 'default') navigate(-1);
    else navigate({ search: '' }, { replace: true });
  };

  const content = active && (
    <Suspense fallback={<SectionLoader />}>
      <active.Component />
    </Suspense>
  );

  if (isCompact) {
    if (active) {
      return (
        <div className="min-h-screen bg-background text-foreground" data-testid="admin-section">
          {sections.length > 1 && <AdminSectionHeader label={active.label} onBack={backToList} />}
          <div className="p-3">{content}</div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background p-3 text-foreground">
        <div className="mb-3 px-1">
          <h1 className="text-xl font-extrabold text-primary">Painel Administração</h1>
          <p className="text-sm text-muted-foreground">{branding.name}</p>
        </div>
        <div className="flex flex-col gap-2" data-testid="admin-section-list">
          {sections.map(s => (
            <HomeMenuRow
              key={s.key}
              to={`?secao=${s.key}`}
              icon={s.icon}
              title={s.label}
              subtitle={s.subtitle}
              onPointerDown={() => preloadSection(s)}
            />
          ))}
        </div>
        {reportHref && (
          <div className="mt-4 flex flex-col">
            <HomeMenuRow to={reportHref} icon={FileChartLine} title="Relatório Geral" subtitle="Indicadores e exportação em PDF" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-baseline gap-3">
          <h1 className="text-2xl font-extrabold text-primary">Painel Administração</h1>
          <span className="text-sm font-medium text-muted-foreground">{branding.name}</span>
        </div>
        <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6">
          <AdminSidebar sections={sections} activeKey={active?.key} reportHref={reportHref} />
          <main data-testid="admin-section">{content}</main>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagerPage;
