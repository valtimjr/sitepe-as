import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Database, Menu, List as ListIcon } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import InviteManager from '@/components/InviteManager';
import MenuManagerPage from '@/pages/MenuManagerPage'; // Importar a página como componente
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { cn } from '@/lib/utils';

const DatabaseManagerPage: React.FC = () => {
  const { isLoading, checkPageAccess, profile } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Gerenciador de Banco de Dados - Gerenciador de Peças";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando gerenciador de banco de dados...</p>
      </div>
    );
  }
  
  const canAccessMenuManager = checkPageAccess('/menu-manager');
  const isAdmin = profile?.role === 'admin';
  
  // Define quais abas serão visíveis
  const visibleTabs = [
    ...(isAdmin ? ['parts', 'afs', 'invites'] : []),
    ...(canAccessMenuManager ? ['menu'] : []),
  ];

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

  // Define o valor padrão da aba para a primeira aba visível
  const defaultTab = visibleTabs[0];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        Gerenciador de Banco de Dados
      </h1>

      <Tabs defaultValue={defaultTab} className="w-full max-w-6xl">
        <TabsList className={cn("grid w-full h-auto mb-4", gridColsClass)}>
          {isAdmin && <TabsTrigger value="parts">Gerenciar Peças</TabsTrigger>}
          {isAdmin && <TabsTrigger value="afs">Gerenciar AFs</TabsTrigger>}
          {isAdmin && <TabsTrigger value="invites">Gerenciar Convites</TabsTrigger>}
          {canAccessMenuManager && (
            <TabsTrigger value="menu">
              <div className="flex items-center justify-center gap-2">
                <Menu className="h-4 w-4" /> Menus & Listas
              </div>
            </TabsTrigger>
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
          <TabsContent value="menu">
            <MenuManagerPage isEmbedded={true} />
          </TabsContent>
        )}
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default DatabaseManagerPage;