"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      // No fluxo de redefinição de senha, a sessão já está autenticada pelo token do e-mail.
      // Basta chamar updateUser diretamente.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      showSuccess('Sua senha foi redefinida com sucesso!');
      // Limpa os campos antes de chamar o callback que pode navegar
      setNewPassword('');
      setConfirmPassword('');
      onPasswordReset(); // Chama o callback para redirecionar
    } catch (error: any) {
      // Adiciona uma verificação específica para o erro de senha igual à antiga
      if (error.message.includes('New password should be different from the old password')) {
        setPasswordError('A nova senha não pode ser igual à senha anterior.');
      } else {
        showError(`Erro ao redefinir senha: ${error.message}`);
      }
    } finally {
      setIsLoading(false); // Garante que o botão seja reativado
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="new-password">Nova Senha</Label>
        <PasswordInput // Usando PasswordInput
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
        <PasswordInput // Usando PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirme sua nova senha"
          required
          disabled={isLoading}
        />
        {passwordError && (
          <p className="text-sm text-destructive mt-1">{passwordError}</p>
        )}
        {!passwordError && ( // Adiciona a dica apenas se não houver outro erro de senha
          <p className="text-sm text-muted-foreground mt-1">
            A nova senha deve ser diferente da sua senha anterior.
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
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