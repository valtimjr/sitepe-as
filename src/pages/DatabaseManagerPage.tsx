import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Database, Menu, List as ListIcon } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import InviteManager from '@/components/InviteManager';
import MenuManagerPage from '@/pages/MenuManagerPage'; // Importar a página como componente
import CustomListManager from '@/components/CustomListManager'; // Importar CustomListManager
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { cn } from '@/lib/utils';

const DATABASE_MANAGER_ACTIVE_TAB_KEY = 'database_manager_active_tab';

const DatabaseManagerPage: React.FC = () => {
  const { isLoading, checkPageAccess, profile } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Gerenciador de Banco de Dados - Gerenciador de Peças";
  }, []);

  const canAccessMenuManager = checkPageAccess('/menu-manager');
  const isAdmin = profile?.role === 'admin';
  
  // Define quais abas serão visíveis
  const visibleTabs = [
    ...(isAdmin ? ['parts', 'afs', 'invites'] : []),
    ...(canAccessMenuManager ? ['menu', 'custom-lists'] : []), // Adicionado 'custom-lists'
  ];

  // Define o valor padrão da aba para a primeira aba visível
  const defaultTab = visibleTabs[0];

  // Estado para a aba ativa, lendo do localStorage ou usando o padrão
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedTab = localStorage.getItem(DATABASE_MANAGER_ACTIVE_TAB_KEY);
    // Verifica se a aba salva é uma das abas visíveis para o usuário atual
    if (savedTab && visibleTabs.includes(savedTab)) {
      return savedTab;
    }
    return defaultTab;
  });

  // Atualiza a aba ativa se as ababas visíveis mudarem (ex: mudança de perfil)
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(defaultTab);
      localStorage.setItem(DATABASE_MANAGER_ACTIVE_TAB_KEY, defaultTab);
    }
  }, [visibleTabs, activeTab, defaultTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando gerenciador de banco de dados...</p>
      </div>
    );
  }
  
  // Se não houver abas visíveis, o usuário não deveria estar aqui (mas o SessionContextProvider já lida com o redirecionamento)
  if (visibleTabs.length === 0) {
    return null;
  }

  // Define as classes de coluna dinamicamente
  const totalVisibleTabs = visibleTabs.length;
  const gridColsClass = totalVisibleTabs === 4 ? 'grid-cols-2 md:grid-cols-4' : 
                        totalVisibleTabs === 3 ? 'grid-cols-3' : 
                        totalVisibleTabs === 2 ? 'grid-cols-2' : 
                        'grid-cols-1';

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        Gerenciador de Banco de Dados
      </h1>

      <Tabs 
        value={activeTab} 
        onValueChange={(tab) => {
          setActiveTab(tab);
          localStorage.setItem(DATABASE_MANAGER_ACTIVE_TAB_KEY, tab);
        }} 
        className="w-full max-w-6xl"
      >
        <TabsList className={cn("grid w-full h-auto mb-4", gridColsClass)}>
          {isAdmin && <TabsTrigger value="parts">Gerenciar Peças</TabsTrigger>}
          {isAdmin && <TabsTrigger value="afs">Gerenciar AFs</TabsTrigger>}
          {isAdmin && <TabsTrigger value="invites">Gerenciar Convites</TabsTrigger>}
          {canAccessMenuManager && (
            <>
              <TabsTrigger value="menu">
                <div className="flex items-center justify-center gap-2">
                  <Menu className="h-4 w-4" /> Menus
                </div>
              </TabsTrigger>
              <TabsTrigger value="custom-lists">
                <div className="flex items-center justify-center gap-2">
                  <ListIcon className="h-4 w-4" /> Listas
                </div>
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        {isAdmin && (
          <>
            <TabsContent value="parts">
              <PartManagementTable />
            </TabsContent>
            <TabsContent value="afs">
              <AfManagementTable />
            </TabsContent>
            <TabsContent value="invites">
              <InviteManager />
            </TabsContent>
          </>
        )}

        {canAccessMenuManager && (
          <>
            <TabsContent value="menu">
              <MenuManagerPage isEmbedded={true} />
            </TabsContent>
            <TabsContent value="custom-lists"> {/* Conteúdo correto para Listas Personalizadas */}
              <CustomListManager />
            </TabsContent>
          </>
        )}
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default DatabaseManagerPage;