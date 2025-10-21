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
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/types/supabase';

const UserSettingsPage: React.FC = () => {
  const { user, isLoading: isSessionLoading, profile: sessionProfile } = useSession();
  const navigate = useNavigate();
  
  // States for form fields, initialized from sessionProfile or empty
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badge, setBadge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    document.title = "Configurações do Usuário - Gerenciador de Peças";
  }, []);

  // Populate form fields when sessionProfile changes or becomes available
  useEffect(() => {
    console.log('UserSettingsPage: Populating form fields. sessionProfile:', sessionProfile, 'isSessionLoading:', isSessionLoading);
    if (!isSessionLoading && sessionProfile) {
      setFirstName(sessionProfile.first_name || '');
      setLastName(sessionProfile.last_name || '');
      setBadge(sessionProfile.badge || '');
      setAvatarUrl(sessionProfile.avatar_url || '');
      console.log('UserSettingsPage: Form fields populated from sessionProfile.');
    } else if (!isSessionLoading && !sessionProfile && user) {
      // If user is logged in but no profile found, initialize with empty values
      console.log('UserSettingsPage: User logged in but no profile found, initializing empty form fields.');
      setFirstName('');
      setLastName('');
      setBadge('');
      setAvatarUrl('');
    }
  }, [sessionProfile, isSessionLoading, user]);

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
      // No need to call fetchUserProfile here, SessionContextProvider's onAuthStateChange will handle it
      // or a manual refresh of the profile in context could be triggered if needed.
      // For now, relying on the context to update.
    } catch (error: any) {
      console.error('UserSettingsPage: Error updating profile:', error);
      showError(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChanged = () => {
    console.log('UserSettingsPage: Password changed callback triggered.');
    // No need to fetch profile here, as password change doesn't affect profile data directly.
    // If profile data was affected, SessionContextProvider would handle it.
  };

  // The main loading state for the page
  if (isSessionLoading) {
    console.log('UserSettingsPage: Displaying loading state. isSessionLoading:', isSessionLoading);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando configurações do usuário...</p>
      </div>
    );
  }

  // If not loading and no user, redirect to login (handled by SessionContextProvider, but good to have a fallback)
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