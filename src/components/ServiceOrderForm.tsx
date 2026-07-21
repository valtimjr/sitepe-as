"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part, searchParts as searchPartsService, getAfsFromService, Af } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, XCircle, PlusCircle, Trash2, Car } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ServiceOrderData } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompany } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { validateTimesAgainstShift } from '@/services/shiftService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceOrderFormProps {
  initialData: ServiceOrderData | null;
  onSave: (data: ServiceOrderData) => void;
  onCancel: () => void;
  existingOsList?: ServiceOrderData[];
  selectedDate: Date;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({
  initialData,
  onSave,
  onCancel,
  existingOsList,
  selectedDate
}) => {
  const { company } = useCompany();
  const { user, profile } = useSession();
  
  const [userShift, setUserShift] = useState<any>(null);
  const [isLoadingShift, setIsLoadingShift] = useState(false);

  useEffect(() => {
    const fetchUserShift = async () => {
      if (!profile?.shift_code || !company) return;
      setIsLoadingShift(true);
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('id, name, ref_code, entry_time, exit_time')
          .eq('ref_code', profile.shift_code)
          .eq('company', company)
          .maybeSingle();
        if (!error && data) {
          setUserShift(data);
        }
      } catch (err) {
        console.error('Error fetching user shift in ServiceOrderForm:', err);
      } finally {
        setIsLoadingShift(false);
      }
    };
    fetchUserShift();
  }, [profile?.shift_code, company]);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [validationInfo, setValidationInfo] = useState<{ shiftRangeStr: string; offTime: string } | null>(null);

  const [af, setAf] = useState('');
  const [os, setOs] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFinal, setHoraFinal] = useState('');
  const [servicoExecutado, setServicoExecutado] = useState('');
  const [parts, setParts] = useState<{codigo_peca: string, descricao: string, quantidade: number}[]>([]);
  const [isPercurso, setIsPercurso] = useState(false);
  
  // Estados para busca e edição de peças
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  
  // Novos estados para edição manual da peça antes de adicionar
  const [partCode, setPartCode] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState<number | "">(1);
  const [partQuantityError, setPartQuantityError] = useState(false);
  
  const [availableAfs, setAvailableAfs] = useState<Af[]>([]);

  useEffect(() => {
    const loadAfs = async () => {
      const data = await getAfsFromService(company);
      setAvailableAfs(data);
    };
    loadAfs();
    
    if (initialData) {
      setAf(initialData.af);
      setOs(initialData.os || '');
      setHoraInicio(initialData.hora_inicio || '');
      setHoraFinal(initialData.hora_final || '');
      setServicoExecutado(initialData.servico_executado || '');
      setParts(initialData.parts || []);
      setIsPercurso(!!initialData.is_percurso);
    } else {
      setIsPercurso(false);
    }
  }, [initialData, company]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        const results = await searchPartsService(searchQuery, company);
        setSearchResults(results);
        setIsLoadingParts(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, company]);

  const handleSelectPartFromSearch = (part: Part) => {
    setPartCode(part.codigo);
    setPartDescription(part.descricao);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddPartToList = () => {
    if (!partCode.trim() && !partDescription.trim()) {
      showError('Informe ao menos o código ou a descrição da peça.');
      return;
    }

    const qtyNum = partQuantity === "" ? 0 : Number(partQuantity);
    if (partQuantity === "" || isNaN(qtyNum) || qtyNum <= 0) {
      setPartQuantityError(true);
      showError('O valor da quantidade tem que ser maior que "0"');
      return;
    }

    setParts(prev => [...prev, {
      codigo_peca: partCode.trim(),
      descricao: partDescription.trim(),
      quantidade: qtyNum
    }]);

    // Limpa os campos após adicionar
    setPartCode('');
    setPartDescription('');
    setPartQuantity(1);
    setPartQuantityError(false);
    showSuccess('Peça adicionada à lista.');
  };

  const handleRemovePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const checkTimeOverlap = (
    horaInicioA: string,
    horaFinalA: string,
    horaInicioB: string,
    horaFinalB: string
  ): boolean => {
    if (!horaInicioA || !horaFinalA || !horaInicioB || !horaFinalB) return false;

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    let startA = toMinutes(horaInicioA);
    let endA = toMinutes(horaFinalA);
    let startB = toMinutes(horaInicioB);
    let endB = toMinutes(horaFinalB);

    if (endA < startA) endA += 24 * 60;
    if (endB < startB) endB += 24 * 60;

    const overlaps = (s1: number, e1: number, s2: number, e2: number) => {
      return Math.max(s1, s2) < Math.min(e1, e2);
    };

    if (overlaps(startA, endA, startB, endB)) return true;
    if (overlaps(startA, endA, startB + 24 * 60, endB + 24 * 60)) return true;
    if (overlaps(startA + 24 * 60, endA + 24 * 60, startB, endB)) return true;

    return false;
  };

  const handleConfirmSave = () => {
    setIsConfirmDialogOpen(false);
    const data: ServiceOrderData = {
      id: initialData?.id || uuidv4(),
      af: af || "",
      os: isPercurso ? "" : os,
      hora_inicio: horaInicio,
      hora_final: horaFinal,
      servico_executado: isPercurso ? "Percurso" : servicoExecutado,
      parts: isPercurso ? [] : parts,
      is_percurso: isPercurso
    };
    onSave(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar campos obrigatórios
    if (!isPercurso && !af) {
      showError('O número do AF é obrigatório.');
      return;
    }

    if ((horaInicio && !horaFinal) || (!horaInicio && horaFinal)) {
      showError('Por favor, informe ambos os horários (início e término).');
      return;
    }

    // 2. Validar formato das horas
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (horaInicio && !timeRegex.test(horaInicio)) {
      showError('O horário de início deve estar no formato de horas válido (HH:MM).');
      return;
    }
    if (horaFinal && !timeRegex.test(horaFinal)) {
      showError('O horário de término deve estar no formato de horas válido (HH:MM).');
      return;
    }

    // 3. Validar conflitos já existentes no sistema (sobreposição de horário)
    if (horaInicio && horaFinal && existingOsList) {
      const hasConflict = existingOsList.some(item => {
        if (initialData && item.id === initialData.id) return false;
        return checkTimeOverlap(horaInicio, horaFinal, item.hora_inicio, item.hora_final);
      });
      if (hasConflict) {
        showError('Há uma sobreposição de horários com outra Ordem de Serviço ou Percurso já existente nesta data.');
        return;
      }
    }

    // 4. Validar horário do turno
    // Se o usuário não informou horário de início nem término, não há o que validar contra o turno.
    if (horaInicio || horaFinal) {
      // Usando a data operacional (selectedDate) para verificar folgas e turnos rotativos
      const validation = validateTimesAgainstShift(horaInicio, horaFinal, selectedDate, userShift);
      if (!validation.isValid) {
        setValidationInfo({
          shiftRangeStr: validation.shiftRangeStr || 'Folga',
          offTime: validation.offTime || ''
        });
        setIsConfirmDialogOpen(true);
        return;
      }
    }

    // 5. Caso esteja tudo correto, prosseguir com o salvamento direto
    const data: ServiceOrderData = {
      id: initialData?.id || uuidv4(),
      af: af || "",
      os: isPercurso ? "" : os,
      hora_inicio: horaInicio,
      hora_final: horaFinal,
      servico_executado: isPercurso ? "Percurso" : servicoExecutado,
      parts: isPercurso ? [] : parts,
      is_percurso: isPercurso
    };

    onSave(data);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Checkbox Percurso */}
      <div className="flex items-center space-x-2 p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-md">
        <Checkbox
          id="is-percurso"
          checked={isPercurso}
          onCheckedChange={(checked) => setIsPercurso(!!checked)}
          className="h-5 w-5 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 border-red-200 cursor-pointer"
        />
        <Car className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        <label
          htmlFor="is-percurso"
          className="text-sm font-semibold text-red-700 dark:text-red-400 cursor-pointer select-none"
        >
          Percurso (Deslocamento)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            AF (Número de Frota) {!isPercurso && <span className="text-destructive">*</span>}
          </Label>
          <AfSearchInput
            value={af}
            onChange={setAf}
            onSelectAf={setAf}
            availableAfs={availableAfs}
          />
        </div>
        {!isPercurso && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <Label>Número da OS</Label>
            <Input
              value={os}
              onChange={e => setOs(e.target.value)}
              placeholder="Ex: 45001"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hora Início</Label>
          <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Hora Final</Label>
          <Input type="time" value={horaFinal} onChange={e => setHoraFinal(e.target.value)} />
        </div>
      </div>

      {!isPercurso && (
        <>
          <div className="space-y-2 animate-in fade-in duration-200">
            <Label>Serviço Executado</Label>
            <Textarea
              value={servicoExecutado}
              onChange={e => setServicoExecutado(e.target.value)}
              placeholder="Descreva o trabalho realizado..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-4 animate-in fade-in duration-200">
            <h3 className="font-bold text-lg">Peças Utilizadas</h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Buscar Peça no Banco</Label>
                <PartSearchInput
                  onSearch={setSearchQuery}
                  searchResults={searchResults}
                  onSelectPart={handleSelectPartFromSearch}
                  searchQuery={searchQuery}
                  isLoading={isLoadingParts}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs">Código</Label>
                  <Input
                    value={partCode}
                    onChange={e => setPartCode(e.target.value)}
                    placeholder="Cód. Peça"
                  />
                </div>
                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={partDescription}
                    onChange={e => setPartDescription(e.target.value)}
                    placeholder="Descrição"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    type="number"
                    value={partQuantity}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setPartQuantity('');
                      } else {
                        const parsed = parseInt(val, 10);
                        setPartQuantity(isNaN(parsed) ? '' : parsed);
                      }
                      setPartQuantityError(false);
                    }}
                    className={cn(partQuantityError && "border-destructive focus-visible:ring-destructive")}
                  />
                  {partQuantityError && (
                    <p className="text-[10px] text-destructive mt-1">O valor tem que ser maior que "0"</p>
                  )}
                </div>
                <div className="sm:col-span-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handleAddPartToList}
                    className="w-full"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {parts.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead className="w-16 text-center">Qtd</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm break-all md:break-normal whitespace-normal">
                          <div className="font-medium text-xs md:text-sm">{p.codigo_peca || 'S/ Cód'}</div>
                          <div className="text-xs text-muted-foreground break-words whitespace-normal">{p.descricao || 'S/ Desc'}</div>
                        </TableCell>
                        <TableCell className="text-center">{p.quantidade}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePart(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          <XCircle className="h-4 w-4 mr-2" /> Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          <Save className="h-4 w-4 mr-2" /> Salvar OS
        </Button>
      </div>
    </form>

    <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            Horário fora do turno
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2 text-foreground">
            <p>O horário informado está fora do horário previsto para o seu turno.</p>
            
            <div className="bg-muted p-3 rounded-md space-y-2 border text-left">
              <div>
                <span className="font-semibold block text-xs uppercase text-muted-foreground">Turno do funcionário:</span>
                <span className="text-sm font-medium">{validationInfo?.shiftRangeStr || 'Folga'}</span>
              </div>
              <div>
                <span className="font-semibold block text-xs uppercase text-muted-foreground">Horário informado:</span>
                <span className="text-sm font-medium text-destructive">{validationInfo?.offTime || '--:--'}</span>
              </div>
            </div>
            
            <p className="font-semibold text-sm">Deseja salvar mesmo assim?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-0 sm:flex-row justify-end">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="mt-0" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={handleConfirmSave}>
              Salvar mesmo assim
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

export default ServiceOrderForm;