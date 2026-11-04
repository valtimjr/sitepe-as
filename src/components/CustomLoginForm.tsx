"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from './PasswordInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import type { User } from '@supabase/supabase-js';
import { signInWithIdentifier } from '@/services/authService';

interface CustomLoginFormProps {
  onSuccess?: (user: User) => void;
}

const INVALID_MESSAGE = 'Crachá/e-mail ou senha incorretos';

const CustomLoginForm: React.FC<CustomLoginFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<React.ReactNode | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signInWithIdentifier(identifier, password);

      if (result.ok === false) {
        const email = identifier.trim();
        if (result.kind === 'invalid') {
          setAuthError(
            result.method === 'badge' ? (
              <div className="flex flex-col gap-1">
                <p>{INVALID_MESSAGE}</p>
                <p className="text-xs">Se o problema continuar, entre com seu e-mail.</p>
              </div>
            ) : (
              INVALID_MESSAGE
            )
          );
        } else if (result.kind === 'locked') {
          setAuthError('Muitas tentativas. Aguarde alguns minutos.');
        } else if (result.kind === 'unconfirmed') {
          setAuthError(
            result.method === 'badge' ? (
              'Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.'
            ) : (
              <div className="flex flex-col gap-2">
                <p>E-mail ainda não confirmado.</p>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-destructive underline"
                  onClick={async () => {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email,
                      options: { emailRedirectTo: new URL('/admin', window.location.origin).href },
                    });
                    if (error) showError(error.message);
                    else showSuccess('E-mail de confirmação reenviado!');
                  }}
                >
                  Reenviar link de confirmação
                </Button>
              </div>
            )
          );
        } else {
          setAuthError('Ocorreu um erro inesperado ao tentar entrar.');
        }
        return;
      }

      showSuccess('Login realizado com sucesso!');
      if (onSuccess) {
        onSuccess(result.user);
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
        <Label htmlFor="login-identifier">E-mail ou crachá</Label>
        <Input
          id="login-identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (authError) setAuthError(null);
          }}
          placeholder="seu@email.com ou nº do crachá"
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
