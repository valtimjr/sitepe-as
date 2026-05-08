import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Home, Clock, Search, List, ClipboardList, CalendarDays, FileText, Menu } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { getParts, getAfsFromService } from '@/services/partListService';
import { useCompany } from '@/context/CompanyContext';

const Index = () => {
  const { checkPageAccess, session } = useSession();
  const { company, branding } = useCompany();

  useEffect(() => {
    document.title = `Início - AutoBoard (${branding.name})`;
  }, [branding.name]);

  // Efeito para pré-carregar dados em segundo plano
  useEffect(() => {
    const prefetchAllData = async () => {
      try {
        // Inicia o carregamento de peças e AFs em paralelo
        await Promise.all([
          getParts(company),
          getAfsFromService(company)
        ]);
        // console.log("Pré-carregamento de dados em segundo plano concluído.");
      } catch (error) {
        console.warn("Falha no pré-carregamento de dados em segundo plano. Os dados serão carregados sob demanda.", error);
      }
    };

    // Executa a função de pré-carregamento uma vez quando o componente é montado
    prefetchAllData();
  }, [company]); // Roda quando a empresa muda

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');
  // Acesso ao catálogo de menus agora verifica a permissão da rota
  const canAccessCustomMenu = checkPageAccess('/custom-menu-view'); 

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-5xl font-extrabold mb-12 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Home className="h-10 w-10 text-primary" />
          Bem-vindo ao AutoBoard
        </div>
        <img 
          src={branding.logo} 
          alt={branding.name} 
          className="h-40 w-auto object-contain opacity-90" 
        />
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* 1. Ordens de Serviço (MOVido para a primeira posição) */}
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
            <Link to={`/${company}/service-orders`}>
              <Button className="w-full">Ir para Ordens</Button>
            </Link>
          </CardContent>
        </Card>

        {/* 2. Pesquisar Peças */}
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
            <Link to={`/${company}/search-parts`}>
              <Button className="w-full">Ir para Pesquisa</Button>
            </Link>
          </CardContent>
        </Card>

        {/* 3. Catálogo de Peças */}
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
              <Link to={`/${company}/custom-menu-view`}>
                <Button className="w-full">Ver Catálogo</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 4. Minha Lista de Peças */}
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
            <Link to={`/${company}/parts-list`}>
              <Button className="w-full">Ir para Lista</Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* 5. Escala Anual - AGORA ABRE EM NOVA ABA */}
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
            <a href="https://escala.eletricarpm.com.br" target="_blank" rel="noopener noreferrer">
              <Button className="w-full">Ver Escala</Button>
            </a>
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
              <Link to={`/${company}/time-tracking`}>
                <Button className="w-full">Fazer Apontamento</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 7. Painel Administração */}
        {canAccessAdmin && (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Database className="h-6 w-6" /> Painel Administração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Acesse as configurações do sistema, gerencie acessos, peças e dados gerais.
              </p>
              <Link to={`/${company}/admin`}>
                <Button className="w-full">Acessar Painel</Button>
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