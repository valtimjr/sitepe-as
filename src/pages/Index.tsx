import React from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <img src="/logo.png" alt="Logo do Aplicativo" className="h-20 w-20 mb-6 mx-auto" />
      <h1 className="text-5xl font-extrabold mb-12 text-center text-primary dark:text-primary">
        Bem-vindo ao Gerenciador de Peças
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-4xl">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Pesquisar Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Encontre rapidamente qualquer peça automotiva por código ou descrição.
            </p>
            <Link to="/search-parts">
              <Button className="w-full">Ir para Pesquisa</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Minha Lista de Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Gerencie sua lista de peças, adicione novos itens e exporte para PDF.
            </p>
            <Link to="/parts-list">
              <Button className="w-full">Ir para Lista</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Visualize e gerencie as ordens de serviço com suas peças associadas.
            </p>
            <Link to="/service-orders">
              <Button className="w-full">Ir para Ordens</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;