"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from './PasswordInput'; // Importar PasswordInput
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomLoginFormProps {
  onSuccess?: () => void;
}

const CustomLoginForm: React.FC<CustomLoginFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<React.ReactNode | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Tradução de erros comuns do Supabase/Auth para o usuário
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('E-mail ou senha incorretos. Por favor, tente novamente.');
        } else if (error.message.includes('Email not confirmed')) {
          setAuthError(
            <div className="flex flex-col gap-2">
              <p>E-mail ainda não confirmado.</p>
              <Button
                variant="link"
                className="p-0 h-auto text-destructive underline h-auto"
                onClick={async () => {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: email,
                  });
                  if (error) showError(error.message);
                  else showSuccess('E-mail de confirmação reenviado!');
                }}
              >
                Reenviar link de confirmação
              </Button>
            </div>
          );
        } else {
          setAuthError(error.message);
        }
        return;
      }

      showSuccess('Login realizado com sucesso!');
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/usina_vale');
      }
    } catch (error: any) {
      setAuthError('Ocorreu um erro inesperado ao tentar entrar.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {authError && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1 duration-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {authError}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (authError) setAuthError(null);
          }}
          placeholder="seu@email.com"
          required
          disabled={isLoading}
          className={authError ? 'border-destructive focus-visible:ring-destructive' : ''}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            Esqueceu sua senha?
          </Link>
        </div>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (authError) setAuthError(null);
          }}
          placeholder="Sua senha"
          required
          disabled={isLoading}
          className={authError ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked === true)}
        />
        <label
          htmlFor="remember"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Lembrar de mim
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  );
};

export default CustomLoginForm;