import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

const AdminDashboard: React.FC = () => {
  const { user, isLoading } = useSession();

  useEffect(() => {
    document.title = "Admin - Gerenciador de Peças";
  }, []);

  const handleLogout = async () => {
    try {
      console.log('AdminDashboard: Attempting logout...');
      const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
      
      if (getSessionError) {
        console.error('AdminDashboard: Erro ao obter sessão antes do logout:', getSessionError);
        // Continua com o logout mesmo com erro ao obter a sessão, para tentar limpar o armazenamento local.
      }
      console.log('AdminDashboard: Current session before signOut:', currentSession);

      if (!currentSession) {
        await supabase.auth.signOut(); // Ainda chama para limpar qualquer resíduo
        showSuccess('Você já estava desconectado. Limpando dados locais.');
        console.log('AdminDashboard: No active session found, performed cleanup.');
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      showSuccess('Você foi desconectado com sucesso!');
      console.log('AdminDashboard: Successfully signed out.');
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message}`);
      console.error('AdminDashboard: Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando painel de administração...</p>
      </div>
    );
  }

  if (!user) {
    // Redirecionamento é tratado pelo SessionContextProvider
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
        <Button variant="destructive" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary">
        Painel de Administração
      </h1>

      <Tabs defaultValue="parts" className="w-full max-w-6xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="parts">Gerenciar Peças</TabsTrigger>
          <TabsTrigger value="afs">Gerenciar AFs</TabsTrigger>
        </TabsList>
        <TabsContent value="parts">
          <PartManagementTable />
        </TabsContent>
        <TabsContent value="afs">
          <AfManagementTable />
        </TabsContent>
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;