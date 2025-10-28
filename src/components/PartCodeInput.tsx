"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, searchParts } from '@/services'; // Import searchParts from services

interface PartCodeInputProps {
  value: string; // O código da peça digitado ou o código da peça selecionada
  onChange: (value: string) => void; // Chamado quando o usuário digita
  onSelectPart: (part: Part | null) => void; // Chamado quando uma peça é encontrada/selecionada ou não
  selectedPart?: Part | null; // A peça atualmente selecionada (passada pelo pai)
  isLoading?: boolean; // Prop para indicar carregamento externo (ex: do formulário pai)
}

const PartCodeInput: React.FC<PartCodeInputProps> = ({ value, onChange, onSelectPart, selectedPart, isLoading = false }) => {
  const [isSearchingInternal, setIsSearchingInternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o valor interno com a prop 'value' (útil para resetar o campo do pai)
  useEffect(() => {
    // Apenas atualiza o estado interno se o valor da prop for diferente
    // e se o campo não estiver focado para evitar sobrescrever a digitação do usuário
    if (inputRef.current && document.activeElement !== inputRef.current) {
      if (value !== inputRef.current.value) {
        inputRef.current.value = value;
      }
    }
  }, [value]);

  // Debounce para a busca da peça no Supabase
  useEffect(() => {
    const handler = setTimeout(async () => {
      const currentInputValue = inputRef.current?.value || '';
      const trimmedQuery = currentInputValue.trim();

      if (trimmedQuery.length > 0) {
        setIsSearchingInternal(true);
        try {
          const results = await searchParts(trimmedQuery);
          if (results.length === 1 && results[0].codigo.toLowerCase() === trimmedQuery.toLowerCase()) {
            onSelectPart(results[0]); // Peça encontrada e exata
          } else {
            onSelectPart(null); // Nenhuma peça exata ou múltiplas encontradas
          }
        } catch (error) {
          console.error("Error during part search:", error);
          onSelectPart(null);
        } finally {
          setIsSearchingInternal(false);
        }
      } else {
        onSelectPart(null); // Campo vazio, nenhuma peça selecionada
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [inputRef.current?.value, onSelectPart]); // Depende do valor atual do input

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value); // Notifica o componente pai sobre a digitação
  };

  const handleFocus = () => {
    // Removida a lógica de limpar o campo ao focar novamente.
    // O campo agora manterá seu valor atual.
  };

  const handleBlur = () => {
    // Quando desfocar, se o input estiver vazio e houver uma peça selecionada, reseta a seleção
    if (inputRef.current?.value.trim() === '' && selectedPart) {
      onSelectPart(null);
    }
  };

  return (
    <div className="relative">
      <Input
        id="part-code-input"
        type="text"
        placeholder="Digite o código da peça"
        defaultValue={value} // Usa defaultValue para permitir controle interno via ref
        onChange={handleInputChange}
        onFocus={handleFocus} // onFocus agora não faz nada para limpar
        onBlur={handleBlur}
        disabled={isLoading}
        ref={inputRef}
        className={cn(
          "pr-8", // Espaço para o ícone de carregamento
          (isSearchingInternal || isLoading) && "opacity-70"
        )}
      />
      {(isSearchingInternal || isLoading) && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
};

export default PartCodeInput;