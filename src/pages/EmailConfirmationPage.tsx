import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, LogIn } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import LoginModal from '@/components/LoginModal';

const EmailConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'Confirmando E-mail - AutoBoard';
    confirmEmail();
  }, []);

  const confirmEmail = async () => {
    try {
      setStatus('loading');
      
      // O Supabase envia o token hash na URL conforme configurado: {{ .TokenHash }}
      const tokenHash = searchParams.get('token');
      
      // Se não houver token na URL, tentamos ver se o Supabase já processou via hash (#)
      if (!tokenHash) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setStatus('success');
          return;
        }
        throw new Error('Link de confirmação inválido ou token ausente.');
      }

      // Verificando o token hash usando a API do Supabase
      // O tipo para confirmação de cadastro é 'signup'
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup',
      });

      if (error) {
        throw error;
      }

      setStatus('success');
    } catch (error: any) {
      console.error('[EmailConfirmation] Erro:', error);
      setErrorMessage(error.message || 'Erro ao confirmar o e-mail.');
      setStatus('error');
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/usina_vale'); // Redireciona para a home após login
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Verificando confirmação...</h1>
          <p className="text-muted-foreground">Por favor, aguarde enquanto validamos seu cadastro.</p>
        </div>
        <div className="mt-12">
          <MadeWithDyad />
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-green-50 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-primary">E-mail Confirmado!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Sua conta foi ativada com sucesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Agora você já pode acessar a plataforma AutoBoard e utilizar todos os recursos disponíveis.
              </p>

              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full text-lg h-12 shadow-lg hover:shadow-primary/20 transition-all group"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Entrar na Conta
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8">
          <MadeWithDyad />
        </div>

        <LoginModal
          isOpen={isLoginModalOpen}
          onOpenChange={(open) => setIsLoginModalOpen(open)}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        <Card className="border-destructive/20 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Erro na Validação</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {errorMessage || 'O link de confirmação parece ser inválido ou já expirou.'}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default EmailConfirmationPage;