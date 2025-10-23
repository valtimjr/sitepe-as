import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Database } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import InviteManager from '@/components/InviteManager'; // Importar o novo componente
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

const DatabaseManagerPage: React.FC = () => {
  const { isLoading } = useSession(); // Obter isLoading do contexto
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

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        Gerenciador de Banco de Dados
      </h1>

      <Tabs defaultValue="parts" className="w-full max-w-6xl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parts">Gerenciar Peças</TabsTrigger>
          <TabsTrigger value="afs">Gerenciar AFs</TabsTrigger>
          <TabsTrigger value="invites">Gerenciar Convites</TabsTrigger>
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