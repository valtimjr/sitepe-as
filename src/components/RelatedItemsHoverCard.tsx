"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, List as ListIcon } from 'lucide-react';
import { getRelatedCustomListItems } from '@/services/customListService';
import { CustomListItem } from '@/types/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RelatedItemsHoverCardProps {
  children: React.ReactNode;
  partCode: string | null;
  itemName: string;
  excludeItemId: string;
  excludeListId: string;
}

const RelatedItemsHoverCard: React.FC<RelatedItemsHoverCardProps> = ({
  children,
  partCode,
  itemName,
  excludeItemId,
  excludeListId,
}) => {
  const [relatedItems, setRelatedItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchRelated = useCallback(async () => {
    console.log('RelatedItemsHoverCard: fetchRelated called. isOpen:', isOpen);
    console.log('RelatedItemsHoverCard: Props - partCode:', partCode, 'itemName:', itemName, 'excludeItemId:', excludeItemId, 'excludeListId:', excludeListId);

    if (!partCode) { // Apenas verifica partCode, conforme a nova lógica de busca
      console.log('RelatedItemsHoverCard: No partCode, skipping fetch.');
      setRelatedItems([]);
      return; 
    }

    setIsLoading(true);
    try {
      // Passa itemName, mas a função de serviço agora o ignora para a busca principal
      const items = await getRelatedCustomListItems(partCode, itemName, excludeItemId, excludeListId);
      console.log('RelatedItemsHoverCard: Fetched related items:', items);
      setRelatedItems(items);
    } catch (error) {
      console.error('RelatedItemsHoverCard: Failed to fetch related items:', error);
      showError('Erro ao carregar itens relacionados.');
    } finally {
      setIsLoading(false);
    }
  }, [partCode, itemName, excludeItemId, excludeListId, isOpen]);

  // Busca os itens relacionados apenas quando o HoverCard é aberto
  useEffect(() => {
    if (isOpen) {
      fetchRelated();
    } else {
      setRelatedItems([]); // Limpa os itens quando o card é fechado
    }
  }, [isOpen, fetchRelated]);

  console.log('RelatedItemsHoverCard: Rendering. relatedItems.length:', relatedItems.length, 'isLoading:', isLoading);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0">
        <Card className="w-full shadow-none border-none">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListIcon className="h-4 w-4" /> Itens Relacionados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : relatedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum item relacionado encontrado.
              </p>
            ) : (
              <div className="space-y-2">
                {relatedItems.map((item) => (
                  <div key={item.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                    <p className="text-sm font-medium">{item.item_name}</p>
                    {item.part_code && (
                      <p className="text-xs text-muted-foreground">Cód: {item.part_code}</p>
                    )}
                    {item.list_id && (
                      <Link to={`/custom-list/${item.list_id}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <ListIcon className="h-3 w-3" /> Ver na lista "{item.list_title}"
                      </Link>
                    )}
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