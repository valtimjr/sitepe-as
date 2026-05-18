"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

interface ResetPasswordViaEmailFormProps {
  onPasswordReset: () => void;
}

const ResetPasswordViaEmailForm: React.FC<ResetPasswordViaEmailFormProps> = ({ onPasswordReset }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const isSubmitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSubmitting.current) return;
    
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    isSubmitting.current = true;
    console.log('[ResetPasswordForm] Iniciando UPDATE USER no Supabase...');

    try {
      //timeout de 10 segundos para a chamada do Supabase
      const updatePromise = supabase.auth.updateUser({
        password: newPassword
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_LIMIT_REACHED')), 10000)
      );

      // Corrida entre a resposta real e o timeout
      const result: any = await Promise.race([updatePromise, timeoutPromise]);
      const { error: updateError } = result;

      if (updateError) {
        console.error('[ResetPasswordForm] Supabase retornou erro:', updateError);
        if (updateError.message?.toLowerCase().includes('different') || updateError.message?.toLowerCase().includes('anterior')) {
          throw new Error('A nova senha não pode ser igual à senha anterior.');
        }
        throw updateError;
      }

      console.log('[ResetPasswordForm] API respondeu OK. Notificando PAI...');
      onPasswordReset();

    } catch (error: any) {
      console.warn('[ResetPasswordForm] Erro detectado no CATCH:', error.message);

      // Se travar ou der erro de rede, tentamos o Plano B IMEDIATAMENTE
      const isLikelySuccessDespiteError =
        error.message === 'TIMEOUT_LIMIT_REACHED' ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('fetch') ||
        error.name === 'TypeError';
      
      if (isLikelySuccessDespiteError) {
        console.log('[ResetPasswordForm] Possível sucesso silencioso ou travamento. Verificando estado real...');
        
        // Tenta 3 vezes verificar a sessão com pequenos intervalos
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log(`[ResetPasswordForm] Sessão encontrada na tentativa ${i+1}! Redirecionando.`);
            onPasswordReset();
            return;
          }
        }
      }

      // TRATAMENTO DE ERROS REAIS
      setIsLoading(false);
      isSubmitting.current = false;

      if (error.message.includes('igual à senha anterior')) {
        setPasswordError(error.message);
      } else if (error.message === 'TIMEOUT_LIMIT_REACHED') {
        setPasswordError('O servidor demorou a responder, mas sua senha pode ter sido alterada. Tente fazer login.');
      } else {
        showError(`Falha: ${error.message}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nova Senha</Label>
        <PasswordInput
          id="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          placeholder="Mínimo 6 caracteres"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          placeholder="Repita a nova senha"
          required
          disabled={isLoading}
        />
        
        {passwordError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">{passwordError}</p>
          </div>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-12 text-lg shadow-xl" 
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processando...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Redefinir Senha</span>
          </div>
        )}
      </Button>
      
      <p className="text-center text-[10px] text-muted-foreground mt-4 px-6 italic leading-tight">
        Se o sistema não responder mas você já tiver alterado a senha, o redirecionamento ocorrerá automaticamente.
      </p>
    </form>
  );
};

export default ResetPasswordViaEmailForm;