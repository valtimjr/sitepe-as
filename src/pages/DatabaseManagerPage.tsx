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
  
  // Define as classes de coluna: 
  // Se 4 itens: 2 colunas em mobile, 4 em telas médias e maiores.
  // Se 3 itens: 3 colunas em todas as telas.
  const totalTabs = 3 + (canAccessMenuManager ? 1 : 0);
  const gridColsClass = totalTabs === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3';

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        Gerenciador de Banco de Dados
      </h1>

      <Tabs defaultValue="parts" className="w-full max-w-6xl">
        <TabsList className={cn("grid w-full h-auto mb-4", gridColsClass)}>
          <TabsTrigger value="parts" disabled={!isAdmin}>Gerenciar Peças</TabsTrigger>
          <TabsTrigger value="afs" disabled={!isAdmin}>Gerenciar AFs</TabsTrigger>
          <TabsTrigger value="invites" disabled={!isAdmin}>Gerenciar Convites</TabsTrigger>
          {canAccessMenuManager && (
            <TabsTrigger value="menu">
              <div className="flex items-center justify-center gap-2">
                <Menu className="h-4 w-4" /> Menus & Listas
              </div>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="parts">
          {isAdmin ? <PartManagementTable /> : <p className="text-center text-destructive py-8">Acesso restrito a administradores.</p>}
        </TabsContent>
        <TabsContent value="afs">
          {isAdmin ? <AfManagementTable /> : <p className="text-center text-destructive py-8">Acesso restrito a administradores.</p>}
        </TabsContent>
        <TabsContent value="invites">
          {isAdmin ? <InviteManager /> : <p className="text-center text-destructive py-8">Acesso restrito a administradores.</p>}
        </TabsContent>
        {canAccessMenuManager && (
          <TabsContent value="menu">
            {/* Renderiza o MenuManagerPage diretamente aqui */}
            <MenuManagerPage isEmbedded={true} />
          </TabsContent>
        )}
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default DatabaseManagerPage;