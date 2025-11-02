"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, List as ListIcon, Search } from 'lucide-react'; // Adicionado Search icon
import { Part, getRelatedPartsByCode } from '@/services/partListService'; // Importar a nova função e o tipo Part
import { showError } from '@/utils/toast';
import { Link } from 'react-router-dom'; // Mantido caso queira linkar para SearchParts

interface RelatedItemsHoverCardProps {
  children: React.ReactNode;
  partCode: string | null;
  currentPartId: string; // Novo prop para o ID da peça atual
}

const RelatedItemsHoverCard: React.FC<RelatedItemsHoverCardProps> = ({
  children,
  partCode,
  currentPartId,
}) => {
  const [relatedParts, setRelatedParts] = useState<Part[]>([]); // Alterado para Part[]
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchRelated = useCallback(async () => {
    console.log('RelatedItemsHoverCard: fetchRelated called. isOpen:', isOpen);
    console.log('RelatedItemsHoverCard: Props - partCode:', partCode, 'currentPartId:', currentPartId);

    if (!partCode) {
      console.log('RelatedItemsHoverCard: No partCode, skipping fetch.');
      setRelatedParts([]);
      return;
    }

    setIsLoading(true);
    try {
      // Usando a nova função que busca diretamente da tabela 'parts'
      const parts = await getRelatedPartsByCode(partCode, currentPartId);
      console.log('RelatedItemsHoverCard: Fetched related parts:', parts);
      setRelatedParts(parts);
    } catch (error) {
      console.error('RelatedItemsHoverCard: Failed to fetch related parts:', error);
      showError('Erro ao carregar peças relacionadas.');
    } finally {
      setIsLoading(false);
    }
  }, [partCode, currentPartId, isOpen]);

  // Busca os itens relacionados apenas quando o HoverCard é aberto
  useEffect(() => {
    if (isOpen) {
      fetchRelated();
    } else {
      setRelatedParts([]); // Limpa os itens quando o card é fechado
    }
  }, [isOpen, fetchRelated]);

  console.log('RelatedItemsHoverCard: Rendering. relatedParts.length:', relatedParts.length, 'isLoading:', isLoading);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0">
        <Card className="w-full shadow-none border-none">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Peças Relacionadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : relatedParts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma outra peça encontrada com o mesmo código.
              </p>
            ) : (
              <div className="space-y-2">
                {relatedParts.map((part) => (
                  <div key={part.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                    <p className="text-sm font-medium text-primary">{part.codigo}</p>
                    <p className="text-xs text-muted-foreground">{part.name || part.descricao}</p>
                    {/* Você pode adicionar um link para a página de busca de peças se desejar */}
                    {/* <Link to={`/search-parts?query=${part.codigo}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                      <Search className="h-3 w-3" /> Ver detalhes
                    </Link> */}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </HoverCardContent>
    </HoverCard>
  );
};

export default RelatedItemsHoverCard;