import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Home, Clock, Search, List, ClipboardList, CalendarDays, Menu } from 'lucide-react';
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

  const CardImage = ({ src, alt }: { src: string, alt: string }) => (
    <div className="flex justify-center mb-4 mt-2">
      <img 
        src={`/icons/tela inicial/${src}`} 
        alt={alt} 
        className="h-28 w-auto object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <style>{`
        .animated-card {
          transition: transform 0.4s ease;
        }
        .animated-card:hover {
          cursor: pointer;
          transform: scale(0.97);
        }
        .animated-card:active {
          transform: scale(0.9);
        }
        .animated-card .card-content-wrapper {
          transition: transform 0.4s ease;
        }
        .animated-card:hover .card-content-wrapper {
          transform: scale(0.96);
        }
      `}</style>
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
        {/* 1. Ordens de Serviço */}
        <Card className="text-center animated-card">
          <div className="card-content-wrapper h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <ClipboardList className="h-6 w-6" /> Ordens de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <CardImage src="ordens de Serviço - 12.png" alt="Ordens de Serviço" />
              <p className="mb-6 text-muted-foreground flex-1">
                Visualize e gerencie as ordens de serviço com suas peças associadas.
              </p>
              <Link to={`/${company}/service-orders`}>
                <Button className="w-full">Ir para Ordens</Button>
              </Link>
            </CardContent>
          </div>
        </Card>

        {/* 2. Pesquisar Peças */}
        <Card className="text-center animated-card">
          <div className="card-content-wrapper h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Search className="h-6 w-6" /> Pesquisar Peças
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <CardImage src="Pesquisar Peças - 6.png" alt="Pesquisar Peças" />
              <p className="mb-6 text-muted-foreground flex-1">
                Encontre rapidamente qualquer peça automotiva por código ou descrição.
              </p>
              <Link to={`/${company}/search-parts`}>
                <Button className="w-full">Ir para Pesquisa</Button>
              </Link>
            </CardContent>
          </div>
        </Card>

        {/* 3. Catálogo de Peças */}
        {canAccessCustomMenu && (
          <Card className="text-center animated-card">
            <div className="card-content-wrapper h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Menu className="h-6 w-6" /> Catálogo de Peças
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <CardImage src="Catalogo de Peças - 11.png" alt="Catálogo de Peças" />
                <p className="mb-6 text-muted-foreground flex-1">
                  Navegue pelas listas de peças personalizadas em uma estrutura de menu.
                </p>
                <Link to={`/${company}/custom-menu-view`}>
                  <Button className="w-full">Ver Catálogo</Button>
                </Link>
              </CardContent>
            </div>
          </Card>
        )}

        {/* 4. Minha Lista de Peças */}
        <Card className="text-center animated-card">
          <div className="card-content-wrapper h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <List className="h-6 w-6" /> Minha Lista de Peças
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <CardImage src="Minha Lista de Peças - 8.png" alt="Minha Lista de Peças" />
              <p className="mb-6 text-muted-foreground flex-1">
                Gerencie sua lista de peças, adicione novos itens e exporte para PDF.
              </p>
              <Link to={`/${company}/parts-list`}>
                <Button className="w-full">Ir para Lista</Button>
              </Link>
            </CardContent>
          </div>
        </Card>
        
        {/* 5. Escala Anual */}
        <Card className="text-center animated-card">
          <div className="card-content-wrapper h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <CalendarDays className="h-6 w-6" /> Escala Anual
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <CardImage src="Escala Anual  - 9.png" alt="Escala Anual" />
              <p className="mb-6 text-muted-foreground flex-1">
                Visualize a escala de turnos rotativos para o ano inteiro.
              </p>
              <a href="https://escala.eletricarpm.com.br" target="_blank" rel="noopener noreferrer">
                <Button className="w-full">Ver Escala</Button>
              </a>
            </CardContent>
          </div>
        </Card>

        {/* 6. Apontamento de Horas */}
        {canAccessTimeTracking && (
          <Card className="text-center animated-card">
            <div className="card-content-wrapper h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Clock className="h-6 w-6" /> Apontamento de Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <CardImage src="Apontamento de horas - 10.png" alt="Apontamento de Horas" />
                <p className="mb-6 text-muted-foreground flex-1">
                  Registre suas horas de entrada e saída para controle mensal.
                </p>
                <Link to={`/${company}/time-tracking`}>
                  <Button className="w-full">Fazer Apontamento</Button>
                </Link>
              </CardContent>
            </div>
          </Card>
        )}

        {/* 7. Painel Administração */}
        {canAccessAdmin && (
          <Card className="text-center animated-card">
            <div className="card-content-wrapper h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Database className="h-6 w-6" /> Painel Administração
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <CardImage src="Painel Administração - 7.png" alt="Painel Administração" />
                <p className="mb-6 text-muted-foreground flex-1">
                  Acesse as configurações do sistema, gerencie acessos, peças e dados gerais.
                </p>
                <Link to={`/${company}/admin`}>
                  <Button className="w-full">Acessar Painel</Button>
                </Link>
              </CardContent>
            </div>
          </Card>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;