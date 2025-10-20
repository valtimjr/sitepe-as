import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const SignupPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);

  useEffect(() => {
    document.title = "Cadastro por Convite - Gerenciador de Peças";
  }, []);

  useEffect(() => {
    const checkInvite = async () => {
      if (!uuid) {
        setIsValidInvite(false);
        setIsLoadingInvite(false);
        showError('Código de convite inválido ou ausente.');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('invites')
          .select('id, is_used')
          .eq('invite_code', uuid)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
          throw error;
        }

        if (data && !data.is_used) {
          setIsValidInvite(true);
          showSuccess('Convite válido! Prossiga com o cadastro.');
        } else {
          setIsValidInvite(false);
          showError('Convite inválido ou já utilizado.');
        }
      } catch (error: any) {
        console.error('Erro ao verificar convite:', error);
        setIsValidInvite(false);
        showError(`Erro ao verificar convite: ${error.message}`);
      } finally {
        setIsLoadingInvite(false);
      }
    };

    checkInvite();

    // Listener para marcar o convite como usado após o cadastro
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && isValidInvite) {
        try {
          const { error } = await supabase
            .from('invites')
            .update({ is_used: true, used_by: session.user.id, used_at: new Date().toISOString() })
            .eq('invite_code', uuid);

          if (error) {
            console.error('Erro ao marcar convite como usado:', error);
            showError('Erro ao finalizar o convite. Por favor, contate o suporte.');
          } else {
            console.log('Convite marcado como usado com sucesso.');
          }
        } catch (error) {
          console.error('Erro inesperado ao marcar convite como usado:', error);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [uuid, isValidInvite]);

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Verificando convite...</p>
      </div>
    );
  }

  if (!isValidInvite) {
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
            <CardTitle className="text-2xl text-center text-destructive">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              O código de convite é inválido, já foi utilizado ou não existe.
              Por favor, verifique o link ou entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    );
  }

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
          <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
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
            redirectTo={window.location.origin + '/admin'}
            view="sign_up"
          />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default SignupPage;