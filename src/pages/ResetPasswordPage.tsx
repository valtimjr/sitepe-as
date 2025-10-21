/** @jsxImportSource react */
import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import UpdatePasswordForm from '@/components/UpdatePasswordForm'; // Importar o novo componente

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Redefinir Senha - Gerenciador de Peças";
  }, []);

  // O handleGoHome foi removido, pois o logo no cabeçalho serve para isso.
  // const handleGoHome = () => {
  //   navigate('/');
  // };

  const handlePasswordUpdated = () => {
    // Esta função será chamada após a senha ser atualizada com sucesso
    navigate('/login'); // Redireciona para a página de login
  };

  // O listener de authStateChange para PASSWORD_UPDATED não é mais necessário aqui,
  // pois o redirecionamento é tratado pelo `onPasswordUpdated` do formulário personalizado.
  // No entanto, manteremos o listener para outros eventos se necessário, mas o foco principal
  // de redirecionamento após a atualização da senha será via `onPasswordUpdated`.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      // Se houver outros eventos que você queira tratar aqui, pode adicioná-los.
      // Por exemplo, se o usuário já estiver logado e tentar acessar esta página,
      // você pode redirecioná-lo para o painel.
      if (event === 'SIGNED_IN') {
        // navigate('/admin'); // Exemplo: redirecionar se já estiver logado
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      {/* Removido o div com o botão "Voltar ao Início" */}
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm onPasswordUpdated={handlePasswordUpdated} />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ResetPasswordPage;