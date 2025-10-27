import React from 'react';
import { Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimeTrackingHeaderProps {
  employeeHeader: string;
}

const TimeTrackingHeader: React.FC<TimeTrackingHeaderProps> = ({ employeeHeader }) => (
  <div className="flex justify-between items-center mb-4 mt-8">
    <div className="flex flex-col items-start">
      <h1 className="text-4xl font-extrabold text-primary dark:text-primary flex items-center gap-3">
        <Clock className="h-8 w-8 text-primary" />
        Apontamento de Horas
      </h1>
      <p className="text-lg font-semibold text-foreground/70 mt-1">
        {employeeHeader}
      </p>
    </div>
    <a href="https://escala.eletricarpm.com.br" target="_blank" rel="noopener noreferrer">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-16 w-16 !p-0 [&>svg]:!h-16 [&>svg]:!w-16" 
            aria-label="Visualizar Escala Anual"
          >
            <CalendarDays className="h-16 w-16 text-primary" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Visualizar Escala Anual</TooltipContent>
      </Tooltip>
    </a>
  </div>
);

export default TimeTrackingHeader;