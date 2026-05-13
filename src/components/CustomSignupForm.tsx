"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from './PasswordInput';

interface CustomSignupFormProps {
  uuid: string; // O UUID do convite
  onSuccess?: () => void;
}

type AttributeItem = { name: string; ref_code: number | null };

const CustomSignupForm: React.FC<CustomSignupFormProps> = ({ uuid, onSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badge, setBadge] = useState('');
  
  const [professionCode, setProfessionCode] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [availableProfessions, setAvailableProfessions] = useState<AttributeItem[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AttributeItem[]>([]);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const [profRes, shiftRes] = await Promise.all([
          supabase.from('professions').select('name, ref_code').not('ref_code', 'is', null),
          supabase.from('shifts').select('name, ref_code').not('ref_code', 'is', null)
        ]);
        
        if (profRes.data) {
          const uniqueProfs = Array.from(new Map(profRes.data.map(item => [item.ref_code, item])).values())
            .sort((a, b) => a.name.localeCompare(b.name));
          setAvailableProfessions(uniqueProfs as AttributeItem[]);
        }
        if (shiftRes.data) {
          const uniqueShifts = Array.from(new Map(shiftRes.data.map(item => [item.ref_code, item])).values())
            .sort((a, b) => a.name.localeCompare(b.name));
          setAvailableShifts(uniqueShifts as AttributeItem[]);
        }
      } catch (e) {
        console.error('Error fetching attributes:', e);
      }
    };
    fetchAttributes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!professionCode || !shiftCode) {
      showError('Por favor, selecione sua profissão e seu turno.');
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
            profession_code: professionCode,
            shift_code: shiftCode,
            invite_code: uuid,
          },
          emailRedirectTo: window.location.origin + '/admin',
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        if (onSuccess) {
          onSuccess();
        } else {
          showSuccess('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
          navigate('/login');
        }
      } else if (data.session) {
        showSuccess('Login realizado com sucesso!');
        navigate('/admin');
      }
    } catch (error: any) {
      console.error('Erro de cadastro:', error);
      showError(`Erro ao cadastrar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first-name">Nome</Label>
          <Input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nome"
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
            placeholder="Sobrenome"
            required
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="profession">Profissão</Label>
          <Select value={professionCode} onValueChange={setProfessionCode} disabled={isLoading} required>
            <SelectTrigger id="profession">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {availableProfessions.map(p => (
                <SelectItem key={p.ref_code} value={p.ref_code!.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="shift">Turno</Label>
          <Select value={shiftCode} onValueChange={setShiftCode} disabled={isLoading} required>
            <SelectTrigger id="shift">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {availableShifts.map(s => (
                <SelectItem key={s.ref_code} value={s.ref_code!.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <PasswordInput
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