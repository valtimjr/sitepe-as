/** @jsxImportSource react */
import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Key } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import ResetPasswordViaEmailForm from '@/components/ResetPasswordViaEmailForm'; // Importar o novo componente

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Redefinir Senha - AutoBoard";
  }, []);

  const handlePasswordReset = () => {
    // Esta função será chamada após a senha ser redefinida com sucesso
    navigate('/'); // Redireciona para a página inicial
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // Se o usuário já estiver logado (por exemplo, se o link de redefinição também o logar),
        // podemos redirecioná-lo para a página inicial ou admin.
        // Por enquanto, vamos apenas logar.
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Key className="h-8 w-8 text-primary" />
        Redefinir Senha
      </h1>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordViaEmailForm onPasswordReset={handlePasswordReset} />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ResetPasswordPage;