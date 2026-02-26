"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceOrderData } from '@/types/supabase';
import { Clock, Pencil, Trash2, Tag, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit: () => void;
  onDelete: () => void;
  onAddPart: () => void;
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ group, onEdit, onDelete, onAddPart }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="border-l-4 border-l-primary overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-primary">AF: {group.af}</h3>
              {group.os && (
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                  OS: {group.os}
                </span>
              )}
            </div>
            
            {(group.hora_inicio || group.hora_final) && (
              <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{group.hora_inicio || '??:??'} - {group.hora_final || '??:??'}</span>
              </div>
            )}

            {group.servico_executado && (
              <p className="text-sm text-foreground/80 leading-relaxed pt-1">
                {group.servico_executado}
              </p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Botão Adicionar Peça - Simplificado e com cor primária para visibilidade */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onAddPart} 
                  className="h-9 w-9 text-primary border-primary/50 hover:bg-primary/10"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar Peça</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-9 w-9">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-9 w-9">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && group.parts && group.parts.length > 0 && (
          <div className="border-t bg-muted/20">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="h-10 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold py-0">Peça</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold py-0">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.parts.map((part, i) => (
                  <TableRow key={i} className="hover:bg-muted/40">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{part.codigo_peca}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">
                            {part.descricao}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">{part.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceOrderListDisplay;