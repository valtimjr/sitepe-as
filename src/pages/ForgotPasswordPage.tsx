/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Lock, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Esqueceu a Senha - AutoBoard";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
      showSuccess('Link de redefinição enviado!');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setError(error.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Card className="border-2 border-primary/20 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold text-primary">Verifique seu e-mail</CardTitle>
              <CardDescription className="text-lg mt-2">
                Enviamos instruções de recuperação para:
              </CardDescription>
              <p className="font-semibold text-foreground mt-1">{email}</p>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground text-left">
                <p className="mb-2 font-medium text-foreground">Próximos passos:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Acesse sua caixa de entrada</li>
                  <li>Clique no link de redefinição enviado</li>
                  <li>Crie sua nova senha segura</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSent(false)} 
                  className="w-full"
                >
                  Tentar outro e-mail
                </Button>
                <Link to="/login" className="block">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Login
                  </Button>
                </Link>
              </div>
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
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Recuperar Senha</h1>
          <p className="text-muted-foreground mt-2">Não se preocupe, vamos te ajudar a voltar.</p>
        </div>

        <Card className="shadow-xl border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl">Esqueceu sua senha?</CardTitle>
            <CardDescription>
              Insira o e-mail associado à sua conta para receber o link de redefinição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-11 text-lg shadow-lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Redefinição'
                )}
              </Button>
              <Link to="/login" className="block text-center">
                <Button variant="ghost" className="w-full font-normal">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Lembrei minha senha
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;