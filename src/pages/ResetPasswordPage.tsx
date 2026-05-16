/** @jsxImportSource react */
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Key, Loader2, CheckCircle2, AlertCircle, LogIn, ArrowRight } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import ResetPasswordViaEmailForm from '@/components/ResetPasswordViaEmailForm';
import LoginModal from '@/components/LoginModal';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Estados da página
  const [status, setStatus] = useState<'verifying' | 'ready' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const verificationStarted = useRef(false);

  // Monitor de debug no console
  useEffect(() => {
    console.log(`[ResetPassword] Mudança de estado visual: ${status}`);
    if (status === 'success') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [status]);

  useEffect(() => {
    document.title = "Redefinir Senha - AutoBoard";
    handleTokenVerification();
  }, []);

  const handleTokenVerification = async () => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const tokenHash = searchParams.get('token');
    console.log('[ResetPassword] Verificando validade do link...');
    
    if (!tokenHash) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('ready');
      } else {
        setStatus('error');
        setErrorMessage('Link de redefinição inválido ou expirado.');
      }
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (error) throw error;
      setStatus('ready');
    } catch (error: any) {
      console.error('[ResetPassword] Erro na verificação:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Não foi possível validar seu link de redefinição.');
    }
  };

  const handlePasswordResetSuccess = () => {
    console.log('[ResetPassword] Sucesso recebido do formulário! Trocando para SUCCESS UI.');
    showSuccess('Senha redefinida com sucesso!');
    setStatus('success');
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/usina_vale');
  };

  // Renderização condicional baseada no status
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      
      {/* 1. ESTADO: VERIFICANDO TOKEN */}
      {status === 'verifying' && (
        <div className="text-center animate-pulse">
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Validando acesso...</h1>
          <p className="text-muted-foreground">Isso levará apenas um segundo.</p>
        </div>
      )}

      {/* 2. ESTADO: SUCESSO (SENHA ALTERADA) */}
      {status === 'success' && (
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
          <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden bg-card">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-green-50 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-3xl font-extrabold text-primary">Tudo Pronto!</CardTitle>
              <CardDescription className="text-lg font-medium mt-2">
                Sua senha foi redefinida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Agora você já pode acessar sua conta com as novas credenciais que acabou de criar.
              </p>

              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full text-lg h-14 shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="h-5 w-5" />
                Entrar no Sistema
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. ESTADO: PRONTO PARA REDEFINIR (FORMULÁRIO) */}
      {status === 'ready' && (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
              <Key className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Senha</h1>
            <p className="text-muted-foreground mt-2">Crie uma nova senha de acesso.</p>
          </div>

          <Card className="shadow-2xl border-primary/10 bg-card">
            <CardContent className="pt-6">
              <ResetPasswordViaEmailForm onPasswordReset={handlePasswordResetSuccess} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. ESTADO: ERRO (LINK INVÁLIDO) */}
      {status === 'error' && (
        <div className="w-full max-w-md animate-in fade-in duration-500">
          <Card className="border-destructive/20 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive font-bold">Link Expirado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                {errorMessage || 'O link de recuperação não é mais válido.'}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/forgot-password')}
                className="w-full h-12"
              >
                Solicitar novo e-mail
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-12 opacity-80">
        <MadeWithDyad />
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onOpenChange={(open) => setIsLoginModalOpen(open)} 
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default ResetPasswordPage;