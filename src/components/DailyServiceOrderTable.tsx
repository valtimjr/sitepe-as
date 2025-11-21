"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DailyServiceOrder, ServiceOrderEntry, ServiceOrderPart } from '@/types/supabase'; // Importar DailyServiceOrder, ServiceOrderEntry, ServiceOrderPart
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateDurationInMinutes, formatMinutesToHoursAndMinutes } from '@/services/dailyServiceOrderService';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';
import RelatedPartDisplay from './RelatedPartDisplay'; // Importar RelatedPartDisplay

interface DailyServiceOrderTableProps {
  reports: DailyServiceOrder[];
}

const DailyServiceOrderTable: React.FC<DailyServiceOrderTableProps> = ({ reports }) => {
  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);

  return (
    <ScrollArea className="h-[600px] w-full rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead className="w-[120px]">Funcionário</TableHead>
            <TableHead className="w-[80px]">AF</TableHead>
            <TableHead className="w-[80px]">OS</TableHead>
            <TableHead className="w-[120px]">Horário</TableHead>
            <TableHead className="w-[80px]">Duração</TableHead>
            <TableHead>Serviço Executado</TableHead>
            <TableHead className="w-[150px]">Peças</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map(dailyOrder => (
            dailyOrder.os_list.length > 0 ? (
              dailyOrder.os_list.map((osEntry, osIndex) => {
                const isFirstOsOfDate = osIndex === 0;
                const totalDuration = calculateDurationInMinutes(osEntry.hora_inicio, osEntry.hora_final);
                const hasParts = osEntry.parts && osEntry.parts.length > 0;

                return (
                  <TableRow key={`${dailyOrder.id}-${osIndex}`}>
                    {isFirstOsOfDate && (
                      <TableCell rowSpan={dailyOrder.os_list.length} className="align-top font-medium">
                        {format(parseISO(dailyOrder.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                    )}
                    {isFirstOsOfDate && (
                      <TableCell rowSpan={dailyOrder.os_list.length} className="align-top">
                        <div className="flex flex-col">
                          <span className="font-medium">{dailyOrder.user_name}</span>
                          <span className="text-xs text-muted-foreground">{dailyOrder.user_badge}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{osEntry.af}</TableCell>
                    <TableCell>{osEntry.os || 'N/A'}</TableCell>
                    <TableCell>{osEntry.hora_inicio && osEntry.hora_final ? `${osEntry.hora_inicio} - ${osEntry.hora_final}` : 'N/A'}</TableCell>
                    <TableCell className={cn("font-medium", totalDuration === 0 && "text-muted-foreground")}>
                      {formatMinutesToHoursAndMinutes(totalDuration)}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[200px]">{osEntry.servico_executado || 'N/A'}</TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[150px]">
                      {hasParts ? (
                        <Popover 
                          open={openRelatedItemsPopoverId === `${dailyOrder.id}-${osIndex}`} 
                          onOpenChange={(open) => setOpenRelatedItemsPopoverId(open ? `${dailyOrder.id}-${osIndex}` : null)}
                          modal={false}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 flex items-center gap-1 h-auto py-0 px-1">
                              <Tag className="h-3 w-3" /> {osEntry.parts.length}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto max-w-xs p-2">
                            <p className="font-bold mb-1 text-sm">Peças:</p>
                            <ScrollArea className="h-24">
                              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                {osEntry.parts.map((part: ServiceOrderPart) => (
                                  <li key={part.id} className="list-none ml-0">
                                    <RelatedPartDisplay item={{ codigo: part.codigo_peca || '', name: part.descricao || '', desc: '' }} />
                                    {part.quantidade && ` (Qtd: ${part.quantidade})`}
                                  </li>
                                ))}
                              </ul>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow key={dailyOrder.id}>
                <TableCell className="font-medium">{format(parseISO(dailyOrder.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                <TableCell>{dailyOrder.user_name} ({dailyOrder.user_badge})</TableCell>
                <TableCell colSpan={6} className="text-muted-foreground italic">Nenhuma OS registrada para este dia.</TableCell>
              </TableRow>
            )
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default DailyServiceOrderTable;