import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Frown } from 'lucide-react';
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
        const { data, error } = await supabase.rpc('check_invite', {
          invite_code_to_check: uuid,
        });

        if (error) {
          throw error;
        }

        if (data === true) {
          setIsValidInvite(true);
          showSuccess('Convite válido! Prossiga com o cadastro.');
        } else {
          setIsValidInvite(false);
          showError('Convite inválido ou já utilizado.');
        }
      } catch (error: any) {
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
        <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
          <Frown className="h-8 w-8 text-destructive" />
          Cadastro por Convite
        </h1>
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
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <UserPlus className="h-8 w-8 text-primary" />
        Criar Conta
      </h1>
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