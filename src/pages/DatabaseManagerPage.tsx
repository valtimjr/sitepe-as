import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartManagementTable from '@/components/PartManagementTable';
import AfManagementTable from '@/components/AfManagementTable';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

const DatabaseManagerPage: React.FC = () => {
  const { user, isLoading, profile } = useSession(); // Obter o perfil do contexto
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Gerenciador de Banco de Dados";
  }, []);

  // A verificação de role e redirecionamento agora é feita no SessionContextProvider
  // Este componente só será renderizado se o usuário tiver acesso.

  const handleLogout = async () => {
    try {
      console.log('DatabaseManagerPage: Attempting logout...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      showSuccess('Você foi desconectado com sucesso!');
      console.log('DatabaseManagerPage: Successfully signed out.');
      navigate('/login');
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message}`);
      console.error('DatabaseManagerPage: Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando gerenciador de banco de dados...</p>
      </div>
    );
  }

  // Se o usuário não estiver logado ou não tiver perfil, o SessionContextProvider já redirecionou.
  // Este componente só será renderizado para usuários com acesso.

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
        Gerenciador de Banco de Dados
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

export default DatabaseManagerPage;