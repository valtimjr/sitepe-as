import React, { useEffect, useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnnualScheduleCalendar from '@/components/AnnualScheduleCalendar';
import { ALL_TURNS, ShiftTurn } from '@/services/shiftService';

const AnnualScheduleView: React.FC = () => {
  const [selectedTurn, setSelectedTurn] = useState<ShiftTurn>(ALL_TURNS[0]);

  useEffect(() => {
    document.title = "Escala Anual - AutoBoard";
    // Carrega o turno salvo localmente na inicialização
    const savedTurn = localStorage.getItem('selectedShiftTurn') as ShiftTurn;
    if (savedTurn && ALL_TURNS.includes(savedTurn)) {
      setSelectedTurn(savedTurn);
    }
  }, []);

  const handleTurnChange = (turn: ShiftTurn) => {
    setSelectedTurn(turn);
    localStorage.setItem('selectedShiftTurn', turn);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4 mt-8">
        <Link to="/time-tracking">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para Apontamento
          </Button>
        </Link>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <CalendarDays className="h-8 w-8 text-primary" />
        Escala Anual
      </h1>

      <div className="w-full max-w-6xl">
        <AnnualScheduleCalendar 
          initialTurn={selectedTurn} 
          onTurnChange={handleTurnChange} 
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default AnnualScheduleView;