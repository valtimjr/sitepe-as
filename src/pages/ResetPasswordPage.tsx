import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Redefinir Senha - Gerenciador de Peças";
  }, []);

  const handleGoHome = () => {
    navigate('/');
  };

  // Listener para redirecionar após a atualização da senha
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_UPDATED') {
        showSuccess('Sua senha foi atualizada com sucesso! Você será redirecionado para o login.');
        navigate('/login'); // Redireciona para a página de login após a atualização
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md flex justify-start mb-4">
        <Button variant="outline" className="flex items-center gap-2" onClick={handleGoHome}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao Início
        </Button>
      </div>
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--accent))',
                    inputBackground: 'hsl(var(--input))',
                    inputBorder: 'hsl(var(--border))',
                    inputBorderHover: 'hsl(var(--ring))',
                    inputBorderFocus: 'hsl(var(--ring))',
                    inputText: 'hsl(var(--foreground))',
                    defaultButtonBackground: 'hsl(var(--primary))',
                    defaultButtonBackgroundHover: 'hsl(var(--primary-foreground))',
                    defaultButtonBorder: 'hsl(var(--primary))',
                    defaultButtonText: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light"
            view="update_password" // Define a visualização para atualização de senha
            redirectTo={window.location.origin + '/login'} // Redireciona para login após a atualização
          />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ResetPasswordPage;