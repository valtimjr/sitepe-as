import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Database, Menu, List as ListIcon, ChevronLeft, Tags } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import InviteManager from '@/components/InviteManager';
import MenuManagerPage from '@/pages/MenuManagerPage';
import UserAttributesManager from '@/components/UserAttributesManager';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/CompanyContext';

const DATABASE_MANAGER_ACTIVE_TAB_KEY = 'database_manager_active_tab';

const DatabaseManagerPage: React.FC = () => {
  const { isLoading, checkPageAccess, profile } = useSession();
  const { company, branding } = useCompany();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    document.title = `Gerenciador de Banco de Dados - AutoBoard (${branding.name})`;
  }, [branding.name]);

  const { visibleTabs, defaultTab } = useMemo(() => {
    if (isLoading) {
      return { visibleTabs: [], defaultTab: '' };
    }
    const isAdmin = profile?.role === 'admin';
    const canAccessMenuManager = checkPageAccess('/menu-manager');
    const tabs = [
      ...(isAdmin ? ['parts', 'afs', 'invites', 'attributes'] : []),
      ...(canAccessMenuManager ? ['menu'] : []),
    ];
    return { visibleTabs: tabs, defaultTab: tabs[0] || '' };
  }, [isLoading, profile, checkPageAccess]);

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
        <p>Carregando gerenciador de banco de dados...</p>
      </div>
    );
  }
  
  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          Gerenciador de Banco de Dados
        </div>
        <span className="text-2xl font-bold opacity-80">{branding.name}</span>
      </h1>

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