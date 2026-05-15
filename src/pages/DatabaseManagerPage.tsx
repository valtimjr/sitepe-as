import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Database, Menu, ChevronLeft, Tags, FileChartLine } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import InviteManager from '@/components/InviteManager';
import MenuManagerPage from '@/pages/MenuManagerPage';
import UserAttributesManager from '@/components/UserAttributesManager';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';

const DATABASE_MANAGER_ACTIVE_TAB_KEY = 'database_manager_active_tab';

const DatabaseManagerPage: React.FC = () => {
  const { isLoading, checkPageAccess, profile } = useSession();
  const { company, branding } = useCompany();
  const [activeTab, setActiveTab] = useState<string>('');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    document.title = `Painel Administração - AutoBoard (${branding.name})`;
  }, [branding.name]);

  const { visibleTabs, defaultTab } = useMemo(() => {
    if (isLoading) {
      return { visibleTabs: [], defaultTab: '' };
    }
    const isModerator = profile?.role === 'moderator';
    const canAccessMenuManager = checkPageAccess('/menu-manager');
    
    let tabs: string[] = [];
    
    if (isAdmin) {
      tabs = ['parts', 'afs', 'invites', 'attributes'];
      if (canAccessMenuManager) tabs.push('menu');
    } else if (isModerator) {
      // O moderador tem acesso APENAS aos convites na página admin
      tabs = ['invites'];
    }
    
    return { visibleTabs: tabs, defaultTab: tabs[0] || '' };
  }, [isLoading, isAdmin, profile?.role, checkPageAccess]);

  useEffect(() => {
    if (!isLoading) {
      if (visibleTabs.length === 0) return;

      const savedTab = localStorage.getItem(DATABASE_MANAGER_ACTIVE_TAB_KEY);

      if (savedTab && visibleTabs.includes(savedTab)) {
        setActiveTab(savedTab);
      } else {
        setActiveTab(defaultTab);
        localStorage.setItem(DATABASE_MANAGER_ACTIVE_TAB_KEY, defaultTab);
      }
    }
  }, [isLoading, visibleTabs, defaultTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando painel de administração...</p>
      </div>
    );
  }
  
  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <img src="/icons/tela_inicial/7.png" alt="" className="h-16 w-auto object-contain" />
          Painel Administração
        </div>
        <span className="text-2xl font-bold opacity-80">{branding.name}</span>
      </h1>

      <div className="w-full max-w-6xl flex justify-end mb-4">
        {isAdmin && (
          <Link to={`/${company}/admin-report`}>
            <Button variant="outline" className="flex items-center gap-2 text-primary border-primary/20 hover:bg-primary/5">
              <FileChartLine className="h-4 w-4" />
              Relatório Geral
            </Button>
          </Link>
        )}
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(tab) => {
          setActiveTab(tab);
          localStorage.setItem(DATABASE_MANAGER_ACTIVE_TAB_KEY, tab);
        }} 
        className="w-full max-w-6xl"
      >
        <TabsList className="flex flex-wrap justify-center h-auto gap-2 mb-4">
          {visibleTabs.includes('parts') && <TabsTrigger value="parts">Peças</TabsTrigger>}
          {visibleTabs.includes('afs') && <TabsTrigger value="afs">AFs</TabsTrigger>}
          {visibleTabs.includes('invites') && <TabsTrigger value="invites">Convites</TabsTrigger>}
          {visibleTabs.includes('attributes') && (
            <TabsTrigger value="attributes">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4" /> Atributos de Usuário
              </div>
            </TabsTrigger>
          )}
          {visibleTabs.includes('menu') && (
            <TabsTrigger value="menu">
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4" /> Menus & Listas
              </div>
            </TabsTrigger>
          )}
        </TabsList>
        
        {visibleTabs.includes('parts') && (
          <TabsContent value="parts">
            <PartManagementTable />
          </TabsContent>
        )}
        {visibleTabs.includes('afs') && (
          <TabsContent value="afs">
            <AfManagementTable />
          </TabsContent>
        )}
        {visibleTabs.includes('invites') && (
          <TabsContent value="invites">
            <InviteManager />
          </TabsContent>
        )}
        {visibleTabs.includes('attributes') && (
          <TabsContent value="attributes">
            <UserAttributesManager />
          </TabsContent>
        )}
        {visibleTabs.includes('menu') && (
          <TabsContent value="menu">
            <MenuManagerPage isEmbedded={true} />
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-center mt-8 mb-8">
        <Link to={`/${company}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default DatabaseManagerPage;