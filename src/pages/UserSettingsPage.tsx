import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, User as UserIcon, Loader2 } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import ChangePasswordForm from '@/components/ChangePasswordForm'; // Importar o novo componente
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/types/supabase'; // Importar o tipo UserProfile

const UserSettingsPage: React.FC = () => {
  const { user, isLoading: isSessionLoading, profile: sessionProfile } = useSession(); // Renomeado profile para sessionProfile para evitar conflito
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
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
    console.log('UserSettingsPage: fetchUserProfile called. Current user:', user, 'isSessionLoading:', isSessionLoading);
    if (!user) {
      console.warn('UserSettingsPage: No user found in session, redirecting to login.');
      setIsProfileLoading(false);
      navigate('/login');
      return;
    }
    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, badge, avatar_url, role, id, updated_at')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('UserSettingsPage: Error fetching user profile from DB:', error);
        throw error;
      }

      if (data) {
        setProfileData(data as UserProfile);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setBadge(data.badge || '');
        setAvatarUrl(data.avatar_url || '');
        console.log('UserSettingsPage: User profile data loaded:', data);
      } else {
        console.log('UserSettingsPage: No profile found for user, initializing with empty values.');
        setProfileData(null);
        setFirstName('');
        setLastName('');
        setBadge('');
        setAvatarUrl('');
      }
    } catch (error: any) {
      console.error('UserSettingsPage: Error loading user profile (catch block):', error);
      showError(`Erro ao carregar perfil: ${error.message}`);
    } finally {
      setIsProfileLoading(false);
      console.log('UserSettingsPage: Profile loading finished. isProfileLoading set to false.');
    }
  }, [user, navigate, isSessionLoading]); // Adicionado isSessionLoading como dependência para clareza

  useEffect(() => {
    console.log('UserSettingsPage: Main useEffect triggered. isSessionLoading:', isSessionLoading, 'user:', user);
    if (!isSessionLoading) {
      fetchUserProfile();
    }
  }, [isSessionLoading, fetchUserProfile, user]); // Adicionado user como dependência

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
      await fetchUserProfile(); // Recarrega o perfil para garantir que os dados estejam sincronizados
    } catch (error: any) {
      console.error('UserSettingsPage: Error updating profile:', error);
      showError(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChanged = () => {
    console.log('UserSettingsPage: Password changed callback triggered.');
    fetchUserProfile();
  };

  if (isSessionLoading || isProfileLoading) {
    console.log('UserSettingsPage: Displaying loading state. isSessionLoading:', isSessionLoading, 'isProfileLoading:', isProfileLoading);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando configurações do usuário...</p>
      </div>
    );
  }

  if (!user) {
    console.log('UserSettingsPage: No user, returning null (redirection expected from SessionContextProvider).');
    return null;
  }

  const getInitials = (fName: string | null, lName: string | null) => {
    const first = fName ? fName.charAt(0) : '';
    const last = lName ? lName.charAt(0) : '';
    return (first + last).toUpperCase() || <UserIcon className="h-6 w-6" />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
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
              <ChangePasswordForm onPasswordChanged={handlePasswordChanged} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default UserSettingsPage;