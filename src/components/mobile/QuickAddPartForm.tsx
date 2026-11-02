import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListSelectorDropdown } from '@/components/ListSelectorDropdown';
import { getListsData, addItemToList } from '@/services/localListStorage';
import { CompanyType } from '@/types/company';
import { showError, showSuccess } from '@/utils/toast';
import { success } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface QuickAddPartFormProps {
  part: { codigo: string; descricao: string };
  company: CompanyType;
  /** Chamado depois de adicionar com sucesso. */
  onDone: () => void;
  onCancel: () => void;
  /** Campos maiores, para toque (gaveta no mobile). */
  large?: boolean;
  idPrefix?: string;
}

/** Formulário de adição rápida de peça (quantidade, AF e lista). Usado em popover e gaveta. */
const QuickAddPartForm: React.FC<QuickAddPartFormProps> = ({ part, company, onDone, onCancel, large, idPrefix = 'quick' }) => {
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');

  const reset = () => {
    setQuantidade(1);
    setAf('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantidade <= 0) {
      showError('A quantidade deve ser maior que zero.');
      return;
    }

    setIsAdding(true);
    try {
      const listsData = await getListsData(company);
      let targetListId = selectedListId;
      if (!targetListId || listsData.lists.length <= 1) {
        targetListId = listsData.activeListId;
      }

      await addItemToList(company, targetListId, {
        codigo_peca: part.codigo,
        descricao: part.descricao,
        quantidade,
        af: af.trim() || undefined,
      });

      const targetList = listsData.lists.find(l => l.id === targetListId);
      showSuccess(`Peça ${part.codigo} adicionada em "${targetList ? targetList.name : 'sua lista'}"!`);
      success();
      window.dispatchEvent(new CustomEvent('part-added-to-list'));
      reset();
      onDone();
    } catch {
      showError('Erro ao adicionar peça.');
    } finally {
      setIsAdding(false);
    }
  };

  const inputClass = large ? 'h-11 text-base' : 'h-8 text-xs';
  const buttonClass = large ? 'h-11 flex-1 text-sm' : 'h-7 text-xs px-2';

  return (
    <form onSubmit={handleAdd} className="space-y-3 text-left" data-testid="quick-add-part-form">
      {!large && (
        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Adicionar à Minha Lista</div>
      )}
      <div className={cn('text-muted-foreground font-semibold', large ? 'text-sm line-clamp-2' : 'text-xs truncate')}>
        {part.codigo} - {part.descricao}
      </div>

      <div className={cn(large && 'grid grid-cols-2 gap-3', !large && 'space-y-3')}>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-qty-${part.codigo}`} className="text-[10px] font-semibold uppercase">
            Quantidade
          </Label>
          <Input
            id={`${idPrefix}-qty-${part.codigo}`}
            type="number"
            inputMode="numeric"
            min="1"
            value={quantidade}
            onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-af-${part.codigo}`} className="text-[10px] font-semibold uppercase">
            AF / Frota (Opcional)
          </Label>
          <Input
            id={`${idPrefix}-af-${part.codigo}`}
            type="text"
            placeholder="Ex: AF42"
            value={af}
            onChange={e => setAf(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <ListSelectorDropdown
        company={company}
        selectedListId={selectedListId}
        onSelectedListIdChange={setSelectedListId}
        part={{ codigo: part.codigo, descricao: part.descricao, quantidade, af: af.trim() || undefined }}
        onCreatedAndAdded={() => {
          success();
          reset();
          onDone();
        }}
      />

      <div className={cn('flex gap-2 pt-1', large ? 'justify-stretch' : 'justify-end')}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClass}
          onClick={e => {
            e.stopPropagation();
            onCancel();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" className={buttonClass} disabled={isAdding}>
          {isAdding ? 'Adicionando...' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
};

export default QuickAddPartForm;
