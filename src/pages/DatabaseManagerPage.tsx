import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Database, Menu, List as ListIcon } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import InviteManager from '@/components/InviteManager';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

const DatabaseManagerPage: React.FC = () => {
  const { isLoading, checkPageAccess } = useSession();
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

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        Gerenciador de Banco de Dados
      </h1>

      <Tabs defaultValue="parts" className="w-full max-w-6xl">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="parts">Gerenciar Peças</TabsTrigger>
          <TabsTrigger value="afs">Gerenciar AFs</TabsTrigger>
          <TabsTrigger value="invites">Gerenciar Convites</TabsTrigger>
          {canAccessMenuManager && (
            <Link to="/menu-manager" className="w-full">
              <Button variant="ghost" className="w-full h-full py-2 px-4">
                <Menu className="h-4 w-4 mr-2" /> Menus & Listas
              </Button>
            </Link>
          )}
        </TabsList>
        <TabsContent value="parts">
          <PartManagementTable />
        </TabsContent>
        <TabsContent value="afs">
          <AfManagementTable />
        </TabsContent>
        <TabsContent value="invites">
          <InviteManager />
        </TabsContent>
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default DatabaseManagerPage;