import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Clock, List, ClipboardList, CalendarDays, Menu, type LucideIcon } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { getParts, getAfsFromService } from '@/services/partListService';
import { useCompany } from '@/context/CompanyContext';
import HomeMenuRow from '@/components/home/HomeMenuRow';

interface HomeItem {
  key: string;
  to: string;
  external?: boolean;
  img: string;
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
}

const CardImage = ({ src, alt }: { src: string, alt: string }) => (
  <div className="flex justify-center mb-4 mt-2">
    <img 
      src={`/icons/tela_inicial/${src}`} 
      alt={alt} 
      className="h-28 w-auto object-contain"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  </div>
);

const Index = () => {
  const { checkPageAccess } = useSession();
  const { company, branding } = useCompany();

  useEffect(() => {
    document.title = `Início - AutoBoard (${branding.name})`;
  }, [branding.name]);

  useEffect(() => {
    const prefetchAllData = async () => {
      try {
        await Promise.all([
          getParts(company),
          getAfsFromService(company)
        ]);
      } catch (error) {
        console.warn("Falha no pré-carregamento de dados em segundo plano.", error);
      }
    };
    prefetchAllData();
  }, [company]);

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');

  const homeItems: HomeItem[] = [
    {
      key: 'orders',
      to: `/${company}/service-orders`,
      img: '12.png',
      icon: ClipboardList,
      title: 'Ordens de Serviço',
      description: 'Visualize e gerencie as ordens de serviço com suas peças associadas.',
      buttonLabel: 'Ir para Ordens',
    },
    {
      key: 'catalog',
      to: `/${company}/custom-menu-view`,
      img: '11.png',
      icon: Menu,
      title: 'Catálogo de Peças',
      description: 'Navegue pelas listas de peças personalizadas em uma estrutura de menu.',
      buttonLabel: 'Ver Catálogo',
    },
    {
      key: 'parts-list',
      to: `/${company}/parts-list`,
      img: '8.png',
      icon: List,
      title: 'Minha Lista de Peças',
      description: 'Gerencie sua lista de peças, adicione novos itens e exporte para PDF.',
      buttonLabel: 'Ir para Lista',
    },
    {
      key: 'schedule',
      to: 'https://escala.eletricarpm.com.br',
      external: true,
      img: '9.png',
      icon: CalendarDays,
      title: 'Escala Anual',
      description: 'Visualize a escala de turnos rotativos para o ano inteiro.',
      buttonLabel: 'Ver Escala',
    },
    ...(canAccessTimeTracking ? [{
      key: 'time-tracking',
      to: `/${company}/time-tracking`,
      img: '10.png',
      icon: Clock,
      title: 'Apontamento de Horas',
      description: 'Registre suas horas de entrada e saída para controle mensal.',
      buttonLabel: 'Fazer Apontamento',
    }] : []),
    ...(canAccessAdmin ? [{
      key: 'admin',
      to: `/${company}/admin`,
      img: '7.png',
      icon: Database,
      title: 'Painel Administração',
      description: 'Acesse as configurações do sistema, gerencie acessos, peças e dados gerais.',
      buttonLabel: 'Acessar Painel',
    }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
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
      <h1 className="mb-4 mt-2 lg:mb-12 lg:mt-8 text-center flex flex-col items-center gap-4">
        <img
          src={branding.logo}
          alt={branding.name}
          className="h-16 lg:h-40 w-auto object-contain opacity-90"
        />
      </h1>

      <nav className="lg:hidden flex flex-col gap-2 w-full max-w-xl" aria-label="Menu inicial" data-testid="home-menu">
        {homeItems.map(item => (
          <HomeMenuRow
            key={item.key}
            to={item.to}
            external={item.external}
            img={item.img}
            icon={item.icon}
            title={item.title}
          />
        ))}
      </nav>

      <div className="hidden lg:grid grid-cols-3 gap-8 w-full max-w-6xl">
        {homeItems.map(item => {
          const Icon = item.icon;
          const button = <Button className="w-full">{item.buttonLabel}</Button>;
          return (
            <Card key={item.key} className="text-center animated-card">
              <div className="card-content-wrapper h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center justify-center gap-2">
                    <Icon className="h-6 w-6" /> {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  <CardImage src={item.img} alt={item.title} />
                  <p className="mb-6 text-muted-foreground flex-1">{item.description}</p>
                  {item.external ? (
                    <a href={item.to} target="_blank" rel="noopener noreferrer">{button}</a>
                  ) : (
                    <Link to={item.to}>{button}</Link>
                  )}
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;
