"use client";

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceOrderData } from '@/types/supabase';
import {
  Clock, Pencil, Trash2, PlusCircle, X, Check, GripVertical, Tag, Package,
  ChevronDown, MoreHorizontal, CopyPlus, Wrench, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from "@/components/responsive/ResponsivePopover";
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { tap } from '@/lib/haptics';
import { Checkbox } from '@/components/ui/checkbox';
import ServiceOrderPartPicker from '@/components/service-orders/ServiceOrderPartPicker';
import QuantityStepper from '@/components/service-orders/QuantityStepper';
import { mergeParts, type PickedPart } from '@/components/service-orders/mergeParts';

const PartPickerSheet = lazy(() => import('@/components/service-orders/PartPickerSheet'));

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (updatedOs: ServiceOrderData) => void;
  onAddPart?: () => void;
  readOnly?: boolean;
  additionalHeader?: React.ReactNode;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  /** Layout compacto para o celular (card que abre/fecha, menu ⋯ e gavetas). */
  compact?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Abre "Nova OS" com a hora de início igual à hora final desta. */
  onDuplicate?: () => void;
}

type OsPart = PickedPart;

interface RelatedItem {
  code: string;
  description: string;
}

const useRelatedItems = (code: string, company: string) => {
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchRelatedItems = async () => {
      const tableName = company === 'citrosuco' ? 'parts_citrosuco' : 'parts';
      try {
        const { data } = await supabase
          .from(tableName)
          .select('itens_relacionados')
          .eq('codigo', code)
          .single();

        if (data?.itens_relacionados) {
          const rawItems = Array.isArray(data.itens_relacionados) ? data.itens_relacionados : [];
          const codes = rawItems
            .map((item: any) => (typeof item === 'string' ? item : (item.codigo || item.code)))
            .filter((c: any) => typeof c === 'string');

          if (codes.length > 0) {
            const { data: partsData } = await supabase
              .from(tableName)
              .select('codigo, descricao')
              .in('codigo', codes);
            if (cancelled) return;
            if (partsData) {
              const partsMap = new Map(partsData.map(p => [p.codigo, p.descricao]));
              setRelatedItems(codes.map((c: string) => ({
                code: c,
                description: partsMap.get(c) || 'Descrição não encontrada',
              })));
            } else {
              setRelatedItems(codes.map((c: string) => ({ code: c, description: '' })));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching related items:", err);
      }
    };
    fetchRelatedItems();
    return () => {
      cancelled = true;
    };
  }, [code, company]);

  return relatedItems;
};

const RelatedItemsPopover: React.FC<{ items: RelatedItem[]; large?: boolean }> = ({ items, large }) => {
  if (items.length === 0) return null;
  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger>
        <div
          className={cn(
            "flex items-center text-xs text-blue-500 font-medium cursor-pointer hover:text-blue-700 w-fit transition-colors mt-1",
            large && "min-h-8",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Tag className="h-3 w-3 mr-1" />
          <span>{items.length} item(s) relacionado(s)</span>
        </div>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent title="Itens Relacionados" popoverClassName="w-auto max-w-[450px] p-4 bg-white shadow-lg border" align="start">
        <h4 className="hidden lg:flex font-bold text-sm mb-2 text-foreground items-center gap-2">
          <Package className="h-4 w-4" /> Itens Relacionados:
        </h4>
        <ul className="space-y-2 list-none pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-xs text-muted-foreground leading-snug border-b last:border-0 pb-1 last:pb-0 border-dashed border-gray-200">
              <span className="font-bold text-blue-600 mr-1">{item.code}</span>
              <span className="text-gray-600">- {item.description}</span>
            </li>
          ))}
        </ul>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
};

