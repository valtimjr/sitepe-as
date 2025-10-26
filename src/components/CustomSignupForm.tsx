"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from './PasswordInput'; // Importar PasswordInput

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
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
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
          },
          emailRedirectTo: window.location.origin + '/admin', // Redireciona para o admin após a confirmação do e-mail
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        showSuccess('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
        // Marcar o convite como usado imediatamente após o signup, antes da confirmação do email
        // Isso é importante para evitar que o mesmo convite seja usado várias vezes
        await markInviteAsUsed(data.user.id);
        navigate('/login'); // Redireciona para o login para o usuário confirmar o e-mail
      } else if (data.session) {
        // Isso pode acontecer se o email já estiver confirmado ou se for um login direto
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
        showError('Erro ao finalizar o convite. Por favor, contate o suporte.');
      }
    } catch (error) {
      console.error('CustomSignupForm: Erro inesperado ao marcar convite como usado:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="first-name">Nome</Label>
        <Input
          id="first-name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Seu nome"
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
          placeholder="Seu sobrenome"
          required
          disabled={isLoading}
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
        <PasswordInput // Usando PasswordInput
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