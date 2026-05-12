"use client";

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Loader2, ChevronLeft, User as UserIcon } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCompany } from '@/context/CompanyContext';

type AttributeItem = { name: string; ref_code: number | null };

const UserSettingsPage: React.FC = () => {
  const { user, isLoading: isSessionLoading, profile: sessionProfile, refreshProfile } = useSession();
  const { company, branding } = useCompany();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badge, setBadge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [professionCode, setProfessionCode] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  
  const [availableProfessions, setAvailableProfessions] = useState<AttributeItem[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AttributeItem[]>([]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    document.title = `Configurações do Usuário - AutoBoard (${branding.name})`;
  }, [branding.name]);

  useEffect(() => {
    if (!isSessionLoading && sessionProfile) {
      setFirstName(sessionProfile.first_name || '');
      setLastName(sessionProfile.last_name || '');
      setBadge(sessionProfile.badge || '');
      setAvatarUrl(sessionProfile.avatar_url || '');
      setProfessionCode(sessionProfile.profession_code ? sessionProfile.profession_code.toString() : '');
      setShiftCode(sessionProfile.shift_code ? sessionProfile.shift_code.toString() : '');
    }
  }, [sessionProfile, isSessionLoading]);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const [profRes, shiftRes] = await Promise.all([
          supabase.from('professions').select('name, ref_code').eq('company', company).order('name'),
          supabase.from('shifts').select('name, ref_code').eq('company', company).order('name')
        ]);
        
        if (profRes.data && profRes.data.length > 0) setAvailableProfessions(profRes.data);
        if (shiftRes.data && shiftRes.data.length > 0) setAvailableShifts(shiftRes.data);
      } catch (e) {
        console.error('Error fetching attributes:', e);
      }
    };
    if (user) fetchAttributes();
  }, [company, user]);

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
          profession_code: professionCode ? parseInt(professionCode) : null,
          shift_code: shiftCode ? parseInt(shiftCode) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      showSuccess('Perfil atualizado com sucesso!');
    } catch (error: any) {
      showError(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Carregando configurações do usuário...</p>
      </div>
    );
  }

  if (!user) return null;

  const getInitials = (fName: string | null, lName: string | null) => {
    const first = fName ? fName.charAt(0) : '';
    const last = lName ? lName.charAt(0) : '';
    return (first + last).toUpperCase() || <UserIcon className="h-6 w-6" />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <img src="/icons/tela_inicial/11.png" alt="" className="h-16 w-auto object-contain" />
          Configurações do Usuário
        </div>
        <span className="text-2xl font-bold opacity-80">{branding.name}</span>
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
                  <Avatar className="h-24 w-24 rounded-full">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-name">Nome</Label>
                    <Input
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
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
                      required
                      disabled={isSavingProfile}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profissão</Label>
                    <Select 
                      key={`prof-${professionCode}`} 
                      value={professionCode || undefined} 
                      onValueChange={setProfessionCode} 
                      disabled={isSavingProfile}
                    >
                      <SelectTrigger id="profession">
                        <SelectValue placeholder="Selecione sua profissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfessions.map(p => (
                          <SelectItem key={p.ref_code} value={p.ref_code!.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift">Turno</Label>
                    <Select 
                      key={`shift-${shiftCode}`}
                      value={shiftCode || undefined} 
                      onValueChange={setShiftCode} 
                      disabled={isSavingProfile}
                    >
                      <SelectTrigger id="shift">
                        <SelectValue placeholder="Selecione seu turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableShifts.map(s => (
                          <SelectItem key={s.ref_code} value={s.ref_code!.toString()}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="badge">Crachá (Opcional)</Label>
                  <Input
                    id="badge"
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    disabled={isSavingProfile}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>
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
              <ChangePasswordForm onPasswordChanged={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center mt-8 mb-8">
        <Link to={`/${company}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default UserSettingsPage;