"use client";

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ChevronLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useCompany } from '@/context/CompanyContext';

const TagManagerPage = () => {
  const { company, branding } = useCompany();

  useEffect(() => {
    document.title = `Gerenciar Tags - AutoBoard (${branding.name})`;
  }, [branding.name]);

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-primary">
          <Wrench className="h-8 w-8" />
          Gerenciar Tags
        </h1>
        <Button variant="outline" asChild>
          <Link to={`/${company}`}><ChevronLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
      </div>

      <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 mb-8">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle>Dica de Gerenciamento</AlertTitle>
        <AlertDescription>
          Para gerenciar as tags das peças individualmente ou em massa, utilize a aba "Gerenciar Peças" no 
          <Link to={`/${company}/admin`} className="ml-1 font-bold underline">Gerenciador de Banco de Dados</Link>.
        </AlertDescription>
      </Alert>

      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg bg-muted/10">
        <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Ferramenta em Desenvolvimento</h2>
        <p className="text-muted-foreground mb-6">
          Em breve você poderá criar categorias de tags globais e gerenciar dicionários de sinônimos aqui.
        </p>
        <Button asChild>
          <Link to={`/${company}/admin`}>Ir para Gestão de Peças</Link>
        </Button>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default TagManagerPage;