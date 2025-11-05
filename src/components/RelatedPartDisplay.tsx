import React from 'react';
import { cn } from '@/lib/utils';

interface RelatedPartDisplayProps {
  formattedString: string;
}

/**
 * Desformata e exibe a string de item relacionado no formato:
 * • CÓDIGO - NOME/DESCRIÇÃO PRINCIPAL
 *   (Descrição Secundária, se houver)
 * 
 * Formato da string de entrada: CÓDIGO|NOME/DESCRIÇÃO PRINCIPAL|DESCRIÇÃO SECUNDÁRIA
 */
const RelatedPartDisplay: React.FC<RelatedPartDisplayProps> = ({ formattedString }) => {
  const parts = formattedString.split('|');
  const codigo = parts[0];
  const mainText = parts[1];
  const subText = parts[2];

  return (
    <div className="flex flex-col items-start">
      <span className="font-medium text-sm flex items-start">
        <span className="mr-1">•</span>
        {codigo} - {mainText}
      </span>
      {subText && subText.trim() !== '' && (
        <span className={cn(
          "text-xs italic text-muted-foreground max-w-full whitespace-normal break-words pl-3", // Adicionado padding-left para alinhar
          // Se o mainText for igual ao subText (caso de fallback), não exibe o subText
          mainText.trim().toLowerCase() === subText.trim().toLowerCase() && 'hidden'
        )}>
          {subText}
        </span>
      )}
    </div>
  );
};

export default RelatedPartDisplay;