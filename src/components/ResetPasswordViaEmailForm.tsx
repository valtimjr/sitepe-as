"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

interface ResetPasswordViaEmailFormProps {
  onPasswordReset: () => void;
}

const ResetPasswordViaEmailForm: React.FC<ResetPasswordViaEmailFormProps> = ({ onPasswordReset }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    // Validações básicas antes de chamar a API
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As novas senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    console.log('[ResetPasswordForm] Iniciando tentativa de atualização...');

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('[ResetPasswordForm] Erro retornado pela API:', updateError);
        throw updateError;
      }

      console.log('[ResetPasswordForm] Senha atualizada com sucesso!');
      
      // Primeiro avisamos o usuário
      showSuccess('Senha redefinida com sucesso!');
      
      // Chamamos o callback que muda a tela para o estado de sucesso no componente pai
      onPasswordReset();
      
    } catch (error: any) {
      console.error('[ResetPasswordForm] Erro capturado no fluxo:', error);
      
      // Importante: Liberar o botão de carregamento para o usuário tentar novamente
      setIsLoading(false);

      if (error.message && (
        error.message.includes('New password should be different') || 
        error.message.includes('senha deve ser diferente')
      )) {
        setPasswordError('A nova senha não pode ser igual à senha anterior. Escolha uma senha diferente.');
      } else if (error.message) {
        setPasswordError(error.message);
      } else {
        showError('Erro ao redefinir senha. Tente novamente mais tarde.');
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
          placeholder="Digite sua nova senha"
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
          placeholder="Confirme sua nova senha"
          required
          disabled={isLoading}
        />
        
        {passwordError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-sm text-destructive font-medium">{passwordError}</p>
          </div>
        )}
        
        {!passwordError && (
          <p className="text-xs text-muted-foreground mt-1">
            Escolha uma senha que você ainda não usou nesta conta.
          </p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-11 text-lg shadow-lg active:scale-[0.98] transition-transform" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redefinindo...
          </>
        ) : (
          'Redefinir Senha'
        )}
      </Button>
    </form>
  );
};

export default ResetPasswordViaEmailForm;