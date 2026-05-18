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
    console.log('[ResetPasswordForm] Iniciando UPDATE USER...');

    // Implementação otimista conforme solicitado: dispara e já assume sucesso na UI
    // mas mantendo a estrutura de comando solicitada para execução em background
    const handleUpdate = async () => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Erro ao atualizar:", error.message);
        // Se der erro de senha repetida, avisamos via toast
        if (error.message?.toLowerCase().includes('different') || error.message?.toLowerCase().includes('anterior')) {
          showError('Aviso: A senha enviada era igual à anterior.');
        }
      } else {
        console.log("Usuário atualizado:", data.user);
      }
    };

    // Dispara a execução sem dar 'await' no fluxo principal da UI
    handleUpdate();

    // Redireciona imediatamente para a página de sucesso
    setTimeout(() => {
      console.log('[ResetPasswordForm] Redirecionando para sucesso (Modo Otimista)');
      onPasswordReset();
    }, 500);
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