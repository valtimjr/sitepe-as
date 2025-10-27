import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Copy, Download, MoreHorizontal, Clock3, CheckCircle, XCircle, Ban, Info, Trash2 } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Apontamento } from '@/services/partListService';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Mapeamento de Status para Ícone e Estilo
const STATUS_MAP = {
  Folga: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    displayName: 'Folga',
  },
  Falta: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    displayName: 'Falta',
  },
  Suspensao: {
    icon: Ban,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    displayName: 'Suspensão',
  },
  Outros: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    displayName: 'Outros',
  },
};

interface TimeTrackingTableProps {
  currentDate: Date;
  daysInMonth: Date[];
  apontamentos: Apontamento[];
  monthYearTitle: string;
  isSaving: boolean;
  
  // Handlers
  handleMonthChange: (direction: 'prev' | 'next') => void;
  handleCopyText: () => Promise<void>;
  handleShareOnWhatsApp: () => void;
  handleExportPdf: () => void;
  handleTimeChange: (day: Date, field: 'entry_time' | 'exit_time', value: string) => Promise<void>;
  handleClearStatus: (day: Date) => Promise<void>;
  handleStatusChange: (day: Date, status: string) => Promise<void>;
  handleOpenOtherStatusDialog: (day: Date) => void;
  handleDeleteApontamento: (id: string) => Promise<void>;
  calculateTotalHours: (entry?: string, exit?: string) => string;
}

const TimeTrackingTable: React.FC<TimeTrackingTableProps> = ({
  currentDate,
  daysInMonth,
  apontamentos,
  monthYearTitle,
  isSaving,
  handleMonthChange,
  handleCopyText,
  handleShareOnWhatsApp,
  handleExportPdf,
  handleTimeChange,
  handleClearStatus,
  handleStatusChange,
  handleOpenOtherStatusDialog,
  handleDeleteApontamento,
  calculateTotalHours,
}) => {

  const getApontamentoForDay = (day: Date): Apontamento | undefined => {
    const dateString = format(day, 'yyyy-MM-dd');
    return apontamentos.find(a => a.date === dateString);
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => handleMonthChange('prev')} size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl font-semibold capitalize">
            {monthYearTitle}
          </CardTitle>
          <Button variant="ghost" onClick={() => handleMonthChange('next')} size="icon">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button onClick={handleCopyText} className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copiar Texto
          </Button>
          <Button 
            onClick={handleShareOnWhatsApp} 
            variant="ghost" 
            className="h-10 w-10 p-0 rounded-full" 
            aria-label="Compartilhar no WhatsApp" 
          >
            <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-full w-full" />
          </Button>
          <Button onClick={handleExportPdf} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Dia</TableHead> 
                <TableHead className="w-auto min-w-[160px]">Horas / Status</TableHead>
                <TableHead className="w-[80px]">Total</TableHead> 
                <TableHead className="w-[80px] text-right">Ações</TableHead> 
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysInMonth.map((day) => {
                const apontamento = getApontamentoForDay(day);
                const dateString = format(day, 'yyyy-MM-dd');
                const dayName = format(day, 'EEE', { locale: ptBR });
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const hasStatus = !!apontamento?.status;
                
                const statusKey = hasStatus ? (apontamento.status.includes('Outros') ? 'Outros' : apontamento.status) : null;
                const statusInfo = statusKey ? STATUS_MAP[statusKey as keyof typeof STATUS_MAP] : null;
                const StatusIcon = statusInfo?.icon;
                const statusDisplayName = statusInfo?.displayName || 'Status';
                const statusDescription = apontamento?.status?.includes(':') ? apontamento.status.split(': ')[1] : '';

                return (
                  <TableRow key={dateString} className={isWeekend ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">
                      {format(day, 'dd/MM')} ({dayName})
                    </TableCell>
                    
                    <TableCell className="space-y-2">
                      {hasStatus ? (
                        <div className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-md",
                          statusInfo?.bgColor
                        )}>
                          <div className="flex items-center gap-2">
                            {StatusIcon && <StatusIcon className={cn("h-5 w-5", statusInfo?.color)} />}
                            <span className={cn("font-semibold", statusInfo?.color)}>
                              {statusDisplayName}
                            </span>
                          </div>
                          {statusDescription && (
                            <span className="text-xs text-muted-foreground mt-1 text-center">
                              {statusDescription}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <div className="flex-1">
                            <Label htmlFor={`entry-${dateString}`} className="sr-only">Entrada</Label>
                            <Input
                              id={`entry-${dateString}`}
                              type="time"
                              value={apontamento?.entry_time || ''}
                              onChange={(e) => handleTimeChange(day, 'entry_time', e.target.value)}
                              disabled={isSaving}
                              className="p-1 h-8 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`exit-${dateString}`} className="sr-only">Saída</Label>
                            <Input
                              id={`exit-${dateString}`}
                              type="time"
                              value={apontamento?.exit_time || ''}
                              onChange={(e) => handleTimeChange(day, 'exit_time', e.target.value)}
                              disabled={isSaving}
                              className="p-1 h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="font-semibold text-sm">
                      {hasStatus ? statusDisplayName : calculateTotalHours(apontamento?.entry_time, apontamento?.exit_time)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        {hasStatus ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClearStatus(day)}
                                disabled={isSaving}
                                aria-label="Reverter para Horas"
                              >
                                <Clock3 className="h-4 w-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reverter para Horas</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(day, 'Folga')}
                            disabled={isSaving}
                            className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                          >
                            Folga
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isSaving}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(day, 'Falta')} disabled={hasStatus}>
                              Falta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(day, 'Suspensao')} disabled={hasStatus}>
                              Suspensão
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenOtherStatusDialog(day)} disabled={hasStatus}>
                              Outros...
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {apontamento && (
                              <DropdownMenuItem onClick={() => handleDeleteApontamento(apontamento.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir Registro
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeTrackingTable;