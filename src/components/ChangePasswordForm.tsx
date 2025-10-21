"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';

interface ChangePasswordFormProps {
  onPasswordChanged: () => void;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onPasswordChanged }) => {
  const { user } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!user?.email) {
      showError('Não foi possível obter o e-mail do usuário para verificação.');
      setIsLoading(false); // Garante que o botão seja reativado em caso de erro inicial
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As novas senhas não coincidem.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('A nova senha não pode ser igual à senha atual.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setPasswordError('A senha atual está incorreta.');
        } else {
          throw signInError;
        }
        return;
      }

      // 2. If re-authentication successful, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      showSuccess('Sua senha foi atualizada com sucesso!');
      onPasswordChanged(); // Chama o callback para qualquer ação adicional (ex: fechar modal)
      // Limpa os campos após o sucesso
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      showError(`Erro ao atualizar senha: ${error.message}`);
    } finally {
      setIsLoading(false); // Garante que o botão seja reativado
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="current-password">Senha Atual</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Digite sua senha atual"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="new-password">Nova Senha</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Digite sua nova senha"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirme sua nova senha"
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
            Atualizando...
          </>
        ) : (
          'Atualizar Senha'
        )}
      </Button>
    </form>
  );
};

export default ChangePasswordForm;