const ServiceOrderPartRow: React.FC<{
  part: OsPart;
  index: number;
  onDelete?: (index: number) => void;
  onUpdate?: (index: number, updatedPart: OsPart) => void;
  company: string;
  readOnly?: boolean;
}> = ({ part, index, onDelete, onUpdate, company, readOnly }) => {
  const relatedItems = useRelatedItems(part.codigo_peca, company);

  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState(part.codigo_peca);
  const [editDesc, setEditDesc] = useState(part.descricao);
  const [editQty, setEditQty] = useState<number | "">(part.quantidade);
  const [editQtyError, setEditQtyError] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditCode(part.codigo_peca);
      setEditDesc(part.descricao);
      setEditQty(part.quantidade);
      setEditQtyError(false);
    }
  }, [part, isEditing]);

  const handleSaveEdit = () => {
    const qtyNum = editQty === "" ? 0 : Number(editQty);
    if (editQty === "" || isNaN(qtyNum) || qtyNum <= 0) {
      setEditQtyError(true);
      return;
    }
    onUpdate?.(index, { codigo_peca: editCode, descricao: editDesc, quantidade: qtyNum });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditCode(part.codigo_peca);
    setEditDesc(part.descricao);
    setEditQty(part.quantidade);
    setEditQtyError(false);
    setIsEditing(false);
  };

  if (isEditing && !readOnly) {
    return (
      <div className="p-4 pl-8 md:pl-14 bg-blue-50/50 border-b border-blue-100 animate-in fade-in duration-200">
         <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3 items-center">
           <div className="space-y-1">
             <span className="text-xs font-medium text-muted-foreground md:hidden">Código</span>
             <Input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                placeholder="Código"
                className="h-9 text-sm font-mono"
                autoFocus
             />
           </div>
           <div className="space-y-1">
             <span className="text-xs font-medium text-muted-foreground md:hidden">Descrição</span>
             <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição"
                className="h-9 text-sm"
             />
           </div>
           <div className="space-y-1">
             <span className="text-xs font-medium text-muted-foreground md:hidden">Qtd</span>
             <Input
                type="number"
                value={editQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditQty('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setEditQty(isNaN(parsed) ? '' : parsed);
                  }
                  setEditQtyError(false);
                }}
                className={cn("w-full md:w-20 h-9 text-sm text-center", editQtyError && "border-destructive focus-visible:ring-destructive")}
              />
              {editQtyError && (
                <p className="text-[10px] text-destructive mt-1">O valor tem que ser maior que "0"</p>
              )}
           </div>
           <div className="flex items-end justify-end gap-1 pt-1 md:pt-0">
              <Button size="sm" onClick={handleSaveEdit} className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
           </div>
         </div>
      </div>
    );
  }

  return (
    <div className="p-4 pl-8 md:pl-14 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center hover:bg-muted/20 transition-colors">
      <div className="space-y-1">
        <div className="font-semibold text-blue-600 hover:underline cursor-pointer text-sm">
          {part.codigo_peca}
        </div>
        <div className="text-sm text-foreground uppercase leading-tight">
          {part.descricao}
        </div>
        <RelatedItemsPopover items={relatedItems} />
      </div>

      <div className="flex items-center justify-between md:contents">
         <span className="md:hidden text-sm font-medium text-muted-foreground">Qtd:</span>
         <div className="text-center w-16 font-medium text-sm">{part.quantidade}</div>

         {!readOnly && (
           <div className="flex items-center justify-end gap-1 w-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Excluir item</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente este item da lista.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete?.(index)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
         )}
      </div>
    </div>
  );
};

