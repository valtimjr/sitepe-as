/** @jsxImportSource react */
import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CustomLoginForm from '@/components/CustomLoginForm'; // Importar o novo componente

const Login: React.FC = () => {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login - Gerenciador de Peças";
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando...</p>
      </div>
    );
  }

  // O handleGoHome foi removido, pois o logo no cabeçalho serve para isso.
  // const handleGoHome = () => {
  //   navigate('/');
  // };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      {/* Removido o div com o botão "Voltar ao Início" */}
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomLoginForm /> {/* Usando o formulário de login personalizado */}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default Login;