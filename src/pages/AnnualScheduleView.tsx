import React, { useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const AnnualScheduleView: React.FC = () => {
  useEffect(() => {
    document.title = "Escala Anual - EletricaRPM";
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4 mt-8">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para o Início
          </Button>
        </Link>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-4 text-center text-primary dark:text-primary flex items-center gap-3">
        <CalendarDays className="h-8 w-8 text-primary" />
        Escala Anual (EletricaRPM)
      </h1>

      <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
        <CardContent className="flex-1 p-0">
          <iframe
            src="https://escala.eletricarpm.com.br"
            title="Escala Anual Externa"
            className="w-full h-full border-0 rounded-lg"
            style={{ minHeight: '600px' }}
          />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default AnnualScheduleView;