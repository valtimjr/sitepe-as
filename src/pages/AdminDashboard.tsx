import React, { useEffect, useState } from 'react';
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

const AdminDashboard: React.FC = () => {
  const { user, isLoading } = useSession();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    document.title = "Admin - Gerenciador de Peças";
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        setIsRoleLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('AdminDashboard: Error fetching user role:', error);
            showError('Erro ao carregar seu perfil. Por favor, tente novamente.');
            setUserRole(null);
          } else if (data) {
            setUserRole(data.role);
            if (data.role !== 'admin') {
              showError('Você não tem permissão para acessar esta página.');
              navigate('/'); // Redireciona para a página inicial se não for admin
            }
          } else {
            // Perfil não encontrado, pode ser um usuário recém-criado sem perfil ainda
            console.warn('AdminDashboard: User profile not found for role check.');
            showError('Seu perfil não foi encontrado. Redirecionando para o início.');
            navigate('/');
          }
        } catch (error) {
          console.error('AdminDashboard: Unexpected error fetching user role:', error);
          showError('Ocorreu um erro inesperado ao verificar suas permissões.');
          navigate('/');
        } finally {
          setIsRoleLoading(false);
        }
      } else if (!isLoading) {
        // Se não há usuário e não está carregando, significa que não está autenticado
        navigate('/login');
      }
    };

    fetchUserRole();
  }, [user, isLoading, navigate]);

  const handleLogout = async () => {
    try {
      console.log('AdminDashboard: Attempting logout...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      showSuccess('Você foi desconectado com sucesso!');
      console.log('AdminDashboard: Successfully signed out.');
      navigate('/login'); // Redireciona para o login após o logout
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message}`);
      console.error('AdminDashboard: Logout error:', error);
    }
  };

  if (isLoading || isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando painel de administração...</p>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    // Redirecionamento já é tratado no useEffect
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