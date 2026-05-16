/** @jsxImportSource react */
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Key, Loader2, CheckCircle2, AlertCircle, LogIn, ArrowRight } from 'lucide-react';
import { showError } from '@/utils/toast';
import ResetPasswordViaEmailForm from '@/components/ResetPasswordViaEmailForm';
import LoginModal from '@/components/LoginModal';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'ready' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const verificationStarted = useRef(false);

  useEffect(() => {
    console.log('[ResetPasswordPage] RENDERING - Status:', status);
  }, [status]);

  useEffect(() => {
    document.title = "Redefinir Senha - AutoBoard";
    handleTokenVerification();
  }, []);

  const handleTokenVerification = async () => {
    if (verificationStarted.current) {
      console.log('[ResetPasswordPage] handleTokenVerification skipped (already started)');
      return;
    }
    verificationStarted.current = true;
    console.log('[ResetPasswordPage] START handleTokenVerification');

    const tokenHash = searchParams.get('token');
    
    if (!tokenHash) {
      console.log('[ResetPasswordPage] No token in URL, checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[ResetPasswordPage] Session found -> ready');
        setStatus('ready');
      } else {
        console.log('[ResetPasswordPage] No session, no token -> error');
        setStatus('error');
        setErrorMessage('Link de redefinição inválido ou expirado.');
      }
      return;
    }

    try {
      console.log('[ResetPasswordPage] CALL verifyOtp with hash');
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (error) {
        console.error('[ResetPasswordPage] verifyOtp Error:', error);
        throw error;
      }

      console.log('[ResetPasswordPage] verifyOtp Success -> ready');
      setStatus('ready');
    } catch (error: any) {
      console.error('[ResetPasswordPage] Verification Catch:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Não foi possível validar seu link de redefinição.');
    }
  };

  const handlePasswordResetSuccess = () => {
    console.log('[ResetPasswordPage] CALLBACK handlePasswordResetSuccess triggered');
    setStatus('success');
  };

  const handleLoginSuccess = () => {
    console.log('[ResetPasswordPage] handleLoginSuccess -> redirecting home');
    setIsLoginModalOpen(false);
    navigate('/usina_vale');
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Validando link de recuperação...</h1>
          <p className="text-muted-foreground">Por favor, aguarde um instante.</p>
        </div>
        <div className="mt-12">
          <MadeWithDyad />
        </div>
      </div>
    );
  }

  if (status === 'success') {
    console.log('[ResetPasswordPage] Rendering SUCCESS state UI');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-green-50 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-primary">Senha Redefinida!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Sua nova senha foi salva com sucesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Tudo pronto! Agora você pode acessar sua conta com as novas credenciais.
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

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="w-full max-w-md animate-in fade-in duration-500">
          <Card className="border-destructive/20 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">Link Inválido</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                {errorMessage || 'O link de recuperação parece ser inválido ou já expirou.'}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/forgot-password')}
                className="w-full"
              >
                Solicitar novo link
              </Button>
            </CardContent>
          </Card>
        </div>
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
            <Key className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Senha</h1>
          <p className="text-muted-foreground mt-2">Crie uma senha forte e segura para sua conta.</p>
        </div>

        <Card className="shadow-xl border-primary/10">
          <CardContent className="pt-6">
            <ResetPasswordViaEmailForm onPasswordReset={handlePasswordResetSuccess} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ResetPasswordPage;