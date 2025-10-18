import React from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      <h1 className="text-5xl font-extrabold mb-12 text-center text-blue-600 dark:text-blue-400">
        Bem-vindo ao Gerenciador de Peças
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Pesquisar Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
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
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Gerencie sua lista de peças, adicione novos itens e exporte para PDF.
            </p>
            <Link to="/parts-list">
              <Button className="w-full">Ir para Lista</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;