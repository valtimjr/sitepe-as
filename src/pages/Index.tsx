import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Home, Clock, Search, List, ClipboardList, CalendarDays, FileText, Menu } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';

const Index = () => {
  const { checkPageAccess, session } = useSession();

  useEffect(() => {
    document.title = "Início - AutoBoard";
  }, []);

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');
  // Acesso ao catálogo de menus é sempre permitido
  const canAccessCustomMenu = true; 

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-5xl font-extrabold mb-12 mt-8 text-center text-primary dark:text-primary flex items-center gap-4">
        <Home className="h-10 w-10 text-primary" />
        Bem-vindo ao AutoBoard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* 1. Pesquisar Peças */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Search className="h-6 w-6" /> Pesquisar Peças
            </CardTitle>
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

        {/* 2. Catálogo de Peças (Movido para a segunda posição) */}
        {canAccessCustomMenu && (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Menu className="h-6 w-6" /> Catálogo de Peças
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Navegue pelas listas de peças personalizadas em uma estrutura de menu.
              </p>
              <Link to="/custom-menu-view">
                <Button className="w-full">Ver Catálogo</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 3. Minha Lista de Peças (Movido para a terceira posição) */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <List className="h-6 w-6" /> Minha Lista de Peças
            </CardTitle>
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

        {/* 4. Ordens de Serviço */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <ClipboardList className="h-6 w-6" /> Ordens de Serviço
            </CardTitle>
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
        
        {/* 5. Escala Anual */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <CalendarDays className="h-6 w-6" /> Escala Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Visualize a escala de turnos rotativos para o ano inteiro.
            </p>
            <Link to="/schedule-view">
              <Button className="w-full">Ver Escala</Button>
            </Link>
          </CardContent>
        </Card>

        {/* 6. Apontamento de Horas */}
        {canAccessTimeTracking && (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Clock className="h-6 w-6" /> Apontamento de Horas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Registre suas horas de entrada e saída para controle mensal.
              </p>
              <Link to="/time-tracking">
                <Button className="w-full">Fazer Apontamento</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 7. Gerenciador de Banco de Dados */}
        {canAccessAdmin && (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Database className="h-6 w-6" /> Gerenciador de Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Adicione, edite e gerencie peças e AFs diretamente no banco de dados.
              </p>
              <Link to="/admin">
                <Button className="w-full">Acessar Gerenciador</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;