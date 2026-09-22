"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, searchPartsPaginated } from '@/services/partListService';
import { useCompany } from '@/context/CompanyContext';

interface PartCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPart: (part: Part | null) => void;
  selectedPart?: Part | null;
  isLoading?: boolean;
}

const PartCodeInput: React.FC<PartCodeInputProps> = ({ value, onChange, onSelectPart, selectedPart, isLoading = false }) => {
  const { company } = useCompany();
  const [isSearchingInternal, setIsSearchingInternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      if (value !== inputRef.current.value) {
        inputRef.current.value = value;
      }
    }
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const currentInputValue = inputRef.current?.value || '';
      const trimmedQuery = currentInputValue.trim();

      if (trimmedQuery.length > 0) {
        setIsSearchingInternal(true);
        try {
          const { parts: results } = await searchPartsPaginated(trimmedQuery, company, 1, 1);
          
          if (results.length === 1 && results[0].codigo.toLowerCase() === trimmedQuery.toLowerCase()) {
            onSelectPart(results[0]);
          } else {
            onSelectPart(null);
          }
        } catch (error) {
          onSelectPart(null);
        } finally {
          setIsSearchingInternal(false);
        }
      } else {
        onSelectPart(null);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputRef.current?.value, onSelectPart, company]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
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
        defaultValue={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={isLoading}
        ref={inputRef}
        className={cn(
          "pr-8",
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