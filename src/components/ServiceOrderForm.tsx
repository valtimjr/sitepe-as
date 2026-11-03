"use client";

import React, { useState, useEffect, useReducer, useRef, useLayoutEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part, searchParts as searchPartsService, getAfsFromService, Af } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, XCircle, PlusCircle, Trash2, Car, Truck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ServiceOrderData } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompany } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { validateTimesAgainstShift } from '@/services/shiftService';
import { useIsCompact } from '@/hooks/use-compact';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import OsTypeToggle from '@/components/service-orders/OsTypeToggle';
import OsPartsSection, { partsReducer } from '@/components/service-orders/OsPartsSection';
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
  /** Hora de início sugerida para uma OS nova (ação "Nova OS a partir de..."). */
  initialStartTime?: string;
  /** Avisa se há alterações não salvas (para pedir confirmação ao fechar). */
  onDirtyChange?: (dirty: boolean) => void;
}

const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Duração entre dois horários (passa da meia-noite), ex.: "2h30" ou "45min". */
const formatSpan = (start: string, end: string) => {
  if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) return '';
  let minutes = toMinutes(end) - toMinutes(start);
  if (minutes < 0) minutes += 24 * 60;
  if (minutes === 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

/** Rola até o campo e dá foco nele (ou no primeiro campo dentro do bloco). */
const focusField = (el: HTMLElement | null) => {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const target = el.matches('input, textarea') ? el : el.querySelector<HTMLElement>('input, textarea');
  target?.focus({ preventScroll: true });
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>
);

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({
  initialData,
  onSave,
  onCancel,
  existingOsList,
  selectedDate,
  initialStartTime,
  onDirtyChange,
}) => {
  const isCompact = useIsCompact();
  const keyboardOpen = useKeyboardOpen();
  const { company } = useCompany();
  const { profile } = useSession();
  
  const [userShift, setUserShift] = useState<any>(null);

  useEffect(() => {
    const fetchUserShift = async () => {
      if (!profile?.shift_code || !company) return;
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
  const [parts, dispatchParts] = useReducer(partsReducer, []);
  const [isPercurso, setIsPercurso] = useState(false);
  const [isAgregado, setIsAgregado] = useState(false);
  const [numeroAgregado, setNumeroAgregado] = useState('');
  const [agregadoError, setAgregadoError] = useState(false);
  const [partsError, setPartsError] = useState(false);

  // Refs para rolar até o campo com erro
  const afFieldRef = useRef<HTMLDivElement>(null);
  const agregadoInputRef = useRef<HTMLInputElement>(null);
  const horaInicioRef = useRef<HTMLInputElement>(null);
  const horaFinalRef = useRef<HTMLInputElement>(null);
  const partsRef = useRef<HTMLDivElement>(null);
  const servicoRef = useRef<HTMLTextAreaElement>(null);
  
  // Estados para busca e edição de peças (desktop)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
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
      dispatchParts({ type: 'reset', parts: initialData.parts || [] });
      setIsPercurso(!!initialData.is_percurso);
      setIsAgregado(!initialData.is_percurso && !!initialData.agregado);
      setNumeroAgregado(!initialData.is_percurso ? (initialData.numero_agregado || '') : '');
    } else {
      setIsPercurso(false);
      setIsAgregado(false);
      setNumeroAgregado('');
      if (initialStartTime) setHoraInicio(initialStartTime);
    }
  }, [initialData, company, initialStartTime]);

  useEffect(() => {
    if (isPercurso) {
      setIsAgregado(false);
      setNumeroAgregado('');
      setAgregadoError(false);
    }
  }, [isPercurso]);

  // Alterações não salvas: compara com o estado inicial
  const initialSnapshot = useMemo(() => {
    const p = !!initialData?.is_percurso;
    return JSON.stringify([
      initialData?.af || '',
      initialData?.os || '',
      initialData ? initialData.hora_inicio || '' : initialStartTime || '',
      initialData?.hora_final || '',
      initialData?.servico_executado || '',
      initialData?.parts || [],
      p,
      !p && !!initialData?.agregado,
      !p ? initialData?.numero_agregado || '' : '',
    ]);
  }, [initialData, initialStartTime]);
  const currentSnapshot = JSON.stringify([
    af, os, horaInicio, horaFinal, servicoExecutado, parts, isPercurso, isAgregado, numeroAgregado,
  ]);
  const isDirty = currentSnapshot !== initialSnapshot;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Caixa do serviço cresce com o texto (celular)
  useLayoutEffect(() => {
    const el = servicoRef.current;
    if (!el || !isCompact) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [servicoExecutado, isCompact, isPercurso]);

  useEffect(() => {
    if (isCompact) return;
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
  }, [searchQuery, company, isCompact]);

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

    dispatchParts({
      type: 'insert',
      index: parts.length,
      part: { codigo_peca: partCode.trim(), descricao: partDescription.trim(), quantidade: qtyNum },
    });

    setPartCode('');
    setPartDescription('');
    setPartQuantity(1);
    setPartQuantityError(false);
    showSuccess('Peça adicionada à lista.');
  };

  const handleRemovePart = (index: number) => {
    dispatchParts({ type: 'remove', index });
  };

  const checkTimeOverlap = (
    horaInicioA: string,
    horaFinalA: string,
    horaInicioB: string,
    horaFinalB: string
  ): boolean => {
    if (!horaInicioA || !horaFinalA || !horaInicioB || !horaFinalB) return false;

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

  const buildServiceOrderObject = (): ServiceOrderData => {
    // Se já tinha um crachá no registro existente, preserva.
    // Caso contrário (registro antigo ou novo), usa o crachá do profile.
    const crachaToSave = initialData?.cracha || profile?.badge || "";

    return {
      id: initialData?.id || uuidv4(),
      cracha: crachaToSave,
      af: af || "",
      os: isPercurso ? "" : os,
      hora_inicio: horaInicio,
      hora_final: horaFinal,
      servico_executado: isPercurso ? "Percurso" : servicoExecutado,
      parts: isPercurso ? [] : parts,
      is_percurso: isPercurso,
      agregado: !isPercurso && isAgregado,
      numero_agregado: (!isPercurso && isAgregado) ? numeroAgregado.trim() : null
    };
  };

  const handleConfirmSave = () => {
    setIsConfirmDialogOpen(false);
    onSave(buildServiceOrderObject());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar campos obrigatórios e compatibilidade com Agregado
    if (isPercurso && isAgregado) {
      showError('OS de percurso não pode possuir agregado.');
      return;
    }

    if (!isPercurso && isAgregado && !numeroAgregado.trim()) {
      setAgregadoError(true);
      showError('Informe o Nº Agregado para continuar.');
      focusField(agregadoInputRef.current);
      return;
    }

    if (!isPercurso && !af) {
      showError('O número do AF é obrigatório.');
      focusField(afFieldRef.current);
      return;
    }

    if (!isPercurso && parts.some(p => !(p.quantidade > 0))) {
      setPartsError(true);
      showError('Informe a quantidade de todas as peças.');
      focusField(partsRef.current);
      return;
    }
    setPartsError(false);

    // 2. Validar formato das horas
    if (horaInicio && !TIME_REGEX.test(horaInicio)) {
      showError('O horário de início deve estar no formato de horas válido (HH:MM).');
      focusField(horaInicioRef.current);
      return;
    }
    if (horaFinal && !TIME_REGEX.test(horaFinal)) {
      showError('O horário de término deve estar no formato de horas válido (HH:MM).');
      focusField(horaFinalRef.current);
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
        focusField(horaInicioRef.current);
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
    onSave(buildServiceOrderObject());
  };

  /** Enter num campo (celular) vai para o próximo campo em vez de enviar o formulário. */
  const handleEnterNext = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    if (e.key !== 'Enter' || target.tagName !== 'INPUT' || !e.currentTarget.contains(target)) return;
    e.preventDefault();
    const fields = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea'),
    ).filter(el => el.offsetParent !== null);
    const next = fields[fields.indexOf(target) + 1];
    if (next) next.focus();
    else target.blur();
  };

  const duration = formatSpan(horaInicio, horaFinal);
  const partsSubtitle = af ? `AF ${af}${os ? ` · OS ${os}` : ''}` : 'Nova OS';

  const footer = (
    <div
      className={cn(
        "flex gap-3",
        isCompact
          ? cn(
              "sticky bottom-0 z-10 -mx-6 border-t bg-background px-6 pt-3",
              keyboardOpen ? "pb-3" : "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
            )
          : "pt-4"
      )}
      data-testid="os-form-footer"
    >
      <Button type="button" variant="outline" className={cn("flex-1", isCompact && "h-12 text-base")} onClick={onCancel}>
        <XCircle className="h-4 w-4 mr-2" /> Cancelar
      </Button>
      <Button type="submit" className={cn("flex-1", isCompact && "h-12 text-base")}>
        <Save className="h-4 w-4 mr-2" /> Salvar OS
      </Button>
    </div>
  );

  const compactForm = (
    <form onSubmit={handleSubmit} onKeyDown={handleEnterNext} className="space-y-6" noValidate>
      <div className="space-y-3">
        <OsTypeToggle isPercurso={isPercurso} onChange={setIsPercurso} />
        {!isPercurso && (
          <div className="rounded-lg border px-3 bg-blue-50/40 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center justify-between min-h-12">
              <Label htmlFor="is-agregado" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                <Truck className="h-4 w-4 text-blue-600" /> Agregado
              </Label>
              <Switch
                id="is-agregado"
                checked={isAgregado}
                onCheckedChange={(checked) => {
                  setIsAgregado(checked);
                  setAgregadoError(false);
                }}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            {isAgregado && (
              <div className="pb-3 space-y-1.5 animate-in fade-in duration-200">
                <Label htmlFor="numero-agregado">
                  Nº Agregado <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="numero-agregado"
                  ref={agregadoInputRef}
                  value={numeroAgregado}
                  inputMode="numeric"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-invalid={agregadoError}
                  aria-describedby={agregadoError ? 'numero-agregado-error' : undefined}
                  onChange={(e) => {
                    setNumeroAgregado(e.target.value);
                    setAgregadoError(false);
                  }}
                  placeholder="Ex: 123456"
                  className={cn("h-11 text-base", agregadoError && "border-destructive focus-visible:ring-destructive")}
                />
                {agregadoError && (
                  <p id="numero-agregado-error" className="text-sm text-destructive">
                    Informe o Nº Agregado para continuar.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <SectionTitle>Identificação</SectionTitle>
        <div ref={afFieldRef} className="space-y-1.5">
          <Label htmlFor="af-input">
            AF {!isPercurso && <span className="text-destructive">*</span>}
          </Label>
          <AfSearchInput
            value={af}
            onChange={setAf}
            onSelectAf={setAf}
            availableAfs={availableAfs}
            inputProps={{ className: 'h-11 text-base', enterKeyHint: 'next' }}
          />
        </div>
        {!isPercurso && (
          <div className="space-y-1.5">
            <Label htmlFor="os-number">Nº OS</Label>
            <Input
              id="os-number"
              value={os}
              onChange={e => setOs(e.target.value)}
              placeholder="Ex: 45001"
              inputMode="numeric"
              enterKeyHint="next"
              autoComplete="off"
              className="h-11 text-base"
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>Horário</SectionTitle>
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Label htmlFor="hora-inicio">Início</Label>
            <Input
              id="hora-inicio"
              ref={horaInicioRef}
              type="time"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <span className="pb-3 text-muted-foreground" aria-hidden="true">→</span>
          <div className="flex-1 min-w-0 space-y-1.5">
            <Label htmlFor="hora-final">Fim</Label>
            <Input
              id="hora-final"
              ref={horaFinalRef}
              type="time"
              value={horaFinal}
              onChange={e => setHoraFinal(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div
            className="w-14 shrink-0 pb-3 text-right text-sm font-semibold tabular-nums text-muted-foreground"
            data-testid="os-duration"
            aria-label={duration ? `Duração ${duration}` : undefined}
          >
            {duration || '—'}
          </div>
        </div>
      </section>

      {!isPercurso && (
        <>
          <section className="space-y-3">
            <SectionTitle>
              <label htmlFor="servico-executado">Serviço</label>
            </SectionTitle>
            <Textarea
              id="servico-executado"
              ref={servicoRef}
              value={servicoExecutado}
              onChange={e => setServicoExecutado(e.target.value)}
              placeholder="Descreva o trabalho realizado..."
              rows={2}
              className="min-h-0 resize-none overflow-hidden text-base"
            />
          </section>

          <div ref={partsRef}>
            <OsPartsSection parts={parts} dispatch={dispatchParts} subtitle={partsSubtitle} hasError={partsError} />
          </div>
        </>
      )}

      {footer}
    </form>
  );

  const desktopForm = (
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

      {/* Checkbox Agregado */}
      <div className={cn(
        "p-3 border rounded-md transition-colors",
        isPercurso
          ? "bg-muted/40 border-muted opacity-70"
          : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30"
      )}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-agregado"
            checked={isAgregado}
            disabled={isPercurso}
            onCheckedChange={(checked) => {
              setIsAgregado(!!checked);
              setAgregadoError(false);
            }}
            className="h-5 w-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-blue-200 cursor-pointer disabled:cursor-not-allowed"
          />
          <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <label
            htmlFor="is-agregado"
            className={cn(
              "text-sm font-semibold select-none",
              isPercurso
                ? "text-muted-foreground cursor-not-allowed"
                : "text-blue-700 dark:text-blue-400 cursor-pointer"
            )}
          >
            Agregado
          </label>
        </div>

        {isPercurso && (
          <p className="text-xs text-muted-foreground mt-1 ml-7">
            Indisponível em OS de percurso
          </p>
        )}

        {!isPercurso && isAgregado && (
          <div className="mt-3 ml-7 space-y-1 animate-in fade-in duration-200">
            <Label htmlFor="numero-agregado" className="text-xs font-medium">
              Nº Agregado <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numero-agregado"
              ref={agregadoInputRef}
              value={numeroAgregado}
              onChange={(e) => {
                setNumeroAgregado(e.target.value);
                setAgregadoError(false);
              }}
              placeholder="Ex: 123456"
              className={cn(
                "h-9 max-w-xs",
                agregadoError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {agregadoError && (
              <p className="text-xs text-destructive">
                Informe o Nº Agregado para continuar.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2" ref={afFieldRef}>
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
          <Input ref={horaInicioRef} type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Hora Final</Label>
          <Input ref={horaFinalRef} type="time" value={horaFinal} onChange={e => setHoraFinal(e.target.value)} />
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
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePart(i)}>
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

      {footer}
    </form>
  );

  return (
    <>
    {isCompact ? compactForm : desktopForm}

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
