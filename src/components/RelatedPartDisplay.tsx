import React from 'react';
import { cn } from '@/lib/utils';
import { RelatedPart, RelatedItem } from '@/types/supabase';

interface RelatedPartDisplayProps {
  item: RelatedItem;
}

const RelatedPartDisplay: React.FC<RelatedPartDisplayProps> = ({ item }) => {
  let codigo: string;
  let mainText: string;
  let subText: string | undefined;

  // Lida com ambos os formatos para compatibilidade durante a transição
  if (typeof item === 'string') {
    const parts = item.split('|');
    codigo = parts[0] || '';
    mainText = parts[1] || '';
    subText = parts[2] || '';
  } else {
    codigo = item.codigo;
    mainText = item.name;
    subText = item.desc;
  }

  return (
    <div className="flex flex-col items-start">
      <span className="font-medium text-sm flex items-start">
        <span className="mr-1">•</span>
        {codigo} - {mainText}
      </span>
      {subText && subText.trim() !== '' && (
        <span className={cn(
          "text-xs italic text-muted-foreground max-w-full whitespace-normal break-words pl-3",
          mainText && mainText.trim().toLowerCase() === subText.trim().toLowerCase() && 'hidden'
        )}>
          {subText}
        </span>
      )}
    </div>
  );
};

export default RelatedPartDisplay;