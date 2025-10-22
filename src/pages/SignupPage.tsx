import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomSignupForm from '@/components/CustomSignupForm'; // Importar o novo componente

const SignupPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);

  useEffect(() => {
    document.title = "Cadastro por Convite - AutoBoard";
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

    // O listener de authStateChange para marcar o convite como usado foi movido para CustomSignupForm
    // para garantir que seja chamado no momento certo do processo de signup.
    // Este useEffect agora apenas verifica a validade do convite.
  }, [uuid]);

  // O handleGoHome foi removido, pois o logo no cabeçalho serve para isso.
  // const handleGoHome = () => {
  //   navigate('/');
  // };

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
        {/* Removido o div com o botão "Voltar ao Início" */}
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
      {/* Removido o div com o botão "Voltar ao Início" */}
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomSignupForm uuid={uuid} />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default SignupPage;