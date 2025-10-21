import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, User as UserIcon } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import UpdatePasswordForm from '@/components/UpdatePasswordForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  badge: string | null;
  avatar_url: string | null;
}

const UserSettingsPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badge, setBadge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    document.title = "Configurações do Usuário - Gerenciador de Peças";
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, badge, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
        throw error;
      }

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setBadge(data.badge || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        // Se o perfil não existir, inicializa com valores vazios
        setProfile({ first_name: '', last_name: '', badge: '', avatar_url: '' });
        setFirstName('');
        setLastName('');
        setBadge('');
        setAvatarUrl('');
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil do usuário:', error);
      showError(`Erro ao carregar perfil: ${error.message}`);
    } finally {
      setIsProfileLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!isSessionLoading) {
      fetchUserProfile();
    }
  }, [isSessionLoading, fetchUserProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showError('Usuário não autenticado.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          badge: badge,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      showSuccess('Perfil atualizado com sucesso!');
      fetchUserProfile(); // Recarrega o perfil para garantir que os dados estejam sincronizados
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      showError(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdated = () => {
    showSuccess('Senha atualizada com sucesso!');
    // Não é necessário redirecionar, o usuário permanece na página de configurações
  };

  if (isSessionLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando configurações do usuário...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecionamento já é tratado no useEffect
  }

  const getInitials = (fName: string | null, lName: string | null) => {
    const first = fName ? fName.charAt(0) : '';
    const last = lName ? lName.charAt(0) : '';
    return (first + last).toUpperCase() || <UserIcon className="h-6 w-6" />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-2xl flex justify-start mb-4">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary">
        Configurações do Usuário
      </h1>

      <Tabs defaultValue="profile" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="password">Alterar Senha</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Editar Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || undefined} alt="Avatar do Usuário" />
                    <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="w-full">
                    <Label htmlFor="avatar-url">URL do Avatar (Opcional)</Label>
                    <Input
                      id="avatar-url"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://exemplo.com/avatar.jpg"
                      disabled={isSavingProfile}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="first-name">Nome</Label>
                  <Input
                    id="first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    disabled={isSavingProfile}
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Sobrenome</Label>
                  <Input
                    id="last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Seu sobrenome"
                    required
                    disabled={isSavingProfile}
                  />
                </div>
                <div>
                  <Label htmlFor="badge">Crachá (Opcional)</Label>
                  <Input
                    id="badge"
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Número do crachá"
                    disabled={isSavingProfile}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent>
              <UpdatePasswordForm onPasswordUpdated={handlePasswordUpdated} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default UserSettingsPage;