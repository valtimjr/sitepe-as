"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from './PasswordInput';

interface CustomSignupFormProps {
  uuid: string; // O UUID do convite
}

const CustomSignupForm: React.FC<CustomSignupFormProps> = ({ uuid }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badge, setBadge] = useState('');
  const [profession, setProfession] = useState('');
  const [shift, setShift] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!profession || !shift) {
      showError('Por favor, selecione sua profissão e seu turno.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            badge: badge,
            profession: profession,
            shift: shift,
          },
          emailRedirectTo: window.location.origin + '/admin',
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        showSuccess('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
        await markInviteAsUsed(data.user.id);
        navigate('/login');
      } else if (data.session) {
        showSuccess('Login realizado com sucesso!');
        await markInviteAsUsed(data.session.user.id);
        navigate('/admin');
      }
    } catch (error: any) {
      console.error('Erro de cadastro:', error);
      showError(`Erro ao cadastrar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const markInviteAsUsed = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
        .eq('invite_code', uuid);

      if (error) {
        console.error('CustomSignupForm: Erro ao marcar convite como usado:', error);
      }
    } catch (error) {
      console.error('CustomSignupForm: Erro inesperado ao marcar convite como usado:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first-name">Nome</Label>
          <Input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nome"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="last-name">Sobrenome</Label>
          <Input
            id="last-name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Sobrenome"
            required
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="profession">Profissão</Label>
          <Select value={profession} onValueChange={setProfession} disabled={isLoading} required>
            <SelectTrigger id="profession">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eletricista">Eletricista</SelectItem>
              <SelectItem value="mecanico">Mecânico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="shift">Turno</Label>
          <Select value={shift} onValueChange={setShift} disabled={isLoading} required>
            <SelectTrigger id="shift">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Turno A">Turno A</SelectItem>
              <SelectItem value="Turno B">Turno B</SelectItem>
              <SelectItem value="Turno C">Turno C</SelectItem>
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
          placeholder="Número do crachá"
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Crie sua senha"
          required
          disabled={isLoading}
        />
        {passwordError && (
          <p className="text-sm text-destructive mt-1">{passwordError}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cadastrando...
          </>
        ) : (
          'Criar Conta'
        )}
      </Button>
      <div className="text-center text-sm mt-4">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </div>
    </form>
  );
};

export default CustomSignupForm;