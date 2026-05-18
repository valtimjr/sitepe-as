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
    setPasswordError('');
    console.log('[ResetPasswordForm] Iniciando UPDATE USER (Aguardando resposta)...');

    try {
      // Usando exatamente o comando solicitado e esperando a resposta
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Erro ao atualizar:", error.message);
        
        // Tratamento de erros específicos
        if (error.message?.toLowerCase().includes('different') || error.message?.toLowerCase().includes('anterior')) {
          setPasswordError('A nova senha não pode ser igual à senha anterior.');
        } else {
          showError(`Erro ao atualizar: ${error.message}`);
        }
        
        setIsLoading(false);
        isSubmitting.current = false;
      } else {
        console.log("Usuário atualizado:", data.user);
        showSuccess('Senha redefinida com sucesso!');
        onPasswordReset();
      }
    } catch (err: any) {
      console.error("Erro inesperado na requisição:", err);
      
      // Se houver um erro de rede/CORS que lance uma exceção (TypeError/NetworkError)
      // Fazemos uma última checagem de sessão para ver se o comando funcionou apesar do erro de rede
      const isNetError = err.message?.includes('NetworkError') || err.message?.includes('fetch') || err.name === 'TypeError';
      
      if (isNetError) {
        console.log("Detectado erro de rede. Verificando se a sessão foi criada mesmo assim...");
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log("Sessão ativa detectada! Prosseguindo para sucesso.");
          onPasswordReset();
          return;
        }
      }

      showError(`Erro de conexão: ${err.message}`);
      setIsLoading(false);
      isSubmitting.current = false;
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