/** Linha de peça do card compacto: só é montada com o card aberto (consulta adiada dos relacionados). */
const CompactPartRow: React.FC<{
  part: OsPart;
  company: string;
  readOnly?: boolean;
  onOpen: () => void;
}> = ({ part, company, readOnly, onOpen }) => {
  const relatedItems = useRelatedItems(part.codigo_peca, company);
  return (
    <div className="px-3 py-2" data-testid="os-part-row">
      <button
        type="button"
        disabled={readOnly}
        onClick={onOpen}
        className="w-full min-h-11 text-left flex items-center gap-2 rounded-md active:bg-muted/60"
        aria-label={`Editar peça ${part.codigo_peca || part.descricao}`}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-blue-600 text-sm">{part.codigo_peca || 'S/ Cód'}</div>
          <div className="text-sm uppercase leading-tight line-clamp-2">{part.descricao}</div>
        </div>
        <span className="text-sm font-medium text-muted-foreground shrink-0">Qtd {part.quantidade}</span>
        {!readOnly && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      <RelatedItemsPopover items={relatedItems} large />
    </div>
  );
};

/** Gaveta de edição de uma peça (celular). */
const PartEditSheet: React.FC<{
  part: OsPart | null;
  onClose: () => void;
  onSave: (part: OsPart) => void;
  onDelete: () => void;
}> = ({ part, onClose, onSave, onDelete }) => {
  const [code, setCode] = useState(part?.codigo_peca ?? '');
  const [desc, setDesc] = useState(part?.descricao ?? '');
  const [qty, setQty] = useState<number | ''>(part?.quantidade ?? 1);
  const [qtyError, setQtyError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (part) {
      setCode(part.codigo_peca);
      setDesc(part.descricao);
      setQty(part.quantidade);
      setQtyError(false);
    }
  }, [part]);

  const handleSave = () => {
    const qtyNum = qty === '' ? 0 : Number(qty);
    if (qty === '' || isNaN(qtyNum) || qtyNum <= 0) {
      setQtyError(true);
      return;
    }
    onSave({ codigo_peca: code, descricao: desc, quantidade: qtyNum });
  };

  return (
    <>
      <Sheet open={!!part} onOpenChange={(open) => { if (!open) onClose(); }}>
        <ResponsiveSheetContent
          className="w-full sm:max-w-lg"
          data-testid="part-edit-sheet"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            qtyInputRef.current?.focus();
          }}
        >
          <SheetHeader className="text-left">
            <SheetTitle>Editar peça</SheetTitle>
            <SheetDescription className="sr-only">Altere o código, a descrição ou a quantidade.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-part-code">Código</Label>
              <Input id="edit-part-code" value={code} onChange={(e) => setCode(e.target.value)} className="h-11 text-base font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-part-desc">Descrição</Label>
              <Input id="edit-part-desc" value={desc} onChange={(e) => setDesc(e.target.value)} className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <QuantityStepper
                value={qty}
                onChange={(v) => { setQty(v); setQtyError(false); }}
                error={qtyError}
                inputRef={qtyInputRef}
              />
              {qtyError && <p className="text-xs text-destructive">O valor tem que ser maior que "0"</p>}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir peça
            </Button>
          </div>
          <div className="sticky bottom-0 -mx-6 mt-4 flex gap-3 border-t bg-background px-6 py-3">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="flex-1 h-11" onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" /> Salvar
            </Button>
          </div>
        </ResponsiveSheetContent>
      </Sheet>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta peça?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({
  group,
  onEdit,
  onDelete,
  onSave,
  onAddPart,
  readOnly = false,
  additionalHeader,
  isSelected = false,
  onSelectChange,
  compact = false,
  expanded: expandedProp,
  onExpandedChange,
  onDuplicate,
}) => {
  const { company } = useCompany();
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [editingPartIndex, setEditingPartIndex] = useState<number | null>(null);
  const [confirmDeleteOs, setConfirmDeleteOs] = useState(false);

  const expanded = expandedProp ?? internalExpanded;
  const setExpanded = (value: boolean) => {
    if (onExpandedChange) onExpandedChange(value);
    else setInternalExpanded(value);
  };

  const handleAddPartConfirm = (newPart: PickedPart) => {
    if (!onSave) return;
    onSave({ ...group, parts: [...(group.parts || []), newPart] });
    setIsAddingPart(false);
  };

  const handleAddPartsConfirm = (newParts: PickedPart[]) => {
    if (!onSave || newParts.length === 0) return;
    onSave({ ...group, parts: mergeParts(group.parts || [], newParts) });
    setIsAddingPart(false);
  };

  const handleDeletePart = (index: number) => {
    if (!onSave) return;
    const updatedParts = [...(group.parts || [])];
    updatedParts.splice(index, 1);
    onSave({ ...group, parts: updatedParts });
  };

  const handleUpdatePart = (index: number, updatedPart: OsPart) => {
    if (!onSave) return;
    const updatedParts = [...(group.parts || [])];
    updatedParts[index] = updatedPart;
    onSave({ ...group, parts: updatedParts });
  };

  const toggleAddPart = () => {
    if (onSave) {
      setIsAddingPart(!isAddingPart);
    } else if (onAddPart) {
      onAddPart();
    }
  };

  const isPercurso = !!group.is_percurso;
  const partsCount = group.parts?.length || 0;

  if (compact) {
    const editingPart = editingPartIndex !== null ? group.parts?.[editingPartIndex] ?? null : null;
    return (
      <div
        className={cn(
          "relative bg-card rounded-lg border shadow-sm overflow-hidden",
          isSelected && (isPercurso ? "ring-2 ring-red-300" : "ring-2 ring-blue-300"),
        )}
        data-testid="os-card"
      >
        <div className={cn("absolute left-0 inset-y-0 w-1.5", isPercurso ? "bg-red-500" : "bg-blue-600")} aria-hidden="true" />

        <div className="flex items-start pl-1.5">
          {onSelectChange && (
            <label
              className="h-11 w-11 shrink-0 flex items-center justify-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  tap();
                  onSelectChange(!!checked);
                }}
                aria-label={`Selecionar AF ${group.af}`}
                className={cn(
                  "h-5 w-5 rounded",
                  isPercurso
                    ? "border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    : "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                )}
              />
            </label>
          )}

          <button
            type="button"
            className={cn("flex-1 min-w-0 text-left py-2.5 pr-1", !onSelectChange && "pl-3")}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            data-testid="os-card-toggle"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className={cn("font-bold text-base truncate", isPercurso ? "text-red-600" : "text-blue-600")}>
                {isPercurso ? (group.af ? `AF: ${group.af}` : 'Percurso sem AF') : `AF: ${group.af}`}
                {!isPercurso && group.os && <span className="font-semibold text-sm opacity-80"> · OS {group.os}</span>}
              </div>
              {(group.hora_inicio || group.hora_final) && (
                <span className="text-sm font-medium text-muted-foreground tabular-nums shrink-0">
                  {group.hora_inicio || '--:--'}–{group.hora_final || '--:--'}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-sm text-foreground/90 truncate">
              {isPercurso ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wide">
                    Percurso
                  </span>
                  <span className="text-red-600/80 font-medium">Tempo de Deslocamento</span>
                </span>
              ) : (
                <>
                  {group.servico_executado || <span className="text-muted-foreground italic">Sem descrição</span>}
                  {group.agregado && group.numero_agregado && (
                    <span className="text-muted-foreground"> · Agregado {group.numero_agregado}</span>
                  )}
                </>
              )}
            </div>
            {!isPercurso && (
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {partsCount === 0 ? 'Sem peças' : `${partsCount} ${partsCount === 1 ? 'peça' : 'peças'}`}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </div>
            )}
          </button>

          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-muted-foreground"
                  aria-label={`Opções da AF ${group.af || 'Percurso'}`}
                  data-testid="os-card-menu"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem className="min-h-11" onSelect={() => onEdit?.()}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar OS
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem className="min-h-11" onSelect={() => onDuplicate()} disabled={!group.hora_final}>
                    <CopyPlus className="h-4 w-4 mr-2" /> Nova OS a partir de {group.hora_final || '--:--'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="min-h-11 text-red-600 focus:text-red-700"
                  onSelect={() => setConfirmDeleteOs(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {expanded && !isPercurso && (
          <div className="border-t ml-1.5 animate-in fade-in slide-in-from-top-1 duration-150" data-testid="os-card-details">
            {partsCount > 0 && (
              <div className="divide-y divide-border/50">
                {group.parts!.map((part, index) => (
                  <CompactPartRow
                    key={index}
                    part={part}
                    company={company}
                    readOnly={readOnly}
                    onOpen={() => setEditingPartIndex(index)}
                  />
                ))}
              </div>
            )}
            {!readOnly && onSave && (
              <div className="p-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  className="w-full h-11 text-primary justify-center"
                  onClick={() => setIsAddingPart(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> Adicionar peça
                </Button>
              </div>
            )}
          </div>
        )}

        {!readOnly && onSave && (
          <>
            {isAddingPart && (
              <Suspense fallback={null}>
                <PartPickerSheet
                  open
                  onOpenChange={setIsAddingPart}
                  subtitle={`AF ${group.af}${group.os ? ` · OS ${group.os}` : ''}`}
                  onConfirm={handleAddPartsConfirm}
                />
              </Suspense>
            )}

            {editingPart && (
              <PartEditSheet
                part={editingPart}
                onClose={() => setEditingPartIndex(null)}
                onSave={(p) => {
                  if (editingPartIndex !== null) handleUpdatePart(editingPartIndex, p);
                  setEditingPartIndex(null);
                }}
                onDelete={() => {
                  if (editingPartIndex !== null) handleDeletePart(editingPartIndex);
                  setEditingPartIndex(null);
                }}
              />
            )}

            <AlertDialog open={confirmDeleteOs} onOpenChange={setConfirmDeleteOs}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente esta Ordem de Serviço e todos os seus itens.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card shadow-sm rounded-sm overflow-hidden overflow-visible">
      <div className={cn("h-1 w-full", isPercurso ? "bg-red-500" : "bg-blue-600")}></div>

      {additionalHeader}

      <div className={cn("p-4 border-b", isPercurso ? "bg-red-50/20 border-red-100/30" : "bg-blue-50/30 border-blue-100/50")}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {!readOnly && (
              <div className="hidden md:flex pt-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>
            )}

            {onSelectChange && (
              <div className="pt-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectChange(!!checked)}
                  aria-label={`Selecionar AF ${group.af}`}
                  className={cn(
                    "h-5 w-5 rounded cursor-pointer transition-colors",
                    isPercurso
                      ? "border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      : "border-blue-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  )}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-lg font-bold flex items-center gap-2", isPercurso ? "text-red-600" : "text-blue-600")}>
                  {isPercurso ? (
                    <>
                      {group.af ? `AF: ${group.af}` : 'Percurso sem AF'}
                      <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wide">
                        Percurso
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span>AF: {group.af}</span>
                      {group.os && <span className="text-blue-600/80 text-base font-semibold">(OS: {group.os})</span>}
                      {!isPercurso && group.agregado && group.numero_agregado && (
                        <span className="text-blue-600/80 text-base font-semibold">
                          • Agregado: {group.numero_agregado}
                        </span>
                      )}
                    </span>
                  )}
                </h3>
              </div>

              {(group.hora_inicio || group.hora_final) && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-2" />
                  <span>{group.hora_inicio || '--:--'} - {group.hora_final || '--:--'}</span>
                </div>
              )}

              <div className="text-foreground font-medium">
                {isPercurso ? (
                  <span className="text-red-600/80 font-semibold text-sm">Tempo de Deslocamento</span>
                ) : (
                  <>Serviço: {group.servico_executado || <span className="text-muted-foreground italic font-normal">Sem descrição</span>}</>
                )}
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 self-end md:self-start">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar OS</TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Excluir OS</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente esta Ordem de Serviço e todos os seus itens.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      <div className="p-0">
        {group.parts && group.parts.length > 0 && (
          <div className="divide-y divide-border/40">
            {group.parts.map((part, index) => (
              <ServiceOrderPartRow
                key={index}
                part={part}
                index={index}
                onDelete={handleDeletePart}
                onUpdate={handleUpdatePart}
                company={company}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="p-4 border-t border-border/40">
            {!isAddingPart ? (
              <div className="flex justify-center">
                <Button variant="outline" onClick={toggleAddPart} className="gap-2 text-foreground/80 hover:text-foreground">
                  <PlusCircle className="h-4 w-4" /> Adicionar Peça
                </Button>
              </div>
            ) : (
              <div className="bg-muted/30 p-4 rounded-md border animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                       <PlusCircle className="h-4 w-4" /> Nova Peça
                    </h4>
                    <Button variant="ghost" size="sm" onClick={toggleAddPart} className="h-6 w-6 p-0 rounded-full">
                       <X className="h-3 w-3" />
                    </Button>
                 </div>
                 <ServiceOrderPartPicker onConfirm={handleAddPartConfirm} onCancel={() => setIsAddingPart(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceOrderListDisplay;
