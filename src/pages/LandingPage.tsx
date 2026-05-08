"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Bem-vindo ao AutoBoard";
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-primary mb-4">AutoBoard</h1>
        <p className="text-xl text-muted-foreground">Sistema de Gestão para Manutenção Industrial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="hover:shadow-xl transition-all border-2 hover:border-primary/50 cursor-pointer group" onClick={() => navigate('/usina_vale')}>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Usina Vale</CardTitle>
            <CardDescription>Acesse o painel da Unidade Vale</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">
              Entrar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all border-2 hover:border-orange-500/50 cursor-pointer group" onClick={() => navigate('/citrosuco')}>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-orange-500" />
            </div>
            <CardTitle className="text-2xl">Citrosuco</CardTitle>
            <CardDescription>Acesse o painel da Unidade Citrosuco</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button variant="outline" className="group-hover:bg-orange-500 group-hover:text-white transition-colors">
              Entrar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center max-w-lg text-muted-foreground">
        <p>Selecione a unidade de trabalho para acessar as ferramentas de Ordens de Serviço, Pesquisa de Peças e Apontamentos.</p>
      </div>

      <div className="mt-auto py-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default LandingPage;