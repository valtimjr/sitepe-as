"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Briefcase, 
  Clock,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { MadeWithDyad } from '@/components/made-with-dyad';

const AdminConfigPage = () => {
  const { profile } = useSession();
  const { company, branding } = useCompany();
  const navigate = useNavigate();

  const [professions, setProfessions] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newProfession, setNewProfession] = useState('');
  const [newShift, setNewShift] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      showError('Acesso restrito a administradores.');
      navigate(`/${company}`);
      return;
    }

    const fetchConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('key, value')
          .in('key', ['professions_list', 'shifts_list'])
          .eq('company', company);

        if (error) throw error;

        const profConfig = data?.find(c => c.key === 'professions_list');
        const shiftConfig = data?.find(c => c.key === 'shifts_list');

        setProfessions(Array.isArray(profConfig?.value) ? profConfig.value : ['eletricista', 'mecanico']);
        setShifts(Array.isArray(shiftConfig?.value) ? shiftConfig.value : ['Turno A', 'Turno B', 'Turno C']);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [profile, company, navigate]);

  const saveConfig = async (key: string, value: string[]) => {
    setSaving(true);
    try {
      // Tenta atualizar
      const { error: updateError } = await supabase
        .from('app_config')
        .upsert({ 
          key, 
          value, 
          company, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key,company' });

      if (updateError) throw updateError;
      showSuccess('Configuração salva com sucesso!');
    } catch (err: any) {
      showError(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addProfession = () => {
    if (!newProfession.trim()) return;
    const updated = [...professions, newProfession.trim()];
    setProfessions(updated);
    setNewProfession('');
    saveConfig('professions_list', updated);
  };

  const removeProfession = (index: number) => {
    const updated = professions.filter((_, i) => i !== index);
    setProfessions(updated);
    saveConfig('professions_list', updated);
  };

  const addShift = () => {
    if (!newShift.trim()) return;
    const updated = [...shifts, newShift.trim()];
    setShifts(updated);
    setNewShift('');
    saveConfig('shifts_list', updated);
  };

  const removeShift = (index: number) => {
    const updated = shifts.filter((_, i) => i !== index);
    setShifts(updated);
    saveConfig('shifts_list', updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-primary">
          <Settings className="h-8 w-8" />
          Gerenciar Opções do Sistema
        </h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Professions Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-500" />
              Profissões
            </CardTitle>
            <CardDescription>Gerencie os cargos disponíveis para os usuários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Nova profissão..." 
                value={newProfession} 
                onChange={(e) => setNewProfession(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addProfession()}
              />
              <Button size="icon" onClick={addProfession} disabled={saving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {professions.map((prof, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-md border group">
                  <span className="font-medium capitalize">{prof}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeProfession(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {professions.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">Nenhuma profissão cadastrada.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shifts Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Turnos
            </CardTitle>
            <CardDescription>Gerencie os turnos de trabalho da unidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Novo turno..." 
                value={newShift} 
                onChange={(e) => setNewShift(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addShift()}
              />
              <Button size="icon" onClick={addShift} disabled={saving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {shifts.map((shift, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-md border group">
                  <span className="font-medium">{shift}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeShift(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {shifts.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum turno cadastrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default AdminConfigPage;