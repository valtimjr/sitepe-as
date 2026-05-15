"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { PasswordInput } from './PasswordInput'; // Importar PasswordInput

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
    try {
      console.log('[ResetPasswordForm] Iniciando atualização de senha...');
      // No fluxo de redefinição de senha, a sessão já está autenticada pelo token do e-mail.
      // Basta chamar updateUser diretamente.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('[ResetPasswordForm] Erro na API:', updateError);
        throw updateError;
      }

      console.log('[ResetPasswordForm] Senha atualizada com sucesso! Chamando onPasswordReset.');
      
      // Chamamos o callback IMEDIATAMENTE antes de qualquer outra coisa
      onPasswordReset();
      
      // Toast de sucesso (opcional se a tela de sucesso já for clara o suficiente)
      showSuccess('Sua senha foi redefinida com sucesso!');
      
    } catch (error: any) {
      console.error('[ResetPasswordForm] Erro capturado:', error);
      setIsLoading(false); // Só remove o loading em caso de erro

      if (error.message && error.message.includes('New password should be different from the old password')) {
        setPasswordError('A nova senha não pode ser igual à senha anterior.');
      } else {
        showError(`Erro ao redefinir senha: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="new-password">Nova Senha</Label>
        <PasswordInput
          id="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Digite sua nova senha"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirme sua nova senha"
          required
          disabled={isLoading}
        />
        {passwordError && (
          <p className="text-sm text-destructive mt-1 font-medium">{passwordError}</p>
        )}
        {!passwordError && (
          <p className="text-sm text-muted-foreground mt-1">
            A nova senha deve ser diferente da sua senha anterior.
          </p>
        )}
      </div>
      <Button type="submit" className="w-full h-11 text-lg" disabled={isLoading}>
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