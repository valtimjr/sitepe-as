import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Frown, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomSignupForm from '@/components/CustomSignupForm';

const SignupPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const checkedUuid = useRef<string | null>(null);

  useEffect(() => {
    document.title = "Cadastro por Convite - AutoBoard";
  }, []);

  useEffect(() => {
    const checkInvite = async () => {
      // Evitar verificações duplicadas se o UUID não mudou
      if (!uuid || checkedUuid.current === uuid) {
        if (!uuid) {
          setIsValidInvite(false);
          setIsLoadingInvite(false);
        }
        return;
      }

      try {
        console.log('[SignupPage] Verificando convite:', uuid);
        setIsLoadingInvite(true);
        
        const { data: isValid, error } = await supabase
          .rpc('check_invite', { invite_code_to_check: uuid });

        if (error) {
          console.error('[SignupPage] Erro na verificação do convite:', error);
          throw error;
        }

        console.log('[SignupPage] Resultado da verificação:', isValid);

        checkedUuid.current = uuid;
        setIsValidInvite(!!isValid);
        
        if (!isValid) {
          showError('Convite inválido ou já utilizado.');
        }
      } catch (error: any) {
        console.error('[SignupPage] Erro capturado:', error);
        setIsValidInvite(false);
        showError(`Erro ao verificar convite: ${error.message}`);
      } finally {
        setIsLoadingInvite(false);
      }
    };

    checkInvite();
  }, [uuid]);

  const handleSignupSuccess = () => {
    setIsRegistered(true);
  };

  if (isLoadingInvite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-lg font-medium animate-pulse">Verificando seu convite...</p>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold text-primary">Cadastro concluído!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Sua conta foi criada com sucesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="p-4 bg-muted rounded-lg flex items-start gap-3 text-left">
                <Mail className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-semibold">Verifique seu e-mail</p>
                  <p className="text-sm text-muted-foreground">
                    Enviamos um link de confirmação para o seu e-mail. Por favor, clique no link para ativar sua conta.
                  </p>
                </div>
              </div>
              
              <Button
                onClick={() => navigate('/login')}
                className="w-full text-lg h-12 shadow-lg hover:shadow-primary/20 transition-all"
              >
                Ir para o Login
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Não recebeu o e-mail? Verifique sua caixa de spam ou lixo eletrônico.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8">
          <MadeWithDyad />
        </div>
      </div>
    );
  }

  if (!isValidInvite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
        <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
          <Frown className="h-10 w-10 text-destructive" />
          Convite Inválido
        </h1>
        <Card className="w-full max-w-md mx-auto border-destructive/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-destructive">Oops!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              O código de convite é inválido, já foi utilizado ou expirou.
              Por favor, solicite um novo convite ao administrador.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
              Voltar para o Login
            </Button>
          </CardContent>
        </Card>
        <div className="mt-8">
          <MadeWithDyad />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Criar sua conta</h1>
          <p className="text-muted-foreground mt-2">Preencha os dados abaixo para começar</p>
        </div>

        <Card className="shadow-xl border-primary/10">
          <CardContent className="pt-6">
            <CustomSignupForm uuid={uuid!} onSuccess={handleSignupSuccess} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default SignupPage;