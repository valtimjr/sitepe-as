/** @jsxImportSource react */
import React, { useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { LogIn } from 'lucide-react';
import CustomLoginForm from '@/components/CustomLoginForm';
import AppHeader from '@/components/AppHeader';

const Login: React.FC = () => {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login - AutoBoard";
    // Se já estiver logado, redireciona para a home (usina_vale por padrão ou a que estiver no contexto)
    if (session) {
      navigate('/usina_vale');
    }
  }, [session, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
          <LogIn className="h-8 w-8 text-primary" />
          Entrar no AutoBoard
        </h1>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Entrar</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomLoginForm />
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Login;