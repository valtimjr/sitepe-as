import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Clock, Car } from 'lucide-react';
import { ServiceOrderData } from '@/types/supabase';
import { cn } from '@/lib/utils';

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit: () => void;
  onDelete: () => void;
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ group, onEdit, onDelete }) => {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardContent className="p-0">
        <div className="bg-muted/40 p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
                AF: {group.af}
              </span>
              {group.os && (
                <span className="bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs font-bold">
                  OS: {group.os}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {group.hora_inicio || '??'} - {group.hora_final || '??'}
              </div>
            </div>

            {group.servico_executado && (
              <p className="text-sm font-medium mt-2 leading-relaxed">
                {group.servico_executado}
              </p>
            )}
          </div>

          <div className="flex gap-2 shrink-0 self-end sm:self-start">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {group.parts && group.parts.length > 0 && (
          <div className="border-t">
            <Table>
              <TableBody>
                {group.parts.map((part, idx) => (
                  <TableRow key={idx} className="hover:bg-transparent odd:bg-zinc-50/50 dark:odd:bg-zinc-900/50">
                    <TableCell className="py-2 pl-4">
                      <span className="text-xs font-bold text-primary mr-2">{part.codigo_peca}</span>
                      <span className="text-xs text-muted-foreground">{part.descricao}</span>
                    </TableCell>
                    <TableCell className="py-2 text-right pr-4">
                      <span className="text-xs font-medium">Qtd: {part.quantidade}</span>
                    </TableCell>
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