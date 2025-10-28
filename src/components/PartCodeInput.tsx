"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, searchParts } from '@/services'; // Import searchParts from services

interface PartCodeInputProps {
  value: string; // O código da peça digitado ou o código da peça selecionada
  onChange: (value: string) => void; // Chamado quando o usuário digita
  onSelectPart: (part: Part | null) => void; // Chamado quando uma peça é encontrada/selecionada ou não
  isLoading?: boolean; // Prop para indicar carregamento externo (ex: do formulário pai)
}

const PartCodeInput: React.FC<PartCodeInputProps> = ({ value, onChange, onSelectPart, isLoading = false }) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState(value);
  const [isSearchingInternal, setIsSearchingInternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o valor interno com a prop 'value' (útil para resetar o campo do pai)
  useEffect(() => {
    setInternalSearchQuery(value);
  }, [value]);

  // Debounce para a busca da peça no Supabase
  useEffect(() => {
    const handler = setTimeout(async () => {
      const trimmedQuery = internalSearchQuery.trim();
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
  }, [internalSearchQuery, onSelectPart]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalSearchQuery(newValue);
    onChange(newValue); // Notifica o componente pai sobre a digitação
  };

  return (
    <div className="relative">
      <Input
        id="part-code-input"
        type="text"
        placeholder="Digite o código da peça"
        value={internalSearchQuery}
        onChange={handleInputChange}
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