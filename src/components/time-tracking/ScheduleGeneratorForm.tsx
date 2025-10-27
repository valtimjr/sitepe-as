import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarCheck, Eraser } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShiftTurn, ALL_TURNS } from '@/services/shiftService';

interface ScheduleGeneratorFormProps {
  currentDate: Date;
  selectedTurn: ShiftTurn | undefined;
  isGeneratingSchedule: boolean;
  isSaving: boolean;
  handleTurnChange: (turn: ShiftTurn) => void;
  handleGenerateSchedule: () => Promise<void>;
  handleClearMonth: () => Promise<void>;
}

const ScheduleGeneratorForm: React.FC<ScheduleGeneratorFormProps> = ({
  currentDate,
  selectedTurn,
  isGeneratingSchedule,
  isSaving,
  handleTurnChange,
  handleGenerateSchedule,
  handleClearMonth,
}) => {
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-xl">Gerar Escala Automática</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Label htmlFor="shift-turn">Selecione seu Turno</Label>
          <Select 
            value={selectedTurn} 
            onValueChange={handleTurnChange} 
            disabled={isGeneratingSchedule}
          >
            <SelectTrigger id="shift-turn" className="w-full">
              <SelectValue placeholder="Selecione o Turno" />
            </SelectTrigger>
            <SelectContent>
              {ALL_TURNS.map(turn => (
                <SelectItem key={turn} value={turn}>{turn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2 w-full sm:w-auto" disabled={isSaving || isGeneratingSchedule}>
                <Eraser className="h-4 w-4" /> Limpar Mês
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover TODOS os apontamentos para o mês de {monthName}. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearMonth}>Limpar Agora</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            onClick={handleGenerateSchedule} 
            disabled={!selectedTurn || isGeneratingSchedule || isSaving}
            className="w-full sm:w-auto"
          >
            {isGeneratingSchedule ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarCheck className="mr-2 h-4 w-4" />
            )}
            Gerar Escala
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleGeneratorForm;